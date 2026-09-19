# Verification report

Run date: September 19, 2026. Build: CardTruth 0.2.2.

## Results

| Check | Observed result |
|---|---|
| Python unit/API suite | 49 passed, 0 failed |
| JavaScript math/imaging/integrity/policy suite | 37 passed, 0 failed |
| Pure Swift capture-flow suite | 8 passed, 0 failed |
| Automated suite total | **94 passed, 0 failed** |
| Full browser workflow | Passed with generated CardTruth 0.2.2 document |
| Browser JavaScript errors | 0 observed |
| External network requests | 0 observed |
| Generated HTML consistency | Standalone, API static copy, and iOS resource have the same Git blob |
| Source manifest | Current after rebuild |
| Real-card grade accuracy | Not yet established; outcome prediction remains disabled |
| Physical surface-depth accuracy | Not yet established; GradeRig/photometry remains experimental |

Passing software tests verifies software behavior, not third-party grading accuracy.

## Accuracy regressions added in 0.2.2

- Beckett/BGS directional centering is represented per axis. Gem Mint 9.5 cannot be treated as a simple 55/45-both-directions rule.
- Per-axis measurement intervals can override the generic sensitivity assumption and preserve boundary uncertainty.
- Python capture-quality checks use detected-card pixel coverage instead of allowing a large background to make a tiny card appear sufficiently resolved.
- Photometric stereo accepts a per-pixel observation mask so rejected saturated/specular/shadowed samples do not have to contaminate the least-squares fit.
- Pixels with too few independent valid light directions remain unknown.
- Multi-view defect evidence reports support count/fraction and explicitly does not convert repeated views into statistical confidence.

## Reproduce

From the source root after installing development dependencies:

\`\`\`sh
python -m pytest -q
node --test tests/web/*.test.mjs
cd apps/ios && swift test
cd ../..
python tools/build_standalone.py
python tools/check_consistency.py
python tools/update_manifest.py --check
python tests/e2e/browser_journey.py
\`\`\`

Observed on the verification tree:

- Python: 49 passed.
- Node: 37 passed.
- Swift: 8 passed.
- Release consistency: CardTruth 0.2.2 version declarations and generated HTML consistent.
- Manifest: current.
- Browser journey: demo loaded; centering stage executed; report round trip verified; native JS bridge verified; invalid bundle preserved current inspection; file input, invalid-file handling, border editing, standards reference display, rotation, quality gate and skip-centering flows passed; errors list empty; network list empty.

The locally rebuilt \`CardTruth.html\` produced Git blob \`ef990e5d630a9ca68c96f8641016c6e296798c19\`, exactly matching all three generated copies committed on GitHub.

## Browser journey scope

The browser journey checks the actual generated application, including:

- synthetic front/back evidence,
- outline confirmation and rectification,
- border measurement,
- quality gate and skip-centering behavior,
- report export/reopen integrity,
- user annotations,
- returned-grade record round trip,
- native JavaScript bridge behavior,
- invalid input preservation,
- additional lighting-angle evidence,
- rotation,
- standards display,
- absence of unexpected network traffic.

Fixtures are synthetic. This does not establish performance on real Pokémon cards.

## Remaining accuracy gates

Before enabling a predicted PSA/CGC/BGS grade:

1. validate capture measurements on independently measured physical targets;
2. establish repeated-device/operator error distributions on real cards;
3. validate defect detection by type, size, contrast, finish and location;
4. validate GradeRig surface reconstruction against a reference profilometer or equivalent metrology;
5. collect consented scan-before-submission → returned-grade pairs;
6. freeze models before held-out submissions return;
7. publish exact-grade agreement, within-one-grade agreement, 9-vs-10 precision/recall, probability calibration, abstention rate and sample counts.

Until those gates are met, CardTruth correctly abstains from claimed third-party grade probabilities.

## Tested environment

Python 3.13; pytest 9.x; Node 22.16.0; Swift 6.2.1 on Linux. The browser journey used the available local Chromium/Playwright environment. Dependency ranges in \`pyproject.toml\` are compatibility bounds, not a claim that every allowed version was tested.
