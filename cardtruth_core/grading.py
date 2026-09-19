"""Published centering checks, NOT a trained grader or grade-probability generator."""
from __future__ import annotations
import json
from importlib.resources import files
from .models import CenteringMeasurement, ConditionVector, GradeForecast

SUPPORTED = {"psa", "cgc", "bgs"}

def load_profile(name: str) -> dict:
    key=name.lower()
    if key not in SUPPORTED: raise KeyError(f"Unsupported grader: {name}")
    return json.loads(files("cardtruth_core").joinpath(f"profiles/{key}.json").read_text())

def assess_interval(lo: float, hi: float, threshold: float) -> str:
    if hi <= threshold:return "within_published_guideline"
    if lo > threshold:return "outside_published_guideline"
    return "boundary_uncertain"

def _combine(states):
    if "outside_published_guideline" in states:return "outside_published_guideline"
    if "boundary_uncertain" in states:return "boundary_uncertain"
    return "within_published_guideline"

def _one_axis(intervals,threshold):
    states=[assess_interval(lo,hi,threshold) for lo,hi in intervals]
    if "within_published_guideline" in states:return "within_published_guideline"
    if "boundary_uncertain" in states:return "boundary_uncertain"
    return "outside_published_guideline"

def centering_checks_for_measurement(grader: str, centering: CenteringMeasurement) -> list[dict]:
    p=load_profile(grader);front=centering.front_axis_intervals();back=centering.back_axis_intervals();result=[]
    for rule in p["centering_guidelines"]:
        states=[assess_interval(*iv,rule["front_major_max"]) for iv in front]
        states += [assess_interval(*iv,rule["back_major_max"]) for iv in back]
        if "front_one_axis_major_max" in rule:states.append(_one_axis(front,rule["front_one_axis_major_max"]))
        result.append({"target_label":rule["label"],"status":_combine(states),"scope":"centering_only",
            "front_major_max":rule["front_major_max"],"back_major_max":rule["back_major_max"],
            "front_one_axis_major_max":rule.get("front_one_axis_major_max"),"source":p["source"],"reviewed_at":p["reviewed_at"],
            "verification":p.get("verification","unknown"),"note":rule.get("note",p.get("notes","Published centering reference only."))})
    return result

def centering_checks(grader: str, front_major: float, back_major: float, sensitivity_pp: float=2) -> list[dict]:
    pair=lambda major:(major,100-major)
    c=CenteringMeasurement(front_lr=pair(front_major),front_tb=pair(front_major),back_lr=pair(back_major),back_tb=pair(back_major),sensitivity_pp=sensitivity_pp)
    return centering_checks_for_measurement(grader,c)

def forecast(grader: str, cv: ConditionVector) -> GradeForecast:
    p=load_profile(grader);reasons=["No validated scan-to-submission prediction model is installed. No grade probabilities are generated."]
    if cv.authenticity.status != "no_obvious_flags" or cv.authenticity.alteration_flags:reasons.append("Authenticity/alteration is unverified or requires review.")
    if cv.capture_confidence is None or cv.capture_confidence<.78:reasons.append("Capture sufficiency has not been established.")
    return GradeForecast(grader=p["display_name"],profile_version=p["version"],withheld=True,withhold_reason=" ".join(reasons),confidence=None,
        primary_risks=cv.authenticity.alteration_flags+[f"{d.kind} ({d.side}, {d.evidence.value})" for d in cv.defects],
        centering_checks=centering_checks_for_measurement(grader,cv.centering))
