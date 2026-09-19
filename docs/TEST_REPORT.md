# Verification report

Run date: September 19, 2026. Build: CardTruth 0.2.1.

## Results

| Check | Observed result |
|---|---|
| Python unit/API suite | 40 passed, 0 failed |
| JavaScript math/imaging/integrity suite | 33 passed, 0 failed |
| Pure Swift capture-flow suite | 8 passed, 0 failed |
| Full browser workflow | Passed in system Chromium with the generated document loaded inline |
| Browser JavaScript errors | 0 observed during the checked journeys |
| External network requests | 0 observed during the checked journeys |
| Desktop layout | Inspected at 1440 x 1050 |
| Mobile layout | Inspected at 390 x 844; no horizontal overflow |
| Installed Python wheel | Built and installed into a separate target; packaged profiles and app served successfully outside the source directory |
| Local launcher | Returned the app over loopback HTTP; private source paths returned 404; no-store header verified |
| Swift platform files | Syntax parsing passed; no iOS SDK compilation performed |
| Real-card grade accuracy | Not evaluated; no trained predictor enabled |
| Physical surface-depth accuracy | Not evaluated; no validated hardware |

The automated unit/API/state-machine total is **81 tests**. The browser workflow is an additional integration check, not 81 independently sampled cards. Unit-test success must never be advertised as grading accuracy.

## Reproduce

From the source root after installing Python dev dependencies:

```sh
pytest -q
node --test tests/web/*.test.mjs
swift test --package-path apps/ios
python tools/build_standalone.py
```

The additional browser journey requires Playwright Python and a Chromium executable. These are test dependencies, not application dependencies:

```sh
python -m pip install playwright
python tests/e2e/browser_journey.py --chromium /path/to/chromium
```

The script stores screenshots and exports outside the project in a temporary directory unless `--output` is supplied. A Playwright-managed Chromium installation can also be used by omitting the executable argument when no system Chromium is found.

To check packaging:

```sh
python -m pip wheel --no-deps --no-build-isolation . --wheel-dir /tmp/cardtruth-wheels
```

Install that wheel into a separate virtual environment or target and import from a directory outside the repository. Verify that profiles and the bundled application are present. The optional API is not used by the standalone browser.

## Browser environment and limits

A Browser plugin was not available. Regular Playwright with system Chromium was used. The managed browser blocked both direct local-file and localhost navigation with ERR_BLOCKED_BY_ADMINISTRATOR. The final integration tests therefore loaded the exact generated HTML through Playwright `page.set_content`; no attempt was made to bypass the navigation policy. The local HTTP launcher was tested separately with Python.

This verifies the document's rendering and interaction code in Chromium. It does **not** establish that every operating system will execute downloaded HTML, that the app works in an iPhone Files preview, that Safari's camera picker behaves identically, or that an iOS app is installed. No public deployment was created.

## Checked journeys

- App identity, meaningful first screen, absence of a framework error screen, console health.
- Synthetic front/back input, outline confirmation, border ratio calculations, visual review.
- An actual JPEG file-input event with synthetic optical contents.
- Numeric border edits update the live ratio; full-art/ambiguous borders can be skipped.
- User annotation survives export and reopening.
- A user-entered CGC Pristine 10 result remains distinct and survives the report round trip.
- Export embeds evidence and generates a canonical integrity checksum; harmless JSON key reordering does not invalidate current-format receipts, while content tampering still fails verification.
- Legacy 0.2.0 report envelopes remain readable after the app-version bump.
- A modified report checksum is rejected without replacing the open inspection.
- Native JavaScript bridge accepts two synthetic camera JPEGs atomically; malformed bundles are rejected.
- Unsupported text-file input leaves the existing inspection intact.
- Additional lighting-angle photo import and rotation.
- A blank image fails the measurement quality gate but can still be retained for notes with unknown centering.
- Mobile layout and core interactions; no external requests during these flows.

All image fixtures were synthetic. Real Pokémon card performance remains unmeasured.

## Visual review

Desktop and mobile screenshots were inspected for (1) readable typography, (2) measurement/control alignment, (3) visible synthetic-data and withheld-grade labeling, (4) contrast and keyboard-focus affordances, (5) annotation/corner-view placement, and (6) mobile wrapping/overflow. No image-generated reference concept or claimed 10/10 fidelity score was used. Temporary screenshots are outside the source package.

## Repository automation

GitHub Actions configuration now runs the Python/web suites on Ubuntu, Swift core tests on macOS, rebuilds generated HTML, checks version consistency, and rejects a stale source manifest. This workflow is committed configuration only until the repository is pushed and GitHub executes it.

## Remaining release gates

Physical iPhone camera behavior, Xcode/iOS SDK compilation, Safari/WKWebView report import/export, memory pressure on actual phones, broad accessibility testing, real-card outline/border validation, calibrated optical surface inspection, and blinded third-party grading evaluation remain outstanding.

## Tested environment

Python 3.13; NumPy 2.3.5; OpenCV 4.13.0; Pydantic 2.13.4; FastAPI 0.128.2; Pillow 12.3.0; pytest 9.0.2; httpx 0.28.1; Node 22.16.0; Swift 6.2.1 on Linux. Dependency ranges in pyproject.toml are compatibility bounds, not a claim that every allowed version was tested.
