"""Bounded image decoding and capture-quality heuristics.

Quality checks are intentionally separated from physical accuracy claims. Once a
card outline exists, sharpness/exposure/resolution are evaluated on the card
region instead of the surrounding photograph so a large background cannot hide
a tiny card capture.
"""
from __future__ import annotations
from io import BytesIO
import hashlib
import warnings
import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from .registration import detect_card_quad, order_quad, rectify_card, validate_image

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

def _card_native_short_edge(quad:np.ndarray)->float:
    q=order_quad(quad)
    lengths=[np.linalg.norm(q[(i+1)%4]-q[i]) for i in range(4)]
    return float(min(lengths))

def image_quality(image:np.ndarray,quad:np.ndarray|None=None) -> dict:
    validate_image(image)
    photo_h,photo_w=image.shape[:2]
    measurement_region='full_photo_fallback';coverage_known=False;card_short=None
    region=image
    if quad is not None:
        card_short=_card_native_short_edge(quad)
        region=rectify_card(image,quad,out_h=1200)
        measurement_region='rectified_card_proposal';coverage_known=True
    gray=cv2.cvtColor(region,cv2.COLOR_BGR2GRAY);h,w=gray.shape
    scale=min(1,800/max(h,w));sample=cv2.resize(gray,(max(2,round(w*scale)),max(2,round(h*scale)))) if scale<1 else gray
    lap=float(cv2.Laplacian(sample,cv2.CV_64F).var());mean=float(gray.mean())
    clipped=float(np.mean(np.min(region,axis=2)>=250));shadow=float(np.mean(np.max(region,axis=2)<=5));issues=[]
    if coverage_known:
        if card_short<600:issues.append({'code':'resolution','level':'block' if card_short<350 else 'warning','text':f'Card spans only about {round(card_short)} source pixels on its shortest edge.'})
    else:
        issues.append({'code':'card_coverage_unknown','level':'warning','text':'Card resolution cannot be judged until the outline is known.'})
        if min(photo_h,photo_w)<350:issues.append({'code':'resolution','level':'block','text':'The whole photograph is below the minimum fallback resolution.'})
    if lap<30:issues.append({'code':'sharpness','level':'block' if lap<3 else 'warning','text':'Low image detail; retake if the card itself is not sharply focused.'})
    if mean<20:issues.append({'code':'exposure','level':'block','text':'Card region is too dark for reliable visual inspection.'})
    if clipped>.08:issues.append({'code':'possible_clipping_or_white_print','level':'warning','text':'Bright clipping may hide detail; white printing can also trigger this warning.'})
    if shadow>.20:issues.append({'code':'deep_shadow_fraction','level':'warning','text':'Large near-black regions may hide detail; dark artwork can also trigger this warning.'})
    usable=not any(x['level']=='block' for x in issues)
    return {'usable':usable,'capture_sufficiency_established':bool(coverage_known and usable),'issues':issues,
            'short_edge_px':min(photo_h,photo_w),'photo_short_edge_px':min(photo_h,photo_w),'card_short_edge_px':card_short,
            'measurement_region':measurement_region,'coverage_known':coverage_known,'laplacian_variance':lap,
            'mean_luminance':mean,'clipped_fraction':clipped,'shadow_fraction':shadow,
            'note':'Heuristics on decoded pixels. These are recapture gates, not calibrated defect-detection accuracy.'}

def inspect_image(data:bytes)->dict:
    image,meta=decode_image(data);q=detect_card_quad(image);quality=image_quality(image,quad=q) if q is not None else image_quality(image)
    return {**meta,'quality':quality,'outline_proposal':q.tolist() if q is not None else None,
            'outline_status':'requires_user_confirmation' if q is not None else 'manual_outline_required',
            'coordinate_space':'oriented_analysis_pixels',
            'grade_prediction':{'status':'withheld','probabilities':[],'reason':'No validated grading model installed.'},
            'authenticity':'not_assessed','surface_depth':'not_measured'}
