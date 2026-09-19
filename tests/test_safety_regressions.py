import numpy as np
import pytest
from pathlib import Path
from pydantic import ValidationError
from cardtruth_core.models import ConditionVector, CenteringMeasurement
from cardtruth_core.grading import forecast
from cardtruth_core.registration import order_quad, centering_from_border_widths
from cardtruth_core.photometric import photometric_stereo
from tools.update_manifest import included

def sample():
    return ConditionVector.model_validate_json((Path(__file__).parents[1]/"samples/sample_condition.json").read_text())

def test_untrained_forecast_must_abstain():
    f=forecast("psa", sample())
    assert f.withheld, "No calibrated prediction model has been supplied"
    assert f.probabilities == []

@pytest.mark.parametrize("pair", [(80,80),(-1,101),(float("nan"),50),(50,float("inf"))])
def test_centering_rejects_invalid_pairs(pair):
    with pytest.raises(ValidationError):
        CenteringMeasurement(front_lr=pair,front_tb=(50,50),back_lr=(50,50),back_tb=(50,50),confidence=.9)

@pytest.mark.parametrize("values",[(0,0,1,1),(-1,3,1,1),(float("nan"),3,1,1)])
def test_border_math_rejects_invalid_widths(values):
    with pytest.raises(ValueError): centering_from_border_widths(*values)

def test_repeated_quad_points_rejected():
    with pytest.raises(ValueError): order_quad(np.array([[0,0],[0,0],[10,10],[0,10]]))

def test_collinear_quad_rejected():
    with pytest.raises(ValueError): order_quad(np.array([[0,0],[1,1],[2,2],[3,3]]))

def test_rank_deficient_lights_rejected():
    with pytest.raises(ValueError): photometric_stereo(np.ones((5,5,4))*.5, np.tile([0,0,1], (4,1)))

def test_non_finite_photometry_rejected():
    with pytest.raises(ValueError): photometric_stereo(np.full((5,5,3),np.nan),np.eye(3))

def test_unknown_grader_is_whitelisted():
    with pytest.raises(KeyError): forecast("../../not-a-profile",sample())


def test_manifest_ignores_editable_install_metadata():
    egg_info = Path(__file__).parents[1] / "cardtruth.egg-info" / "PKG-INFO"
    assert egg_info.exists(), "editable install fixture should exist in the dev environment"
    assert not included(egg_info)


def test_ci_is_self_contained():
    workflow = (Path(__file__).parents[1] / ".github" / "workflows" / "ci.yml").read_text()
    assert "- uses:" not in workflow
    assert 'git fetch --depth=1 origin "${GITHUB_SHA}"' in workflow
