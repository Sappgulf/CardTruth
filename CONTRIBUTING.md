# Contributing to CardTruth

CardTruth treats **measurement truthfulness as a product feature**. A contribution that makes the UI more impressive by overstating what a sensor, heuristic, or model can establish will not be accepted.

## Development setup

Python 3.11+, Node 22+, and Swift are used by the current test suite.

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
make test
```

Run `make build` after changing anything in `apps/web/`. The generated HTML copies must remain byte-identical.

## Pull-request rules

- Add a regression test before fixing behavior when practical.
- Keep observed, inferred, and unknown evidence distinct.
- Never introduce a grader probability without a documented validation dataset and calibration report.
- Do not label phone-only analysis as authentication, metrology, or certified grading.
- Do not include copyrighted card-image datasets, private API keys, grading certificates, or personal submission records.
- Update `CHANGELOG.md` for user-visible behavior.

## Accuracy work

New measurement or prediction features must document:

1. the sensor/input they rely on;
2. the measurable quantity they claim;
3. the validation reference instrument or ground truth;
4. failure/abstention conditions;
5. held-out performance metrics;
6. known unsupported card finishes or designs.

See `docs/ACCURACY_CONTRACT.md` and `docs/VALIDATION.md`.
