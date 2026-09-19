"""Experimental calibrated Lambertian photometry, not validated card metrology.

Inputs must already be linear-light, aligned, dark/flat-field corrected and
radiometrically normalized. A global Lx3 direction matrix assumes distant lights.
Near-field GradeRig LEDs need spatially varying directions and falloff calibration;
this reference solver must not be used to label foil topography as measured truth.
"""
from __future__ import annotations
import numpy as np

def photometric_stereo(intensities:np.ndarray,light_dirs:np.ndarray,mask:np.ndarray|None=None):
    I=np.asarray(intensities,dtype=np.float64);L=np.asarray(light_dirs,dtype=np.float64)
    if I.ndim!=3 or L.ndim!=2 or L.shape[1]!=3 or I.shape[2]!=L.shape[0] or L.shape[0]<3:
        raise ValueError("Expected HxWxL intensities and at least three Lx3 light vectors")
    if not np.isfinite(I).all() or not np.isfinite(L).all() or (I<0).any():
        raise ValueError("Photometry inputs must be finite and intensities non-negative")
    lengths=np.linalg.norm(L,axis=1,keepdims=True)
    if (lengths<1e-9).any(): raise ValueError("Zero light vector")
    L=L/lengths
    if np.linalg.matrix_rank(L)<3 or np.linalg.cond(L)>1000:
        raise ValueError("Lighting geometry does not constrain the surface normal")
    if mask is not None and np.shape(mask)!=I.shape[:2]:raise ValueError("Mask shape mismatch")
    g=np.einsum("cl,hwl->hwc",np.linalg.pinv(L),I)
    albedo=np.linalg.norm(g,axis=2)
    good=albedo>1e-10
    if mask is not None:good &= np.asarray(mask,dtype=bool)
    normals=np.full_like(g,np.nan)
    normals[good]=g[good]/albedo[good,None]
    pred=np.einsum("lc,hwc->hwl",L,g)
    residual=np.sqrt(np.mean((I-pred)**2,axis=2))
    residual[~good]=np.nan;albedo[~good]=np.nan
    return normals,albedo,residual

def integrate_normals_fft(normals:np.ndarray,eps:float=1e-6)->np.ndarray:
    """Relative height in pixel-step units; never millimeters. Periodic boundary
    conditions can cause edge artifacts. No masked holes or grazing normals allowed.
    An absolute offset cannot be recovered. Metric depth requires external validation.
    """
    n=np.asarray(normals,dtype=np.float64)
    if n.ndim!=3 or n.shape[2]!=3 or min(n.shape[:2])<2 or not np.isfinite(n).all():
        raise ValueError("Expected a complete finite HxWx3 normal field")
    if (n[...,2]<=eps).any():raise ValueError("Normal field contains grazing/back-facing normals")
    p=-n[...,0]/n[...,2];q=-n[...,1]/n[...,2]
    h,w=p.shape;WX,WY=np.meshgrid(2*np.pi*np.fft.fftfreq(w),2*np.pi*np.fft.fftfreq(h))
    denom=WX**2+WY**2;denom[0,0]=1
    Z=(-1j*WX*np.fft.fft2(p)-1j*WY*np.fft.fft2(q))/denom;Z[0,0]=0
    z=np.fft.ifft2(Z).real
    return z-np.median(z)

def detrend_plane(height:np.ndarray,mask:np.ndarray|None=None)->np.ndarray:
    z=np.asarray(height,dtype=np.float64)
    if z.ndim!=2 or not np.isfinite(z).all():raise ValueError("Expected finite 2D height")
    m=np.ones_like(z,dtype=bool) if mask is None else np.asarray(mask,dtype=bool)
    if m.shape!=z.shape or m.sum()<3:raise ValueError("Insufficient valid plane samples")
    yy,xx=np.indices(z.shape);A=np.c_[xx[m],yy[m],np.ones(m.sum())]
    if np.linalg.matrix_rank(A)<3:raise ValueError("Plane samples are collinear")
    coef,*_=np.linalg.lstsq(A,z[m],rcond=None)
    result=z-(coef[0]*xx+coef[1]*yy+coef[2]);result[~m]=np.nan
    return result
