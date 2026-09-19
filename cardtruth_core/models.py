from __future__ import annotations
from enum import Enum
from math import isfinite
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, validate_assignment=True)

class EvidenceClass(str, Enum):
    OBSERVED = "observed"
    INFERRED = "inferred"
    UNKNOWN = "unknown"
    USER_REPORTED = "user_reported"

class CenteringMeasurement(StrictModel):
    front_lr: tuple[float,float]
    front_tb: tuple[float,float]
    back_lr: tuple[float,float]
    back_tb: tuple[float,float]
    confidence: float | None = Field(default=None, ge=0, le=1, description="Legacy input only; not calibrated by this software")
    sensitivity_pp: float = Field(default=2, ge=0, le=50, description="Fallback percentage-point sensitivity when measured intervals are unavailable; not a confidence interval")
    front_lr_major_interval: tuple[float,float] | None = None
    front_tb_major_interval: tuple[float,float] | None = None
    back_lr_major_interval: tuple[float,float] | None = None
    back_tb_major_interval: tuple[float,float] | None = None

    @field_validator("front_lr","front_tb","back_lr","back_tb")
    @classmethod
    def percentage_pair(cls, v):
        if any(not isfinite(x) or not 0<=x<=100 for x in v) or abs(sum(v)-100)>0.01:
            raise ValueError("Centering must be two finite percentages in [0,100] totaling 100")
        return v

    @field_validator("front_lr_major_interval","front_tb_major_interval","back_lr_major_interval","back_tb_major_interval")
    @classmethod
    def major_interval(cls, v):
        if v is None:return None
        if any(not isfinite(x) or not 50<=x<=100 for x in v) or v[0]>v[1]:
            raise ValueError("Major-side interval must be finite, ordered, and inside [50,100]")
        return v

    def worst_front_major(self): return max(*self.front_lr,*self.front_tb)
    def worst_back_major(self): return max(*self.back_lr,*self.back_tb)
    def _interval(self,pair,measured):
        if measured is not None:return measured
        major=max(pair)
        return (max(50.0,major-self.sensitivity_pp),min(100.0,major+self.sensitivity_pp))
    def front_axis_intervals(self):
        return (self._interval(self.front_lr,self.front_lr_major_interval),self._interval(self.front_tb,self.front_tb_major_interval))
    def back_axis_intervals(self):
        return (self._interval(self.back_lr,self.back_lr_major_interval),self._interval(self.back_tb,self.back_tb_major_interval))

class Defect(StrictModel):
    id: str = Field(min_length=1,max_length=100)
    side: Literal["front","back","edge","corner"]
    kind: Literal["scratch","dent","crease","whitening","chip","rough_cut","print_line","stain","gloss_break","fiber_lift","warp","registration","print_spot","other"]
    severity: float = Field(ge=0,le=1)
    salience: float = Field(ge=0,le=1)
    confidence: float | None = Field(default=None,ge=0,le=1)
    evidence: EvidenceClass
    x: float | None = Field(default=None,ge=0,le=1)
    y: float | None = Field(default=None,ge=0,le=1)
    footprint_mm2: float | None = Field(default=None,ge=0,description="External calibrated measurement only")
    visible_angle_fraction: float | None = Field(default=None,ge=0,le=1)

class AuthenticityScreen(StrictModel):
    status: Literal["no_obvious_flags","review","unknown"] = "unknown"
    confidence: float | None = Field(default=None,ge=0,le=1)
    alteration_flags: list[str] = Field(default_factory=list,max_length=50)

class ConditionVector(StrictModel):
    scan_id: str = Field(min_length=1,max_length=100)
    card_id: str | None = Field(default=None,max_length=200)
    capture_tier: Literal["phone","graderig"]
    capture_confidence: float | None = Field(default=None,ge=0,le=1)
    centering: CenteringMeasurement
    defects: list[Defect] = Field(default_factory=list,max_length=200)
    gloss_uniformity: float | None = Field(default=None,ge=0,le=1)
    warp_peak_to_peak_mm: float | None = Field(default=None,ge=0)
    authenticity: AuthenticityScreen = Field(default_factory=AuthenticityScreen)
    notes: list[str] = Field(default_factory=list,max_length=100)

class GradeProbability(StrictModel):
    grade: str
    probability: float = Field(ge=0,le=1)

class GradeForecast(StrictModel):
    grader: str
    profile_version: str
    withheld: bool = True
    withhold_reason: str
    probabilities: list[GradeProbability] = Field(default_factory=list)
    primary_risks: list[str] = Field(default_factory=list)
    confidence: float | None = None
    model_status: Literal["unvalidated"] = "unvalidated"
    centering_checks: list[dict] = Field(default_factory=list)
