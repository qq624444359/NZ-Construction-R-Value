"""
Whether H1/AS1 applies to this building at all (Part 1 of the standard).

Everything else in this package answers "does the envelope comply". This module
answers the question that comes first, and gets skipped because the calculation
runs happily without it: three characteristics put a building outside H1/AS1
entirely, and for such a building a compliant-looking result is worth nothing.

    1.1.1.1 b)  other buildings need occupied space of 300 m² or less
    1.1.2.1     buildings with foil insulation are excluded outright
    1.1.2.2     buildings with curtain walling are excluded

None of that is visible in a list of areas and R-values, so the caller has to
say. Unstated facts come back as `not_stated` rather than being assumed benign —
silence about curtain walling is not evidence there is none.

Findings are advisory. The caller decides whether to show a warning or refuse to
proceed; this module refuses to guess which. What it will not do is let a
building sail through with nothing said.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

# A catalogue option carrying this tag takes the whole building out of H1/AS1
# under 1.1.2.1 — it is not a preference like the other tags, and the optimiser
# says so rather than quietly ranking it against build-ups that stay in scope.
FOIL_INSULATION_TAG = "foil-insulation"

MAX_NON_HOUSING_OCCUPIED_SPACE_M2 = 300.0

OUT_OF_SCOPE = "out_of_scope"
NOT_STATED = "not_stated"
IN_SCOPE = "in_scope"


@dataclass(frozen=True)
class BuildingScope:
    """The Part 1 facts, as the caller states them.

    `non_housing_occupied_space_m2` is the combined occupied space of the parts
    of the building that are NOT housing — 0 for a house, the whole building for
    a non-residential one, and just the non-housing parts of a mixed-use
    building. Housing itself has no area limit (1.1.1.1 a)).
    """

    non_housing_occupied_space_m2: Optional[float] = None
    has_curtain_walling: Optional[bool] = None
    has_foil_insulation: Optional[bool] = None


@dataclass(frozen=True)
class Finding:
    rule: str
    status: str
    message: str


def check(scope: Optional[BuildingScope] = None) -> List[Finding]:
    scope = scope or BuildingScope()
    return [
        _check_area(scope.non_housing_occupied_space_m2),
        _check_curtain_walling(scope.has_curtain_walling),
        _check_foil(scope.has_foil_insulation),
    ]


def out_of_scope(findings: Sequence[Finding]) -> List[Finding]:
    return [f for f in findings if f.status == OUT_OF_SCOPE]


def unanswered(findings: Sequence[Finding]) -> List[Finding]:
    return [f for f in findings if f.status == NOT_STATED]


def _check_area(area: Optional[float]) -> Finding:
    rule = "1.1.1.1 b)"
    if area is None:
        return Finding(
            rule,
            NOT_STATED,
            "How much occupied space is not housing? H1/AS1 covers housing of any size, "
            "but other buildings only up to 300 m².",
        )
    if area < 0:
        raise ValueError(f"non_housing_occupied_space_m2 cannot be negative, got {area}")
    if area > MAX_NON_HOUSING_OCCUPIED_SPACE_M2:
        return Finding(
            rule,
            OUT_OF_SCOPE,
            f"{area:g} m² of occupied space is not housing, over the 300 m² limit — "
            f"H1/AS1 does not apply. Use H1/AS2 or H1/VM2 for those parts (1.1.1.2).",
        )
    return Finding(
        rule,
        IN_SCOPE,
        f"{area:g} m² of non-housing occupied space is within the 300 m² limit.",
    )


def _check_curtain_walling(has_curtain_walling: Optional[bool]) -> Finding:
    rule = "1.1.2.2"
    if has_curtain_walling is None:
        return Finding(rule, NOT_STATED, "Does the building have curtain walling?")
    if has_curtain_walling:
        return Finding(
            rule,
            OUT_OF_SCOPE,
            "H1/AS1 does not apply to buildings with curtain walling. Use H1/VM1, or "
            "another means of demonstrating compliance.",
        )
    return Finding(rule, IN_SCOPE, "No curtain walling.")


def _check_foil(has_foil_insulation: Optional[bool]) -> Finding:
    rule = "1.1.2.1"
    if has_foil_insulation is None:
        return Finding(rule, NOT_STATED, "Does the building use foil insulation anywhere?")
    if has_foil_insulation:
        return Finding(
            rule,
            OUT_OF_SCOPE,
            "H1/AS1 does not apply to buildings with foil insulation — anywhere in the "
            "building, not just in the elements being traded off here.",
        )
    return Finding(rule, IN_SCOPE, "No foil insulation.")
