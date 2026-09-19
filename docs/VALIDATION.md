# Validation protocol

## Software correctness

Run Python, Node, pure Swift and browser workflow tests from TEST_REPORT.md. Synthetic targets establish that implemented math behaves as expected on controlled inputs. They do not establish performance on actual Pokémon cards.

## Image centering

Build a held-out dataset with known border geometry, camera distortion calibration, perspective variations and manual annotations by multiple operators. Include classic bordered, full-art, textured, holo, asymmetrical and borderless cards. Exclude unsupported designs explicitly rather than silently treating art as a border.

Measure repeated-scan and repeated-operator error. Compare point estimates and claimed bounds with independent ground truth. The current configurable pixel-error interval is a sensitivity assumption only; it is not a calibrated 95% interval and does not incorporate lens/print/curvature errors.

## Physical defects

Use independently measured references and real card samples. Report recall and false positives stratified by lateral size, depth, contrast, finish and location. Distinguish false negatives from unobservable regions. Include scratches, shallow dents, print lines, whitening, coatings and harmless intended textures. Repeat remounting across operators and devices.

Accuracy, resolution, repeatability and uncertainty are different quantities. A repeated wrong measurement is not accurate. A 50x display zoom does not create 50x optical resolution. A synthetic surface reconstruction is not a validated foil-card scan.

## Grading outcomes

Freeze model, calibration and predictions before official outcomes return. Keep all images/resubmissions of the same physical card in the same split. Separate grader/company/era/finish/device cohorts. Have an explicit abstain option and report its frequency.

Publish exact-grade agreement, within-one-grade agreement, class confusion, 9-vs-10 precision/recall, probability calibration and sample counts. Include uncertainty intervals and a prospective held-out cohort. Do not report only easy examples or near-10 cards as full-scale performance.

No such real-card evaluation has been completed in this release. The correct forecast output is currently abstention.

## Data stewardship

Collection for training requires explicit consent and clear rights/provenance for images and labels. Local report export is not consent to upload or train. A handwritten certificate ID is not issuer verification. Hashes identify bytes, not ownership or physical-card identity. Preserve acquisition originals separately from processed analysis copies.
