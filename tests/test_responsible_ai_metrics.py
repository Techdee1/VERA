from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"

sys.path.append(str(BACKEND_DIR))

from app.services.responsible_ai_service import _compute_false_positive_rate  # noqa: E402


def test_false_positive_rate_zero_when_no_reviews() -> None:
    assert _compute_false_positive_rate(0, 0) == 0.0


def test_false_positive_rate_ratio() -> None:
    assert _compute_false_positive_rate(2, 5) == 0.4
