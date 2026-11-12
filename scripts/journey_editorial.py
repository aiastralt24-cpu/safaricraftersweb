"""Apply reviewed website corrections after importing the supplied Word copy.

Review content/journey-editorial-corrections.json when replacing source documents;
these explicit editorial decisions intentionally supersede the original imports.
"""
import json
from pathlib import Path


def apply_editorial_corrections(record):
    path = Path(__file__).resolve().parents[1] / 'content/journey-editorial-corrections.json'
    corrections = json.loads(path.read_text()).get(record['slug'], {})
    record.update(corrections)
