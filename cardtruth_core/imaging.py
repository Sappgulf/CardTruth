"""Bounded image decoding and outline proposals. No remote services or disk writes."""
from __future__ import annotations
from io import BytesIO
import hashlib
import warnings
import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from .registration import detect_card_quad

MAX_BYTES=25*1024*1024
MAX_PIXELS=50_000_000
ALLOWED_FORMATS={'JPEG','PNG','WEBP'}

def decode_image(data: bytes) -> tuple[np.ndarray,dict]:
    if not data or len(data)>MAX_BYTES:raise ValueError('Image must contain 1 byte to 25 MB')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                if source.format not in ALLOWED_FORMATS:raise ValueError('Use JPEG, PNG or WebP')
                if getattr(source,'n_frames',1)!=1:raise ValueError('Animated images are not accepted')
                if source.width*source.height>MAX_PIXELS or min(source.size)<32:raise ValueError('Image dimensions must be at least 32 pixels and at most 50 megapixels')
                encoded=source.size
                oriented=ImageOps.exif_transpose(source)
                original=oriented.size
                oriented=oriented.convert('RGBA')
                background=Image.new('RGBA',oriented.size,(22,27,35,255))
                rgb=Image.alpha_composite(background,oriented).convert('RGB')
                rgb.thumbnail((2200,2200),Image.Resampling.LANCZOS)
                pixels=cv2.cvtColor(np.asarray(rgb),cv2.COLOR_RGB2BGR)
                metadata={'encoded_dimensions':list(encoded),'decoded_source_dimensions':list(original),
                          'analysis_dimensions':list(rgb.size),'source_sha256':hashlib.sha256(data).hexdigest(),
                          'exif_orientation_applied':True,'metadata_retained':False}
                return pixels,metadata
    except (UnidentifiedImageError,OSError,Image.DecompressionBombWarning,Image.DecompressionBombError) as exc:
        raise ValueError('Image is corrupt, unsupported or unsafe to decode') from exc

def image_quality(image:np.ndarray) -> dict:
    h,w=image.shape[:2];gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    scale=min(1,800/max(h,w))
    sample=cv2.resize(gray,(max(2,round(w*scale)),max(2,round(h*scale))))
    lap=float(cv2.Laplacian(sample,cv2.CV_64F).var());mean=float(gray.mean())
    clipped=float(np.mean(np.min(image,axis=2)>=250));issues=[]
    if min(h,w)<600:issues.append({'code':'resolution','level':'block' if min(h,w)<350 else 'warning'})
    if lap<30:issues.append({'code':'sharpness','level':'block' if lap<3 else 'warning'})
    if mean<20:issues.append({'code':'exposure','level':'block'})
    if clipped>.08:issues.append({'code':'possible_clipping_or_white_print','level':'warning'})
    return {'usable':not any(x['level']=='block' for x in issues),'issues':issues,'short_edge_px':min(h,w),
            'laplacian_variance':lap,'mean_luminance':mean,'clipped_fraction':clipped,
            'note':'Heuristics on decoded image, not a calibrated accuracy or defect-coverage score.'}

def inspect_image(data:bytes)->dict:
    image,meta=decode_image(data);q=detect_card_quad(image)
    return {**meta,'quality':image_quality(image),'outline_proposal':q.tolist() if q is not None else None,
            'outline_status':'requires_user_confirmation' if q is not None else 'manual_outline_required',
            'coordinate_space':'oriented_analysis_pixels',
            'grade_prediction':{'status':'withheld','probabilities':[],'reason':'No validated grading model installed.'},
            'authenticity':'not_assessed','surface_depth':'not_measured'}
