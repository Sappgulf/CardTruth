from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {'.git', '.venv', '.pytest_cache', '__pycache__', '.build', 'build', 'dist', 'DerivedData'}
EXCLUDED_FILES = {'MANIFEST.sha256', '.DS_Store'}


def included(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    return path.is_file() and path.name not in EXCLUDED_FILES and not any(part in EXCLUDED_PARTS for part in rel.parts)


def render() -> str:
    lines = []
    for path in sorted((p for p in ROOT.rglob('*') if included(p)), key=lambda p: p.relative_to(ROOT).as_posix()):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.relative_to(ROOT).as_posix()}")
    return '\n'.join(lines) + '\n'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    target = ROOT / 'MANIFEST.sha256'
    expected = render()
    if args.check:
        current = target.read_text() if target.exists() else ''
        if current != expected:
            raise SystemExit('MANIFEST.sha256 is stale. Run: python tools/update_manifest.py')
        print('MANIFEST.sha256 is current')
    else:
        target.write_text(expected)
        print(f'Updated {target.name} with {expected.count(chr(10))} entries')


if __name__ == '__main__':
    main()
