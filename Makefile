.PHONY: test test-python test-web test-swift build check serve

test: test-python test-web test-swift

test-python:
	python -m pytest -q

test-web:
	node --test tests/web/*.test.mjs

test-swift:
	cd apps/ios && swift test

build:
	python tools/build_standalone.py

check: test build
	python tools/check_consistency.py
	git diff --exit-code -- CardTruth.html services/api/static/index.html apps/ios/CardTruth/Resources/CardTruth.html

serve:
	python launch.py
