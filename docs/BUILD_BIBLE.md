# Product contract and release gates

## Product layers

1. **Capture evidence:** original source hashes, analysis images, operator-confirmed outline and border guides, visual observations, extra-angle images.
2. **Measure image geometry:** ratios, coordinate system, transformation and explicitly assumed sensitivity bounds.
3. **Compare published guidance:** versioned, sourced centering references, with unknown/boundary statuses.
4. **Predict grading outcomes:** inactive until a properly evaluated model exists.
5. **Measure physical surface:** inactive until calibrated hardware and independent reference measurements establish performance.

These layers must not borrow certainty from each other. A repeatable image ratio is not a physical authentication result or a guaranteed final grade.

## Primary workflow

Photo import -> outline confirmation -> inner-border confirmation or explicit skip -> visual evidence review -> other side -> portable report.

Image input is bounded, EXIF orientation is applied by the relevant decode path, transformations do not create optical detail, and geometry needs a human confirmation. A completed capture is not declared merely because a Next button was tapped. The native flow holds a pending photo until review/acceptance.

## Evidence language

- **Measured from image:** numerical calculation on confirmed photo geometry, with scope and assumptions.
- **Inferred:** heuristic visual proposal requiring review.
- **User-reported:** human annotation or a manually entered returned grade.
- **Unknown/not assessed:** insufficient evidence or unimplemented analysis.

Do not label a model-generated defect class as a directly observed physical fact. Reports use no arbitrary 97.2% confidence fields for uncalibrated observations.

## Grade-model release gate

Gather consented raw captures linked to subsequent official outcomes. Keep original image hashes, acquisition settings, device/finish information, operator annotations, grader, relevant dates and independent verification status. A user-entered outcome is not issuer verification.

Group by physical card and connected resubmissions before splitting. Hold out time periods, card families, finishes and devices as appropriate. Freeze predictions before results return. Evaluate calibration, exact grade agreement, within-one-grade agreement, 9/10 discrimination and abstention coverage independently. Do not count repeated images of the same physical card as independent successes.

The first deployment requires a model card recording dataset provenance/consent, evaluated cohorts, calibration method, exclusions, failure modes and rollback rules. Model output must retain measured evidence and never rewrite it. A source-review date is not a grading company's policy-effective date.

## Physical-inspection release gate

Build the optical fixture described in GRADERIG.md, calibrate camera/light geometry and radiometry, and compare measurements with independent surface metrology. State lateral and axial performance separately. Report missing regions, false positives, repeatability and uncertainty by defect size, finish and capture device. Only then expose supported physical units.

## Source and platform boundaries

Browser app: usable local inspection prototype.
Python API/CLI: optional local tooling and experimental reference math.
iOS app source: actual capture integration, pending Xcode and device validation.
GradeRig: design/protocol notes only. No motors, LED controller, BLE driver or hardware is tested.

Do not add consumer-facing hardware controls that merely acknowledge commands or return fabricated measurements.
