"""
The construction options the optimiser is allowed to choose from.

This is the search space, and it is also the part nobody else has. The free
NZGBC and BRANZ tools and Design Navigator all know construction R-values; none
of them know what a build-up costs to install, and without a cost there is
nothing to rank one compliant answer against another with.

Options carry `tags` so a search can be told what the builder will not do —
"no external insulation", "no raft slab" — before it starts. That is the
difference between the cheapest specification that passes H1 and the cheapest
specification that also gets built.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

import yaml

from h1.tables import ELEMENT_TYPES, TableError

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_CATALOGUE = "constructions"


@dataclass(frozen=True)
class Option:
    element_type: str
    name: str
    r_value: float
    cost_per_m2: Optional[float]
    tags: tuple = ()


@dataclass(frozen=True)
class Catalogue:
    currency: str
    verified: bool
    options: Dict[str, List[Option]]

    def for_type(self, element_type: str, exclude_tags: Sequence[str] = ()) -> List[Option]:
        excluded = set(exclude_tags)
        return [
            o
            for o in self.options.get(element_type, [])
            if not excluded.intersection(o.tags)
        ]

    def all_tags(self) -> List[str]:
        return sorted({tag for opts in self.options.values() for o in opts for tag in o.tags})


def load(name: str = DEFAULT_CATALOGUE) -> Catalogue:
    path = DATA_DIR / f"{name}.yaml"
    if not path.exists():
        raise TableError(f"No construction catalogue named {name!r} in {DATA_DIR}")
    return parse(yaml.safe_load(path.read_text(encoding="utf-8")), source_name=name)


def parse(raw: dict, source_name: str = "<dict>") -> Catalogue:
    if not isinstance(raw, dict):
        raise TableError(f"{source_name}: catalogue must be a mapping")

    options: Dict[str, List[Option]] = {}
    for element_type, entries in (raw.get("options") or {}).items():
        if element_type not in ELEMENT_TYPES:
            raise TableError(f"{source_name}: unknown element type {element_type!r}")
        if not isinstance(entries, list) or not entries:
            raise TableError(f"{source_name}: options.{element_type} must be a non-empty list")
        options[element_type] = [
            _parse_option(entry, element_type, index, source_name)
            for index, entry in enumerate(entries)
        ]

    if not options:
        raise TableError(f"{source_name}: catalogue has no options")

    return Catalogue(
        currency=raw.get("currency") or "NZD",
        verified=bool(raw.get("verified")),
        options=options,
    )


def _parse_option(entry: dict, element_type: str, index: int, source_name: str) -> Option:
    where = f"{source_name}: options.{element_type}[{index}]"
    if not isinstance(entry, dict):
        raise TableError(f"{where} must be a mapping")

    name = entry.get("name")
    if not name or not isinstance(name, str):
        raise TableError(f"{where} needs a name")

    r_value = entry.get("r_value")
    if not isinstance(r_value, (int, float)) or isinstance(r_value, bool) or r_value <= 0:
        raise TableError(f"{where} ({name}): r_value must be a positive number, got {r_value!r}")

    cost = entry.get("cost_per_m2")
    if cost is not None and (
        not isinstance(cost, (int, float)) or isinstance(cost, bool) or cost < 0
    ):
        raise TableError(f"{where} ({name}): cost_per_m2 must be a non-negative number or null")

    tags = entry.get("tags") or []
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        raise TableError(f"{where} ({name}): tags must be a list of strings")

    return Option(
        element_type=element_type,
        name=name,
        r_value=float(r_value),
        cost_per_m2=None if cost is None else float(cost),
        tags=tuple(tags),
    )
