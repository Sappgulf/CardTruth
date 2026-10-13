# CardTruth

**Local-first trading-card inspection, with evidence you can review and keep.**

Load front and back photographs, confirm the card outline, measure visible border ratios, inspect enlarged corners, and export a portable report. CardTruth 0.2.2 runs as a standalone HTML file, with optional Python tooling and iOS capture source.

**Working inspection prototype. Overall grade prediction is withheld.** CardTruth does not authenticate cards or promise a PSA, CGC, or BGS outcome. Its software tests do not establish real-card grading accuracy.

[First inspection](START_HERE.md) · [Project guide](PROJECT_GUIDE.md) · [Accuracy contract](docs/ACCURACY_CONTRACT.md) · [Contributing](CONTRIBUTING.md)

## Try it locally

1. Download and extract this repository using **Code → Download ZIP**, or clone it.
2. Open **`CardTruth.html`** in a normal desktop browser. No application dependencies, account, or API key are needed.
3. Choose **Try demo** to learn the controls. The demo uses labeled synthetic optical targets, not real cards or a grading-validation dataset.

If your browser or operating system restricts downloaded HTML, run the included macOS or Windows launcher, or use Python's standard-library launcher from the repository folder:

```sh
python launch.py
```

It opens a loopback-only page at `http://127.0.0.1:8765`; photographs stay in the browser. Stop it with Ctrl+C. See the [project guide](PROJECT_GUIDE.md) for another port and optional tooling.

A file-manager or messaging-app preview may not execute the app. For phone support and native-app limitations, read [Start here](START_HERE.md).

## From photograph to report

- **Confirm the geometry.** Adjust the proposed outline with handles, keyboard controls, or numeric coordinates, then confirm the actual card edges.
- **Inspect centering.** Correct perspective and position the inner border guides to calculate left/right and top/bottom ratios. Placement-error ranges are sensitivity bounds, not statistical confidence intervals.
- **Review visible evidence.** Zoom into corners, annotate observations, and add lighting-angle photos. Bright-edge-spot suggestions require human review; artwork and glare can also trigger them.
- **Keep a portable record.** Export and reopen `.ctscan.json` reports containing analysis images, measurements, notes, and user-reported returned grades.

The browser workflow has no image uploads, remote inference, or automatic saving. **Export before closing or reloading, and keep your original photographs separately.** Report images are analysis copies capped at 2200 pixels on the long edge. Checksums check integrity; they do not prove authenticity, ownership, or capture time.

## Know the limits

Centering requires meaningful, correctly selected borders. Full-art, asymmetric, and borderless designs can invalidate the measurement; use **Skip centering** when the boundary is ambiguous. Published PSA/CGC/BGS references are centering-only guidance, including directional rules and uncertain boundary cases.

The nominal 63:88 rectification is not a physical dimension measurement. Zoom cannot reveal detail that the photograph did not capture. No microscopic dent-depth measurement, trained defect classifier, hardware controller, or calibrated grader-outcome model is active in the browser.

## Explore the project

- [Project guide](PROJECT_GUIDE.md): capability details, limitations, Python API/CLI setup, and source map
- [Architecture](docs/ARCHITECTURE.md): browser inspector, Python core, local API, iOS source, and GradeRig research
- [Verification report](docs/TEST_REPORT.md): recorded software checks and remaining accuracy gates
- [Validation plan](docs/VALIDATION.md) and [accuracy contract](docs/ACCURACY_CONTRACT.md): evidence required before making physical-accuracy claims
- [Contributing](CONTRIBUTING.md): development setup and contribution standards

No physical-defect recall or exact-grade agreement percentage has been established. Grader names belong to their owners; CardTruth is independent and not endorsed by them.
