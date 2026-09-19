"""Optional loopback API. Not a public, authenticated or multi-tenant service."""
from __future__ import annotations
from importlib.resources import files
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import Field, model_validator
from starlette.concurrency import run_in_threadpool
from cardtruth_core import __version__
from cardtruth_core.models import ConditionVector, StrictModel
from cardtruth_core.grading import forecast, load_profile
from cardtruth_core.registration import axis_measurement
from cardtruth_core.imaging import MAX_BYTES, inspect_image

app=FastAPI(title='CardTruth local inspection API',version=__version__,docs_url=None,redoc_url=None)

@app.middleware('http')
async def private_headers(request:Request,call_next):
    try:
        length=int(request.headers.get('content-length','0'))
    except ValueError:
        return JSONResponse({'detail':'Invalid Content-Length'},status_code=400)
    if length>MAX_BYTES:return JSONResponse({'detail':'Request exceeds 25 MB'},status_code=413)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer'
    return response

@app.get('/',response_class=HTMLResponse)
def home():
    return files('services.api').joinpath('static/index.html').read_text()

@app.get('/health')
def health():return {'ok':True,'version':__version__}

@app.get('/v1/capabilities')
def capabilities():
    return {'version':__version__,'grade_prediction':'unvalidated_disabled','lidar':'not_used',
            'authentication':'not_implemented','surface_metrology':'experimental_not_validated',
            'image_inspection':'outline_proposal_and_quality_heuristics',
            'profiles':[load_profile(x) for x in ('psa','cgc','bgs')]}

@app.post('/v1/inspect')
async def inspect(request:Request):
    if request.headers.get('content-type','').split(';')[0] not in {'image/jpeg','image/png','image/webp','application/octet-stream'}:
        raise HTTPException(415,'Send raw JPEG, PNG or WebP bytes with the matching image Content-Type')
    chunks=[];count=0
    async for chunk in request.stream():
        count+=len(chunk)
        if count>MAX_BYTES:raise HTTPException(413,'Image exceeds 25 MB')
        chunks.append(chunk)
    try:return await run_in_threadpool(inspect_image,b''.join(chunks))
    except ValueError as exc:raise HTTPException(422,str(exc)) from exc

class MeasureRequest(StrictModel):
    left:float=Field(gt=0,lt=4096)
    right:float=Field(gt=0,lt=4096)
    top:float=Field(gt=0,lt=4096)
    bottom:float=Field(gt=0,lt=4096)
    image_width:int=Field(ge=32,le=4096)
    image_height:int=Field(ge=32,le=4096)
    confirmed:bool
    error_px:float=Field(default=2,ge=0,le=100)
    @model_validator(mode='after')
    def contained(self):
        if self.left+self.right>=self.image_width or self.top+self.bottom>=self.image_height:
            raise ValueError('Border widths must leave an interior region')
        return self

@app.post('/v1/measure')
def measure(req:MeasureRequest):
    if not req.confirmed:raise HTTPException(409,'User confirmation of outer and inner borders is required')
    return {'scope':'image_centering_only','lr':axis_measurement(req.left,req.right,req.error_px),
            'tb':axis_measurement(req.top,req.bottom,req.error_px),
            'grade_prediction':'withheld','confidence':None,
            'note':'No absolute scale, lens calibration or third-party grade is established.'}

class ForecastRequest(StrictModel):
    condition:ConditionVector
    graders:list[str]=Field(default_factory=lambda:['psa','cgc','bgs'],min_length=1,max_length=3)

@app.post('/v1/forecast')
def grade(req:ForecastRequest):
    try:return {'forecasts':[forecast(g,req.condition) for g in req.graders]}
    except KeyError as exc:raise HTTPException(400,'Unsupported grader; use psa, cgc or bgs') from exc
