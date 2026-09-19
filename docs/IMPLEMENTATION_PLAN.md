# CardTruth 0.2 implementation plan

Goal: turn the scaffold into a usable, local-first inspection tool without invented metrology or grading probabilities.

## Scope and architecture
A dependency-free browser application is the primary runnable product. Its image processing, outline editing, border measurement, annotation and report export run locally. Python retains validated schemas, standards checks, an optional local API and experimental photometric utilities. iOS is a capture companion, not a pretend finished LiDAR grader.

## Work and verification
1. Audit the existing 33-file archive; reproduce its three tests and document weaknesses.
2. Write regression tests for fabricated forecast output, invalid geometry, non-finite input and degenerate lighting. Replace arbitrary forecast output with explicit abstention and sourced centering-only checks.
3. Implement browser math and image inspection; test ratios, threshold intervals, homography and image fixtures using Node.
4. Build a responsive upload > outline > border > evidence workflow. Use explicit confirmation and show unsupported/borderless cases. Ship one standalone HTML file with no external requests.
5. Repair the Python API/package and provide installation/launch scripts, strict input limits and portable profiles.
6. Replace iOS camera placeholders with actual JPEG capture, preview, permission handling, review and export. Do not claim device validation on a Linux build host.
7. Test full browser journeys at desktop/mobile sizes, invalid image handling, annotations, report export, reopening and offline launch. Inspect screenshots.
8. Run whole Python and JavaScript test suites, package/install smoke tests, syntax checks and package content verification. Record exact results and all unvalidated claims.

## Scientific limits
The current deliverable measures image geometry with operator confirmation. Border-location sensitivity is an explicitly assumed bound, not a calibrated confidence interval. It does not infer micrometer height from ordinary images or phone depth. Defect suggestions are not confirmed flaws. No third-party grade predictor is validated.
