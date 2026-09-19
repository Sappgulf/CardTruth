import numpy as np
from cardtruth_core.photometric import photometric_stereo
def test_photometry_can_ignore_a_saturated_observation():
    lights=np.array([[0,0,1],[.35,0,.94],[-.35,0,.94],[0,.35,.94],[0,-.35,.94]],float);lights/=np.linalg.norm(lights,axis=1,keepdims=True);true_n=np.array([0.,0.,1.]);I=np.tile(lights@true_n,(2,2,1));I[0,0,1]=20.;valid=np.ones_like(I,dtype=bool);valid[0,0,1]=False
    normals,_,residual=photometric_stereo(I,lights,valid_observations=valid);np.testing.assert_allclose(normals[0,0],true_n,atol=1e-6);assert residual[0,0]<1e-6
def test_photometry_marks_underconstrained_pixel_unknown():
    lights=np.array([[0,0,1],[.4,0,1],[0,.4,1],[-.4,0,1]],float);I=np.ones((1,1,4),float);valid=np.array([[[True,True,False,False]]]);n,a,r=photometric_stereo(I,lights,valid_observations=valid)
    assert np.isnan(n).all() and np.isnan(a).all() and np.isnan(r).all()
