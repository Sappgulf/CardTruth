"""Research-only anomaly functions. None is a validated defect classifier."""
import cv2
import numpy as np

def dent_candidates(height:np.ndarray,threshold:float,*,calibration_id:str)->np.ndarray:
    z=np.asarray(height,dtype=np.float32)
    if z.ndim!=2 or not np.isfinite(z).all() or not np.isfinite(threshold) or threshold<=0 or not calibration_id.strip():
        raise ValueError("Finite 2D data, positive threshold and calibration identifier required")
    local=z-cv2.GaussianBlur(z,(0,0),sigmaX=8)
    return (local < -threshold).astype(np.uint8)

def gloss_break_score(images:np.ndarray)->np.ndarray:
    I=np.asarray(images,dtype=np.float32)
    if I.ndim!=3 or I.shape[2]<2 or not np.isfinite(I).all():raise ValueError("Expected finite HxWxL, L>=2")
    return np.std(I,axis=2)

def visibility_fraction(binary_evidence_stack:np.ndarray)->np.ndarray:
    x=np.asarray(binary_evidence_stack)
    if x.ndim!=3 or x.shape[2]==0 or not np.isin(x,[0,1]).all():raise ValueError("Expected non-empty binary HxWxL")
    return x.astype(bool).mean(axis=2)

def multiview_support(binary_evidence_stack:np.ndarray)->dict:
    """Counts repeated-view support without treating views as independent random trials."""
    x=np.asarray(binary_evidence_stack)
    if x.ndim!=3 or x.shape[2]==0 or not np.isin(x,[0,1]).all():raise ValueError("Expected non-empty binary HxWxL")
    count=x.astype(np.uint16).sum(axis=2)
    return {"support_count":count,"support_fraction":count/x.shape[2],"view_count":int(x.shape[2]),
            "interpretation":"deterministic_view_support_not_statistical_confidence"}
