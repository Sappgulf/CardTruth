from io import BytesIO
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from services.api.main import app
client=TestClient(app)

def photo_bytes(size=(900,1200),fmt='PNG'):
    im=Image.new('RGB',size,(25,35,40));g=ImageDraw.Draw(im)
    g.rectangle((160,170,size[0]-160,size[1]-170),fill=(240,190,50))
    g.rectangle((190,200,size[0]-190,size[1]-200),fill=(40,65,90))
    b=BytesIO();im.save(b,format=fmt);return b.getvalue()

def test_health():assert client.get('/health').status_code==200

def test_actual_app_is_served():
    response=client.get('/')
    assert response.status_code==200
    assert 'Inspect before you submit' in response.text

def test_image_analysis_not_a_grade():
    response=client.post('/v1/inspect',content=photo_bytes(),headers={'Content-Type':'image/png'})
    assert response.status_code==200,response.text
    data=response.json();assert len(data['source_sha256'])==64
    assert data['outline_proposal'] is not None
    assert data['grade_prediction']['status']=='withheld'
    assert data['outline_status']=='requires_user_confirmation'

def test_fake_image_rejected():
    assert client.post('/v1/inspect',content=b'not an image',headers={'Content-Type':'image/png'}).status_code==422

def test_html_upload_rejected():
    assert client.post('/v1/inspect',content=b'<script>hi</script>',headers={'Content-Type':'text/html'}).status_code==415

def test_oversized_body_header_rejected():
    assert client.post('/v1/inspect',content=b'x',headers={'Content-Type':'image/png','Content-Length':str(30*1024*1024)}).status_code==413

def test_centering_endpoint():
    response=client.post('/v1/measure',json={'left':55,'right':45,'top':50,'bottom':50,'image_width':1000,'image_height':1400,'confirmed':True,'error_px':0})
    assert response.status_code==200,response.text
    assert response.json()['lr']['pair']==[55,45]
    assert response.json()['scope']=='image_centering_only'

def test_measurement_needs_confirmation():
    response=client.post('/v1/measure',json={'left':55,'right':45,'top':50,'bottom':50,'image_width':1000,'image_height':1400,'confirmed':False})
    assert response.status_code==409

def test_impossible_borders_rejected():
    response=client.post('/v1/measure',json={'left':55,'right':45,'top':50,'bottom':50,'image_width':60,'image_height':1400,'confirmed':True})
    assert response.status_code==422

def test_negative_measurement_rejected():
    assert client.post('/v1/measure',json={'left':-55,'right':45,'top':50,'bottom':50,'image_width':1000,'image_height':1400,'confirmed':True}).status_code==422

def test_profiles_are_packaged_and_not_fake_models():
    data=client.get('/v1/capabilities').json()
    assert data['grade_prediction']=='unvalidated_disabled'
    assert data['lidar']=='not_used'

def test_no_cache_on_private_responses():
    assert client.get('/health').headers['cache-control']=='no-store'
