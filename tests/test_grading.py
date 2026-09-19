from pathlib import Path
from cardtruth_core.models import ConditionVector
from cardtruth_core.grading import forecast,centering_checks

def sample():return ConditionVector.model_validate_json((Path(__file__).parents[1]/"samples/sample_condition.json").read_text())

def test_unvalidated_model_has_no_probabilities():
    out=forecast("psa",sample())
    assert out.withheld and out.confidence is None and out.probabilities==[]

def test_alteration_flag_withholds():
    cv=sample();cv.authenticity.alteration_flags=["possible_trim"]
    assert forecast("psa",cv).withheld

def test_centering_is_not_full_grade():
    checks=centering_checks("psa",52,60,1)
    assert checks[0]["status"]=="within_published_guideline"
    assert checks[0]["scope"]=="centering_only"

def test_borderline_is_not_a_pass():
    assert centering_checks("psa",55,60,1)[0]["status"]=="boundary_uncertain"

def test_clear_outside():
    assert centering_checks("psa",58,60,1)[0]["status"]=="outside_published_guideline"

def test_bgs_rules_are_present_and_grade_is_still_withheld():
    checks=centering_checks("bgs",50,50,0)
    assert checks
    assert forecast("bgs",sample()).withheld

def test_cgc_tens_remain_distinct():
    labels=[r["target_label"] for r in centering_checks("cgc",50,50)]
    assert labels==["Gem Mint 10","Pristine 10"]
