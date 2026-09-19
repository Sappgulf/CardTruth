# Accuracy Contract

CardTruth's long-term goal is excellent third-party grade forecasting, but **accuracy must be earned with evidence rather than implied by UI precision**.

## Three claim levels

### Observed
A quantity directly measured from accepted input under a documented method. Example: an operator-confirmed border ratio in a rectified image.

### Inferred
A model or heuristic interpretation of observations. Example: a bright edge region proposed for human review.

### Unknown
The available evidence cannot support the claim. CardTruth should abstain rather than substitute a confident-looking number.

## Current validated software claims

The automated suite currently validates software behavior such as geometry constraints, deterministic centering math, report-integrity checks, input rejection, and capture-state transitions. These tests do **not** validate physical defect recall or grading-company agreement.

## Required evidence before publishing physical-accuracy claims

For a defect class, publish performance by physical size/contrast/finish using independently measured reference samples. Report recall, false positives, repeat-scan variance, device/operator variation, and the exact detectable range.

For grader prediction, freeze the model before submission and evaluate on held-out scan-to-return pairs. Report exact-grade agreement, within-one-grade agreement, confusion matrices, calibration error, abstention rate, and a dedicated 9-vs-10 benchmark. Prevent the same physical card from crossing train/test splits.

## Forbidden shortcuts

- Internet slab photos labeled by the slab grade are not enough to establish the original raw-card surface state.
- Phone LiDAR resolution must not be described as microscopic metrology without reference-instrument validation.
- Passing a published centering threshold must not be presented as earning the corresponding overall grade.
- A checksum must not be described as authentication or ownership proof.
