from __future__ import annotations
import cv2
import numpy as np

CARD_ASPECT=63/88 # Rectification convention, NOT a physical-size measurement.

def order_quad(pts: np.ndarray) -> np.ndarray:
    q=np.asarray(pts,dtype=np.float64)
    if q.shape != (4,2) or not np.isfinite(q).all() or len(np.unique(q,axis=0)) != 4:
        raise ValueError("Four distinct finite corner points are required")
    center=q.mean(axis=0)
    q=q[np.argsort(np.arctan2(q[:,1]-center[1],q[:,0]-center[0]))]
    q=np.roll(q,-np.argmin(q.sum(axis=1)),axis=0)
    v=np.roll(q,-1,axis=0)-q
    cross=v[:,0]*np.roll(v,-1,axis=0)[:,1]-v[:,1]*np.roll(v,-1,axis=0)[:,0]
    if not ((cross>1e-6).all() or (cross < -1e-6).all()):
        raise ValueError("The card outline must be strictly convex and non-collinear")
    area=abs(np.dot(q[:,0],np.roll(q[:,1],-1))-np.dot(q[:,1],np.roll(q[:,0],-1)))/2
    if area<1: raise ValueError("Card outline has negligible area")
    return q.astype(np.float32)

def validate_image(image):
    if not isinstance(image,np.ndarray) or image.ndim!=3 or image.shape[2]!=3 or image.dtype!=np.uint8:
        raise ValueError("Expected a non-empty uint8 BGR image")
    if min(image.shape[:2])<16: raise ValueError("Image is too small")

def detect_card_quad(image_bgr: np.ndarray) -> np.ndarray | None:
    """Contour proposal only. User confirmation is required before measurement."""
    validate_image(image_bgr)
    h,w=image_bgr.shape[:2]
    scale=min(1,1200/max(h,w))
    img=cv2.resize(image_bgr,(round(w*scale),round(h*scale))) if scale<1 else image_bgr
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    edge=cv2.Canny(cv2.GaussianBlur(gray,(5,5),0),35,105)
    edge=cv2.morphologyEx(edge,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    contours,_=cv2.findContours(edge,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    candidates=[];total=img.shape[0]*img.shape[1]
    for c in contours:
        area=cv2.contourArea(c)
        if not .06*total<area<.97*total: continue
        p=cv2.approxPolyDP(c,.025*cv2.arcLength(c,True),True)
        if len(p)!=4: continue
        try:q=order_quad(p[:,0,:])
        except ValueError:continue
        widths=[np.linalg.norm(q[1]-q[0]),np.linalg.norm(q[2]-q[3])]
        heights=[np.linalg.norm(q[3]-q[0]),np.linalg.norm(q[2]-q[1])]
        ratio=np.mean(widths)/np.mean(heights)
        if .45<ratio<1.8:
            target=min(abs(np.log(ratio/CARD_ASPECT)),abs(np.log(ratio*CARD_ASPECT)))
            candidates.append((area/(1+target),q/scale))
    return max(candidates,key=lambda t:t[0])[1] if candidates else None

def rectify_card(image_bgr: np.ndarray, quad: np.ndarray, out_h: int=1760) -> np.ndarray:
    validate_image(image_bgr)
    q=order_quad(quad);h,w=image_bgr.shape[:2]
    if (q<0).any() or (q[:,0]>w-1).any() or (q[:,1]>h-1).any(): raise ValueError("Card corners must lie inside the image")
    if not isinstance(out_h,int) or not 32<=out_h<=4096:raise ValueError("Output height must be 32..4096")
    native_h=min(np.linalg.norm(q[3]-q[0]),np.linalg.norm(q[2]-q[1]))
    native_w=min(np.linalg.norm(q[1]-q[0]),np.linalg.norm(q[2]-q[3]))
    oh=int(min(out_h,native_h,native_w/CARD_ASPECT));ow=round(oh*CARD_ASPECT)
    if min(oh,ow)<16: raise ValueError("Card covers too few source pixels")
    dst=np.array([[0,0],[ow-1,0],[ow-1,oh-1],[0,oh-1]],np.float32)
    M=cv2.getPerspectiveTransform(q,dst)
    return cv2.warpPerspective(image_bgr,M,(ow,oh),flags=cv2.INTER_LINEAR)

def centering_from_border_widths(left:float,right:float,top:float,bottom:float):
    values=np.array([left,right,top,bottom],float)
    if not np.isfinite(values).all() or (values<=0).any():raise ValueError("Border widths must be finite and strictly positive")
    def pair(a,b):return (float(100*a/(a+b)),float(100*b/(a+b)))
    return {"lr":pair(left,right),"tb":pair(top,bottom)}

def axis_measurement(a:float,b:float,error_px:float=2) -> dict:
    if not np.isfinite([a,b,error_px]).all() or min(a,b)<=0 or not 0<=error_px<=100:
        raise ValueError("Widths must be positive; assumed error must be 0..100 pixels")
    pct=100*a/(a+b)
    lo=100*max(0,a-error_px)/(max(0,a-error_px)+b+error_px)
    hi=100*(a+error_px)/(a+error_px+max(0,b-error_px))
    return {"pair":[pct,100-pct],"major":max(pct,100-pct),
            "major_interval":[50 if lo<=50<=hi else min(max(lo,100-lo),max(hi,100-hi)),max(hi,100-lo)],
            "assumed_border_width_error_px":error_px,"uncertainty_type":"sensitivity_bound_not_calibrated_CI"}
