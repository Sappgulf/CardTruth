# Architecture

CardTruth is intentionally split into three layers so measurements cannot quietly turn into unsupported grade claims.

```text
Capture / photographs
        |
        v
Evidence + geometry
        |
        v
Condition observations
        |
        +--> published centering references
        |
        +--> future validated prediction models (currently disabled)
```

## Web inspector

`apps/web/` is dependency-free and local-first. It owns photo loading, operator-adjusted geometry, centering calculations, visual review, annotations, and portable report IO. `tools/build_standalone.py` bundles it into three byte-identical generated copies:

- `CardTruth.html`
- `services/api/static/index.html`
- `apps/ios/CardTruth/Resources/CardTruth.html`

## Python core

`cardtruth_core/` provides strict schemas, image-quality/outline helpers, centering reference checks, and experimental photometric-stereo utilities. The grading module deliberately abstains from overall grade prediction because no calibrated outcome model ships with the repository.

## Local API

`services/api/` exposes the same conservative inspection primitives for trusted loopback use. It disables API docs, sends no-store/security headers, caps request sizes, and does not pretend to be an authenticated hosted service.

## iOS

`apps/ios/` separates capture state from the embedded inspector. The independently testable `CardTruthCore` package owns the front/back review state machine. AVFoundation capture source is present, but full Xcode/device validation remains a release gate.

## GradeRig research

`firmware/graderig/` and the photometric code are research scaffolding. No browser result currently claims calibrated surface depth. GradeRig only becomes a product measurement source after reference-instrument validation defined in `docs/VALIDATION.md`.
