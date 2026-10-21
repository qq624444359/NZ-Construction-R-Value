"""
Roofing choice → the substrate and underlay that come with it.

The rules live in `data/roofing_systems.yaml` so the configurator page and the
R-value engine read one source. This module loads them, refuses a file that
contradicts itself, and checks a designer's selection against them.

An unconfirmed layer is reported, not resolved. Guessing "probably the same as
metal" would put a layer into a construction R-value that the roof does not
have, and nothing downstream would notice.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml

from h1.rvalue.engine import RValueError

DATA_FILE = Path(__file__).parent / "data" / "roofing_systems.yaml"


@dataclass(frozen=True)
class LinkedLayer:
    confirmed: bool
    default: Optional[str]
    allowed: Tuple[str, ...]


@dataclass(frozen=True)
class RoofingFamily:
    id: str
    label: str
    profiles: Dict[str, str]
    substrate: LinkedLayer
    underlay: LinkedLayer


@dataclass(frozen=True)
class RoofingSystems:
    families: Dict[str, RoofingFamily]
    substrates: Dict[str, str]
    underlays: Dict[str, str]

    def family_for_profile(self, profile_id: str) -> RoofingFamily:
        for family in self.families.values():
            if profile_id in family.profiles:
                return family
        raise RValueError(f"Unknown roofing profile {profile_id!r}")


def load(path: Path = DATA_FILE) -> RoofingSystems:
    return parse(yaml.safe_load(Path(path).read_text(encoding="utf-8")))


def parse(raw: dict) -> RoofingSystems:
    substrates = dict(raw.get("substrates") or {})
    underlays = dict(raw.get("underlays") or {})
    families: Dict[str, RoofingFamily] = {}
    seen_profiles: Dict[str, str] = {}

    for family_id, entry in (raw.get("families") or {}).items():
        profiles = dict(entry.get("profiles") or {})
        if not profiles:
            raise RValueError(f"{family_id}: a roofing family needs at least one profile")
        for profile_id in profiles:
            if profile_id in seen_profiles:
                raise RValueError(
                    f"Profile {profile_id!r} is listed under both "
                    f"{seen_profiles[profile_id]!r} and {family_id!r}"
                )
            seen_profiles[profile_id] = family_id

        families[family_id] = RoofingFamily(
            id=family_id,
            label=entry.get("label") or family_id,
            profiles=profiles,
            substrate=_linked(family_id, "substrate", entry.get("substrate"), substrates),
            underlay=_linked(family_id, "underlay", entry.get("underlay"), underlays),
        )

    if not families:
        raise RValueError("No roofing families defined")
    return RoofingSystems(families=families, substrates=substrates, underlays=underlays)


def _linked(family_id: str, layer: str, raw: Optional[dict], catalogue: Dict[str, str]) -> LinkedLayer:
    raw = raw or {}
    confirmed = bool(raw.get("confirmed"))
    default = raw.get("default")
    allowed = tuple(raw.get("allowed") or ())
    where = f"{family_id}.{layer}"

    unknown = [item for item in allowed if item not in catalogue]
    if unknown:
        raise RValueError(f"{where}: {unknown} not defined under {layer}s")
    if confirmed:
        if default is None or default not in allowed:
            raise RValueError(f"{where}: a confirmed layer needs a default that is in `allowed`")
    elif default is not None or allowed:
        raise RValueError(
            f"{where}: an unconfirmed layer must not carry a default or allowed list — "
            f"confirm the rule or leave it empty"
        )
    return LinkedLayer(confirmed=confirmed, default=default, allowed=allowed)


def check(
    systems: RoofingSystems,
    profile_id: str,
    substrate_id: Optional[str],
    underlay_id: Optional[str],
) -> List[str]:
    """Problems with a selection, in words a designer can act on. Empty means consistent."""
    family = systems.family_for_profile(profile_id)
    problems = []
    for layer_name, linked, chosen, catalogue in (
        ("substrate", family.substrate, substrate_id, systems.substrates),
        ("underlay", family.underlay, underlay_id, systems.underlays),
    ):
        if not linked.confirmed:
            problems.append(
                f"No {layer_name} rule is set up for {family.label.lower()} yet — "
                f"choose it yourself and check it against the manufacturer's details."
            )
        elif chosen not in linked.allowed:
            expected = ", ".join(catalogue[a] for a in linked.allowed)
            problems.append(
                f"{family.label} takes {expected} as the {layer_name}, not "
                f"{catalogue.get(chosen, chosen)!s}."
            )
    return problems
