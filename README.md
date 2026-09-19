# CardTruth 0.2.2

A local-first card inspection app. Load front/back photographs, confirm the card outline, measure visible border ratios, inspect enlarged corners, annotate evidence, and save a portable, checksummed report. Canonical report hashing keeps integrity checks stable across harmless JSON key reordering.

**This is a working inspection prototype, not a validated card grader.** It does not promise a PSA/CGC/BGS outcome, authenticate cards, measure microscopic dent depth, or operate GradeRig hardware. The previous heuristic grade probabilities have been removed rather than represented as accuracy.

## Start here

Open **CardTruth.html** in a normal desktop browser. It is a single bundled file with no application dependencies, accounts, API keys, tracking, remote inference or image uploads. Browser/OS security policies may restrict running downloaded HTML. A file preview inside a messaging app or iPhone Files is not the same as a browser session.

The ZIP also includes **Start-CardTruth.command** for macOS and **Start-CardTruth.bat** for Windows. They try a local Python launcher and fall back to opening the HTML. Alternatively, from this folder run:

```sh
python launch.py
```

The launcher uses only Python's standard library, binds to 127.0.0.1, serves the app, and never receives the photographs. Stop it with Ctrl+C. A different free port can be selected with `python launch.py --port 8766`.

**Choose “Try demo” first.** It creates clearly labeled synthetic optical test targets. These are not real Pokémon cards or a card-grading validation dataset.

Read [START_HERE.md](START_HERE.md) for the inspection workflow and phone options.

## What works

| Capability | Current implementation |
|---|---|
| Photo input | Front/back import; browser camera-file input where supported; rotation; original-file SHA-256 |
| Outline | Image-derived proposal, editable handles, keyboard/numeric adjustment, explicit confirmation |
| Centering | Perspective correction, editable inner border guides, left/right and top/bottom ratios |
| Uncertainty | Sensitivity range for an explicitly assumed border-width placement error; not a confidence interval |
| Evidence | Enlarged corner views, image zoom, user-marked observations, extra lighting-angle photos |
| Review assistance | Conservative bright-edge-spot proposals; these can be artwork, glare or defects |
| Standards | Sourced PSA/CGC/BGS centering references; directional rules are preserved and boundary cases remain uncertain |
| Reports | Export/reopen .ctscan.json with embedded analysis images, notes, returned-grade records, canonical integrity checks, and legacy 0.2.0 compatibility |
| Privacy | Browser analysis is in memory. No automatic saving or training. Export before closing. |
| iOS source | Real AVFoundation JPEG capture, review/retake state machine, bundled inspector, share-sheet bridge; not SDK/device validated |
| Python | Optional local inspection API, CLI, strict schemas, packaged profiles, experimental photometry utilities |

## Deliberate limits

- Overall grade prediction is **withheld**. No trained/calibrated outcome model is shipped.
- Centering depends on correct outer and inner border selection. Full-art, asymmetric or borderless designs can invalidate ordinary border measurements. Use “Skip centering” instead of inventing an art boundary.
- The 63:88 rectification aspect is nominal, not a measurement of card dimensions. It cannot establish trimming or physical authenticity.
- Bright-spot suggestions are not confirmed damage. No suggestions does not mean no defects.
- Display zoom does not create optical detail. Analysis copies are capped at 2200 pixels on the long edge; keep original images separately.
- No LiDAR, absolute surface-height map, automatic card identity, trained defect classifier, issuer certificate verification, hardware controller or grader outcome model is active in the browser.
- BGS centering references are embedded from Beckett-published criteria, including the directional 9.5 rule. They remain centering-only guidance, not a full-grade prediction.

## Optional Python API and CLI

Python 3.11+ is required for this optional path, not for the standalone HTML.

```sh
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\Scripts\activate
python -m pip install -e ".[dev]"
python -m pytest -q
python -m cardtruth_core.cli inspect your-card.jpg
python -m cardtruth_core.cli grade samples/sample_condition.json
uvicorn services.api.main:app --host 127.0.0.1 --port 8000
```

The `grade` compatibility command returns abstention plus applicable centering references, not invented probabilities. The optional API is for trusted local use, not public hosting. The standalone app does not call it.

## Source map

- `apps/web`: dependency-free interface, imaging math, IO, synthetic fixtures.
- `cardtruth_core`: validated models, image inspection, published-rule references, research photometry.
- `services/api`: optional FastAPI service and packaged app.
- `apps/ios`: capture app source and independently testable Swift state machine.
- `tests`: Python, JavaScript and reproducible browser checks.
- `docs`: audit, measured test results, optics limits and release gates.
- `firmware/graderig`: future protocol design only, not executable hardware firmware.

Rebuild the standalone file and both embedded copies with `python tools/build_standalone.py`.

## Validation status

See [docs/TEST_REPORT.md](docs/TEST_REPORT.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and the [accuracy contract](docs/ACCURACY_CONTRACT.md). Software tests verify calculations, boundaries and workflows, not real-card accuracy. No percentage of physical defect recall or exact-grade agreement has been established. No proprietary card images or model weights are included. Grader names belong to their owners; this project is independent and not endorsed by them.
