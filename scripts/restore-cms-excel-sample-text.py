"""Restore explicit text tokens after artifact-tool coerces ISO strings to dates.

Only generated fixture text is changed. Cell types and workbook controls remain
those authored by artifact-tool; input tokens must occur exactly once.
"""
import json, sys, zipfile
from pathlib import Path
from xml.sax.saxutils import escape

path, mapping = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
with zipfile.ZipFile(path) as archive:
    entries = [(info, archive.read(info.filename)) for info in archive.infolist()]
for token, value in mapping.items():
    old, new = token.encode(), escape(value).encode()
    hits = sum(data.count(old) for info, data in entries if info.filename.startswith('xl/') and info.filename.endswith('.xml'))
    if hits != 1:
        raise ValueError(f'Expected exactly one generated text token, got {hits}')
    entries = [(info, data.replace(old, new) if info.filename.startswith('xl/') and info.filename.endswith('.xml') else data) for info, data in entries]
temporary = path.with_suffix('.normalized.xlsx')
with zipfile.ZipFile(temporary, 'w') as archive:
    for info, data in entries:
        archive.writestr(info, data)
temporary.replace(path)
