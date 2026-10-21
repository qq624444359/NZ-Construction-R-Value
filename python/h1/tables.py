"""
Loader for the H1/AS1 reference data.

The numbers are data, not code (see `data/h1_as1_6th.yaml` for why). This module
turns one of those YAML files into a frozen `Tables` and rejects anything
structurally wrong up front, so `engine.py` can index without guarding.

A table whose `verified` flag is false still produces verdicts — its numbers are
transcribed from the published standard, not invented — but the engine marks
every result `provisional` so the calculator can say so. What must never happen
is a *silently* unchecked answer.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import yaml

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_TABLE = "h1_as1_6th"

# The proposed building's envelope, as Equation 2.1 breaks it down. Floors are
# split because Table 2.1.2.7 gives slab-on-ground and other floors different
# reference R-values, even though Equation 2.1 treats both as `Afloor / Rfloor`.
ELEMENT_TYPES = (
    "roof",
    "wall",
    "slab_on_ground_floor",
    "other_floor",
    "glazing",
    "opaque_door",
    "skylight",
)

# Paragraph 2.1.2.13 names a default for "windows and glazing in doors" but not
# for skylights. Skylights take the glazing default here: it is the lower of the
# two, so the assumption costs the applicant heat loss rather than granting it.
GLAZED_TYPES = ("glazing", "skylight")

# Gross wall area, per the definition in the standard.
GROSS_WALL_TYPES = ("wall", "glazing", "opaque_door")

REFERENCE_TERMS = ("roof_and_skylight", "wall", "slab_on_ground", "other_floor", "glazing")

# Table 2.1.2.12 keys the heated minimums by ceiling / wall / floor.
HEATED_GROUPS = {
    "roof": "roof",
    "wall": "wall",
    "slab_on_ground_floor": "floor",
    "other_floor": "floor",
}


class TableError(ValueError):
    """The table file is missing, malformed, or contradicts the engine's assumptions."""


@dataclass(frozen=True)
class Tables:
    edition: str
    verified: bool
    source: str
    zones: tuple
    reference_r: Dict[str, Dict[int, float]]
    wall_fraction: float
    glazing_fraction: float
    max_wall_glazing_fraction: float
    minimum_r: Dict[str, float]
    heated_minimum_r: Dict[str, Dict[int, float]]
    default_r: Dict[str, float]
    minimum_wall_framing_fraction: float

    def reference_r_value(self, term: str, zone: int) -> float:
        return self.reference_r[term][zone]

    def heated_minimum(self, element_type: str, zone: int) -> Optional[float]:
        group = HEATED_GROUPS.get(element_type)
        if group is None:
            return None
        return self.heated_minimum_r.get(group, {}).get(zone)

    def default_r_value(self, element_type: str) -> float:
        return self.default_r["glazing" if element_type in GLAZED_TYPES else "opaque"]


def load(name: str = DEFAULT_TABLE) -> Tables:
    path = DATA_DIR / f"{name}.yaml"
    if not path.exists():
        raise TableError(f"No H1 table named {name!r} in {DATA_DIR}")
    return parse(yaml.safe_load(path.read_text(encoding="utf-8")), source_name=name)


def parse(raw: dict, source_name: str = "<dict>") -> Tables:
    if not isinstance(raw, dict):
        raise TableError(f"{source_name}: table must be a mapping")

    zones = raw.get("climate_zones")
    if not zones or not all(isinstance(z, int) for z in zones):
        raise TableError(f"{source_name}: climate_zones must be a non-empty list of ints")

    reference_r = {}
    for term in REFERENCE_TERMS:
        by_zone = (raw.get("reference_r_values") or {}).get(term)
        if not isinstance(by_zone, dict):
            raise TableError(f"{source_name}: reference_r_values.{term} is missing")
        missing = [z for z in zones if z not in by_zone]
        if missing:
            raise TableError(
                f"{source_name}: reference_r_values.{term} has no value for zone(s) {missing} — "
                f"every zone needs one or the reference building cannot be built"
            )
        for zone, value in by_zone.items():
            _require_positive(value, f"{source_name}: reference_r_values.{term}[{zone}]")
        reference_r[term] = {int(z): float(v) for z, v in by_zone.items()}

    split = raw.get("reference_wall_split") or {}
    wall_fraction = split.get("wall_fraction")
    glazing_fraction = split.get("glazing_fraction")
    for value, name in ((wall_fraction, "wall_fraction"), (glazing_fraction, "glazing_fraction")):
        _require_fraction(value, f"{source_name}: reference_wall_split.{name}")
    if abs(wall_fraction + glazing_fraction - 1.0) > 1e-9:
        raise TableError(
            f"{source_name}: reference_wall_split must sum to 1.0, got "
            f"{wall_fraction} + {glazing_fraction}"
        )

    max_glazing = raw.get("max_wall_glazing_fraction")
    _require_fraction(max_glazing, f"{source_name}: max_wall_glazing_fraction")

    minimum_r = {}
    for element_type, value in (raw.get("minimum_r_values") or {}).items():
        if element_type not in ELEMENT_TYPES:
            raise TableError(f"{source_name}: minimum_r_values has unknown element type {element_type!r}")
        _require_positive(value, f"{source_name}: minimum_r_values.{element_type}")
        minimum_r[element_type] = float(value)

    heated_minimum_r = {}
    for group, by_zone in (raw.get("heated_minimum_r_values") or {}).items():
        if group not in set(HEATED_GROUPS.values()):
            raise TableError(f"{source_name}: heated_minimum_r_values has unknown group {group!r}")
        if not isinstance(by_zone, dict):
            raise TableError(f"{source_name}: heated_minimum_r_values.{group} must be a mapping")
        for zone, value in by_zone.items():
            _require_positive(value, f"{source_name}: heated_minimum_r_values.{group}[{zone}]")
        heated_minimum_r[group] = {int(z): float(v) for z, v in by_zone.items()}

    default_r = raw.get("default_r_values") or {}
    for key in ("opaque", "glazing"):
        _require_positive(default_r.get(key), f"{source_name}: default_r_values.{key}")

    framing = raw.get("minimum_wall_framing_fraction")
    _require_fraction(framing, f"{source_name}: minimum_wall_framing_fraction")

    return Tables(
        edition=raw.get("edition") or "unknown",
        verified=bool(raw.get("verified")),
        source=raw.get("source") or "",
        zones=tuple(zones),
        reference_r=reference_r,
        wall_fraction=float(wall_fraction),
        glazing_fraction=float(glazing_fraction),
        max_wall_glazing_fraction=float(max_glazing),
        minimum_r=minimum_r,
        heated_minimum_r=heated_minimum_r,
        default_r={k: float(v) for k, v in default_r.items()},
        minimum_wall_framing_fraction=float(framing),
    )


def _require_positive(value, what: str) -> None:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
        raise TableError(f"{what} must be a positive number, got {value!r}")


def _require_fraction(value, what: str) -> None:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 < value <= 1:
        raise TableError(f"{what} must be between 0 and 1, got {value!r}")
