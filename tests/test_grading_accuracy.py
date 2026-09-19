import pytest
from cardtruth_core.models import CenteringMeasurement
from cardtruth_core.grading import centering_checks_for_measurement
def status(checks,label):return next(x['status'] for x in checks if x['target_label']==label)
def test_bgs_95_requires_one_front_axis_at_50_50():
    c=CenteringMeasurement(front_lr=(55,45),front_tb=(55,45),back_lr=(60,40),back_tb=(60,40),sensitivity_pp=0);checks=centering_checks_for_measurement('bgs',c)
    assert status(checks,'Gem Mint 9.5')=='outside_published_guideline';assert status(checks,'Mint 9')=='within_published_guideline'
def test_bgs_95_accepts_50_50_one_way_and_55_45_other_when_exact():
    c=CenteringMeasurement(front_lr=(50,50),front_tb=(55,45),back_lr=(60,40),back_tb=(58,42),sensitivity_pp=0)
    assert status(centering_checks_for_measurement('bgs',c),'Gem Mint 9.5')=='within_published_guideline'
def test_measured_axis_interval_overrides_generic_sensitivity():
    c=CenteringMeasurement(front_lr=(55,45),front_tb=(50,50),back_lr=(60,40),back_tb=(50,50),sensitivity_pp=0,front_lr_major_interval=(54.7,55.3),front_tb_major_interval=(50,50),back_lr_major_interval=(59.8,60.2),back_tb_major_interval=(50,50))
    assert status(centering_checks_for_measurement('psa',c),'Gem Mint 10')=='boundary_uncertain'
def test_invalid_major_interval_is_rejected():
    with pytest.raises(ValueError,match='Major-side interval'):CenteringMeasurement(front_lr=(50,50),front_tb=(50,50),back_lr=(50,50),back_tb=(50,50),front_lr_major_interval=(60,55))
