# Audit and repairs: 0.1 to 0.2

Audit date: September 19, 2026. Input: the actual uploaded cardtruth-scaffold-v0.1.zip. Its 33 files and three existing Python tests were inspected. Those tests passed when run; that was not evidence of physical accuracy or a completed scanner.

| Finding | Repair |
|---|---|
| Hand-selected defect weights and Gaussian grade probabilities had no calibrated dataset. | Removed production probability output. Forecast API abstains and shows centering-only reference checks. |
| Centering accepted invalid sums, non-finite values and physically impossible input. | Finite/bounded schemas, pair-sum checks, nonzero border validation and contained-region validation. |
| A probability test used a permissive `or` that could pass without normalization. | Replaced with direct abstention, uncertainty, authenticity and profile behavior assertions. |
| CGC Pristine and Gem Mint labels were collapsed, with incomplete lower-grade rules. | Distinct sourced top-grade reference labels; no guessed lower-grade policy table. |
| BGS weights/subgrade behavior were not validated against the published algorithm. | Numeric BGS checks disabled when the official reference could not be verified. |
| Four-corner ordering could repeat a vertex; warped images were implicitly upscaled. | Convex/distinct geometry checks, stable ordering, source-limited rectification and homography tests. |
| Photometric solver accepted degenerate lighting and made invalid regions look flat. | Rank/conditioning/finite checks; unobservable regions become NaN. |
| Relative height was too easily interpreted as millimeters or true dent geometry. | Explicit relative units, no UI depth report, calibration requirement for metric helper inputs. |
| Scene LiDAR and phone photos were described as validated microscopic metrology. | Removed those active-product claims. Native capture does not collect or grade LiDAR data. |
| iOS capture UI used placeholder preview/advance behavior; GradeRig start state was wrong. | Actual camera source, front/back capture-review-retake state machine and bundled inspector bridge. Unbuilt hardware flow removed from active app. |
| External YAML profiles could be omitted from installed packages. | Profiles moved into package resources and wheel installation checked separately. |
| No simple usable end-to-end interface existed. | Single-file browser inspector plus portable report, real image processing and local launchers. |
| Bare pytest discovery depended on installation/path side effects. | Explicit project-root test path configuration; both bare pytest and python -m pytest verified. |

## What the software does not fix merely by existing

No reference profilometer measurements, real-card label dataset, blinded submissions, camera calibration or foil reconstruction validation was supplied. Consequently no physical detection threshold, defect recall, grade agreement or authentication performance is claimed. The shipped model is intentionally not given a persuasive but unearned “accuracy” percentage.

## Remaining risks

Outline and border proposals are heuristics and may lock onto printed rectangles, sleeves, foil edges or complex backgrounds. Operator confirmation can also be wrong. Shadows, clipping, lens distortion, JPEG processing, card curvature and asymmetric art can affect apparent border ratios. Sensitivity intervals currently cover an assumed guide-placement error only, not every optical/systematic error.

The API is a trusted loopback development service, not hardened multi-tenant hosting. Native platform APIs were syntax-reviewed, not compiled against an Apple SDK. A real iPhone run, Safari run and real-card evaluation are release gates, not boxes marked complete.
