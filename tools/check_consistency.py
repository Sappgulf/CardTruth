from __future__ import annotations

import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    project = tomllib.loads((ROOT / "pyproject.toml").read_text())
    package_version = re.search(r'__version__\s*=\s*"([^"]+)"', (ROOT / "cardtruth_core/__init__.py").read_text())
    web_version = re.search(r"export const VERSION = '([^']+)'", (ROOT / "apps/web/core.js").read_text())
    if not package_version or not web_version:
        raise SystemExit("Could not locate version declarations")
    versions = {
        "pyproject": project["project"]["version"],
        "python": package_version.group(1),
        "web": web_version.group(1),
    }
    if len(set(versions.values())) != 1:
        raise SystemExit(f"Version mismatch: {versions}")

    standalone = (ROOT / "CardTruth.html").read_text()
    api_static = (ROOT / "services/api/static/index.html").read_text()
    ios_static = (ROOT / "apps/ios/CardTruth/Resources/CardTruth.html").read_text()
    if not (standalone == api_static == ios_static):
        raise SystemExit("Generated standalone HTML copies differ; run python tools/build_standalone.py")

    version = versions["python"]
    if f"const VERSION = '{version}';" not in standalone:
        raise SystemExit("Generated standalone HTML does not contain the release version")
    print(f"CardTruth {version}: version declarations and generated HTML are consistent")


if __name__ == "__main__":
    main()
