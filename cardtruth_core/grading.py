"""Published centering checks, NOT a trained grader or grade-probability generator."""
from __future__ import annotations
import json
from importlib.resources import files
from .models import ConditionVector, GradeForecast

SUPPORTED = {"psa", "cgc", "bgs"}

def load_profile(name: str) -> dict:
    key=name.lower()
    if key not in SUPPORTED: raise KeyError(f"Unsupported grader: {name}")
    return json.loads(files("cardtruth_core").joinpath(f"profiles/{key}.json").read_text())

def assess_interval(lo: float, hi: float, threshold: float) -> str:
    if hi <= threshold: return "within_published_guideline"
    if lo > threshold: return "outside_published_guideline"
    return "boundary_uncertain"

def centering_checks(grader: str, front_major: float, back_major: float, sensitivity_pp: float=2) -> list[dict]:
    p=load_profile(grader)
    result=[]
    for rule in p["centering_guidelines"]:
        states=[]
        for v,limit in [(front_major,rule["front_major_max"]),(back_major,rule["back_major_max"])]:
            states.append(assess_interval(max(50,v-sensitivity_pp),min(100,v+sensitivity_pp),limit))
        state=("outside_published_guideline" if "outside_published_guideline" in states else
               "boundary_uncertain" if "boundary_uncertain" in states else "within_published_guideline")
        result.append({"target_label":rule["label"],"status":state,"scope":"centering_only",
                       "front_major_max":rule["front_major_max"],"back_major_max":rule["back_major_max"],
                       "source":p["source"],"reviewed_at":p["reviewed_at"],
                       "note":"Approximate published guideline. Other criteria and grader discretion still apply."})
    return result

def forecast(grader: str, cv: ConditionVector) -> GradeForecast:
    p=load_profile(grader)
    reasons=["No validated scan-to-submission prediction model is installed. No grade probabilities are generated."]
    if cv.authenticity.status != "no_obvious_flags" or cv.authenticity.alteration_flags:
        reasons.append("Authenticity/alteration is unverified or requires review.")
    if cv.capture_confidence is None or cv.capture_confidence<.78:
        reasons.append("Capture sufficiency has not been established.")
    return GradeForecast(grader=p["display_name"],profile_version=p["version"],withheld=True,
        withhold_reason=" ".join(reasons),confidence=None,
        primary_risks=cv.authenticity.alteration_flags+[f"{d.kind} ({d.side}, {d.evidence.value})" for d in cv.defects],
        centering_checks=centering_checks(grader,cv.centering.worst_front_major(),cv.centering.worst_back_major(),cv.centering.sensitivity_pp))
