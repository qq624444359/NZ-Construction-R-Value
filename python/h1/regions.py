"""
Territorial authority to H1 climate zone.

Designers know which council they are consenting to, not which of the six H1
climate zones that council sits in. Asking for the zone number invites a guess,
and a guess lands in the wrong column of Table 2.1.2.7 without anything looking
wrong — so let people name the council and look the zone up.

H1/AS1 Appendix C is the authority. Where a district straddles a zone boundary
the standard's map governs and this table cannot help; the caller should let the
user override the zone in that case.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Dict, List

import yaml

from h1.tables import DATA_DIR, TableError

DATA_FILE = DATA_DIR / "climate_zones.yaml"


@lru_cache(maxsize=1)
def _lookup() -> Dict[str, int]:
    raw = yaml.safe_load(Path(DATA_FILE).read_text(encoding="utf-8"))
    authorities = (raw or {}).get("territorial_authorities")
    if not authorities:
        raise TableError(f"{DATA_FILE} has no territorial_authorities")
    return {str(name).strip().casefold(): int(zone) for name, zone in authorities.items()}


def climate_zone_for(territorial_authority: str) -> int:
    key = (territorial_authority or "").strip().casefold()
    zone = _lookup().get(key)
    if zone is None:
        raise TableError(
            f"{territorial_authority!r} is not a New Zealand territorial authority in the "
            f"H1 climate zone table — pass climate_zone directly, or see /api/h1/territorial-authorities"
        )
    return zone


def territorial_authorities() -> List[str]:
    raw = yaml.safe_load(Path(DATA_FILE).read_text(encoding="utf-8"))
    return sorted(raw["territorial_authorities"])
