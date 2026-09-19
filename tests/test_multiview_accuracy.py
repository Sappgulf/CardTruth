import numpy as np
from cardtruth_core.defects import multiview_support
def test_multiview_support_reports_count_fraction_without_inventing_confidence():
    out=multiview_support(np.array([[[1,0,1,1]],[[0,0,1,0]]],dtype=np.uint8));np.testing.assert_array_equal(out['support_count'],np.array([[3],[1]]));np.testing.assert_allclose(out['support_fraction'],np.array([[.75],[.25]]));assert out['view_count']==4;assert out['interpretation']=='deterministic_view_support_not_statistical_confidence'
