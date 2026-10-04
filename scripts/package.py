#!/usr/bin/env python3
"""Create a static web-hosting ZIP using only the Python standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
files = [ROOT/'index.html', ROOT/'.nojekyll']
for directory in ('css', 'js', 'fonts', 'img', 'docs'):
    files.extend(sorted(p for p in (ROOT/directory).rglob('*') if p.is_file() and not p.name.startswith('.')))
output = ROOT/'dist'
output.mkdir(exist_ok=True)
destination = output/'Lied-Cybertober-2026-web.zip'
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(ROOT).as_posix())
print(destination)
