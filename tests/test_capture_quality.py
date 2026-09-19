import numpy as np
from cardtruth_core.imaging import image_quality
def test_image_quality_measures_card_region_not_full_photo():
    image=np.full((2000,2000,3),25,np.uint8);image[850:1150,900:1100]=(90,140,210);quad=np.array([[900,850],[1099,850],[1099,1149],[900,1149]],np.float32);q=image_quality(image,quad=quad)
    assert q['measurement_region']=='rectified_card_proposal';assert 190<=q['card_short_edge_px']<=205;assert any(i['code']=='resolution' and i['level']=='block' for i in q['issues'])
def test_quality_without_outline_marks_card_coverage_unknown():
    q=image_quality(np.full((900,700,3),100,np.uint8));assert q['measurement_region']=='full_photo_fallback';assert q['card_short_edge_px'] is None;assert q['coverage_known'] is False
