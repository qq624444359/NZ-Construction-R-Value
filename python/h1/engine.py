"""
NZBC H1/AS1 Calculation method — envelope heat-loss comparison.

H1/AS1 offers two routes: this calculation method (Subsection 2.1.2), and the
modelling method in H1/VM1. The calculation method compares the proposed
building against a *reference* building and lets envelope elements trade off
against each other, so a weak wall can be bought back with a strong roof.

Two things about the reference building are easy to get wrong, and both are
settled by Table 2.1.2.7 rather than by intuition:

  * It is not "the proposed areas at the schedule minimums". It borrows only the
    proposed roof, skylight and floor areas; its walls are ALWAYS assumed 30%
    glazed — 70% of gross wall area at the wall R-value, 30% at the glazing
    R-value — no matter how the proposed building is actually glazed.
  * Roof and skylight share one term (R6.6). Floors do not: slab-on-ground and
    other floors carry different reference R-values, which is why the element
    taxonomy here splits them even though Equation 2.1 writes one `Afloor/Rfloor`.

Three rules sit outside the trade-off and can sink an otherwise passing design:

  * 2.1.2.5  — wall glazing shall be 40% or less of gross wall area.
  * 2.1.2.11 — roof R2.6, wall R1.0, non-slab floor R1.3, whatever the totals say.
  * 2.1.2.12 — heated ceilings, walls and floors carry their own minimums.

The arithmetic is exact and free, so it belongs in code for the same reason
`src/utils/cross_sheet.py` does: it cannot invent a number the way a model asked
to "check H1 compliance" will. Two callers share this one engine — the public
calculator page via `POST /api/h1/calculate`, and (later) a `deterministic`
clause in the audit registry. A second hand-mirrored copy of it would eventually
disagree with the first while still looking authoritative.

What this engine does NOT do: determine construction R-values. Those come in as
inputs. Deriving them is a separate job (NZS 4214 as modified by 2.1.3.2, with a
wall framing fraction of no less than 38% per 2.1.3.1 a) i)) — see `framing.py`
for the part of it that Revit geometry can settle.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from h1.tables import ELEMENT_TYPES, GROSS_WALL_TYPES, TableError, Tables


@dataclass(frozen=True)
class Element:
    """One envelope element. `r_value` None means "not known" (Paragraph 2.1.2.13).

    `heated` means "subject to Table 2.1.2.12", which is narrower than "has
    heating in it". Paragraph 2.1.2.12 exempts heated ceilings, walls and floors
    installed solely in rooms containing a shower, bath or toilet — so a heated
    bathroom floor is NOT `heated` here. Marking one would fail a building the
    standard passes, which is why `calculate` says so in its notes whenever this
    flag is used.
    """

    element_type: str
    area_m2: float
    r_value: Optional[float] = None
    label: str = ""
    heated: bool = False


@dataclass(frozen=True)
class ElementLoss:
    label: str
    element_type: str
    area_m2: float
    r_value: float
    heat_loss: float  # W/K


@dataclass(frozen=True)
class BelowMinimum:
    label: str
    element_type: str
    r_value: float
    minimum: float
    rule: str


@dataclass(frozen=True)
class Result:
    complies: bool
    provisional: bool
    climate_zone: int
    edition: str
    proposed_heat_loss: float
    reference_heat_loss: float
    margin: float  # reference - proposed; >= 0 passes the comparison
    gross_wall_area_m2: float
    wall_glazing_fraction: float
    glazing_limit_ok: bool
    proposed: List[ElementLoss] = field(default_factory=list)
    reference: List[ElementLoss] = field(default_factory=list)
    below_minimum: List[BelowMinimum] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


def calculate(elements: Sequence[Element], climate_zone: int, tables: Tables) -> Result:
    _validate(elements, climate_zone, tables)
    notes: List[str] = []

    proposed = _proposed_losses(elements, tables, notes)
    proposed_total = sum(p.heat_loss for p in proposed)

    areas = _areas_by_type(elements)
    gross_wall = sum(areas.get(t, 0.0) for t in GROSS_WALL_TYPES)
    glazing_fraction = (areas.get("glazing", 0.0) / gross_wall) if gross_wall else 0.0
    glazing_limit_ok = glazing_fraction <= tables.max_wall_glazing_fraction + 1e-9
    if not glazing_limit_ok:
        notes.append(
            f"Wall glazing is {glazing_fraction:.1%} of the {gross_wall:.1f} m² gross wall area, "
            f"over the {tables.max_wall_glazing_fraction:.0%} limit in Paragraph 2.1.2.5. "
            f"That is a gate, not a trade-off — no amount of insulation elsewhere buys past it."
        )

    reference = _reference_losses(areas, gross_wall, climate_zone, tables)
    reference_total = sum(r.heat_loss for r in reference)

    below_minimum = _below_minimum(elements, climate_zone, tables)
    if below_minimum:
        rules = sorted({b.rule for b in below_minimum})
        notes.append(
            f"{len(below_minimum)} element(s) fall below a minimum construction R-value "
            f"({', '.join(rules)}), which the heat-loss comparison cannot rescue."
        )

    heated = [el.label or el.element_type for el in elements if el.heated]
    if heated:
        notes.append(
            f"Held to the heated-element minimums in Table 2.1.2.12: {', '.join(heated)}. "
            f"Those minimums do not apply where the element serves only rooms containing a "
            f"shower, bath or toilet — if that is the case, do not mark it heated."
        )

    provisional = not tables.verified
    if provisional:
        notes.append(
            f"The {tables.edition} figures have not been checked against the published "
            f"document by a person (`verified: false`) — this result is provisional."
        )

    return Result(
        complies=(
            proposed_total <= reference_total + 1e-9
            and glazing_limit_ok
            and not below_minimum
        ),
        provisional=provisional,
        climate_zone=climate_zone,
        edition=tables.edition,
        proposed_heat_loss=proposed_total,
        reference_heat_loss=reference_total,
        margin=reference_total - proposed_total,
        gross_wall_area_m2=gross_wall,
        wall_glazing_fraction=glazing_fraction,
        glazing_limit_ok=glazing_limit_ok,
        proposed=proposed,
        reference=reference,
        below_minimum=below_minimum,
        notes=notes,
    )


def reference_heat_loss(areas: Dict[str, float], climate_zone: int, tables: Tables) -> float:
    """HLreference for a set of envelope areas, per Table 2.1.2.7.

    Worth stating plainly because the optimiser depends on it: the reference
    building is a function of *geometry alone*. Change every construction R-value
    in the proposed building and this number does not move. That is what makes
    "which combination of build-ups is cheapest" a search against a fixed budget
    rather than a moving target.
    """
    gross_wall = sum(areas.get(t, 0.0) for t in GROSS_WALL_TYPES)
    return sum(r.heat_loss for r in _reference_losses(areas, gross_wall, climate_zone, tables))


def _validate(elements: Sequence[Element], climate_zone: int, tables: Tables) -> None:
    if not elements:
        raise TableError("No envelope elements supplied")
    if climate_zone not in tables.zones:
        raise TableError(f"Climate zone {climate_zone} is not in {list(tables.zones)}")
    for el in elements:
        name = el.label or el.element_type
        if el.element_type not in ELEMENT_TYPES:
            raise TableError(
                f"{name}: unknown element type {el.element_type!r}; expected one of "
                f"{', '.join(ELEMENT_TYPES)}"
            )
        if el.area_m2 <= 0:
            raise TableError(f"{name}: area must be positive, got {el.area_m2}")
        if el.r_value is not None and el.r_value <= 0:
            raise TableError(f"{name}: R-value must be positive or omitted, got {el.r_value}")


def _proposed_losses(
    elements: Sequence[Element], tables: Tables, notes: List[str]
) -> List[ElementLoss]:
    """Equation 2.1, with each element its own term as Paragraph 2.1.2.9 allows."""
    losses = []
    defaulted = []
    for el in elements:
        r_value = el.r_value
        if r_value is None:
            r_value = tables.default_r_value(el.element_type)
            defaulted.append(el.label or el.element_type)
        losses.append(
            ElementLoss(
                label=el.label or el.element_type,
                element_type=el.element_type,
                area_m2=el.area_m2,
                r_value=r_value,
                heat_loss=el.area_m2 / r_value,
            )
        )
    if defaulted:
        notes.append(
            f"No R-value given for {', '.join(defaulted)} — Paragraph 2.1.2.13 defaults "
            f"applied (R0.18 opaque, R0.15 glazed)."
        )
    return losses


def _areas_by_type(elements: Sequence[Element]) -> Dict[str, float]:
    areas: Dict[str, float] = {}
    for el in elements:
        areas[el.element_type] = areas.get(el.element_type, 0.0) + el.area_m2
    return areas


def _reference_losses(
    areas: Dict[str, float], gross_wall: float, zone: int, tables: Tables
) -> List[ElementLoss]:
    """Table 2.1.2.7. Note the walls: always 70/30, never the proposed glazing ratio."""
    terms = [
        ("roof_and_skylight", areas.get("roof", 0.0) + areas.get("skylight", 0.0)),
        ("wall", gross_wall * tables.wall_fraction),
        ("glazing", gross_wall * tables.glazing_fraction),
        ("slab_on_ground", areas.get("slab_on_ground_floor", 0.0)),
        ("other_floor", areas.get("other_floor", 0.0)),
    ]
    losses = []
    for term, area in terms:
        if area <= 0:
            continue
        r_value = tables.reference_r_value(term, zone)
        losses.append(
            ElementLoss(
                label=f"reference {term.replace('_', ' ')}",
                element_type=term,
                area_m2=area,
                r_value=r_value,
                heat_loss=area / r_value,
            )
        )
    return losses


def _below_minimum(
    elements: Sequence[Element], zone: int, tables: Tables
) -> List[BelowMinimum]:
    """Paragraph 2.1.2.11 for every element, Table 2.1.2.12 for heated ones."""
    found = []
    for el in elements:
        r_value = el.r_value if el.r_value is not None else tables.default_r_value(el.element_type)
        checks = [(tables.minimum_r.get(el.element_type), "2.1.2.11")]
        if el.heated:
            checks.append((tables.heated_minimum(el.element_type, zone), "Table 2.1.2.12"))
        for minimum, rule in checks:
            if minimum is not None and r_value < minimum:
                found.append(
                    BelowMinimum(
                        label=el.label or el.element_type,
                        element_type=el.element_type,
                        r_value=r_value,
                        minimum=minimum,
                        rule=rule,
                    )
                )
    return found


@dataclass(frozen=True)
class Headroom:
    """How far one element could drop with everything else held as specified."""

    label: str
    element_type: str
    area_m2: float
    current_r: float
    lowest_r: Optional[float]  # None when no R-value for this element can comply
    binding: str               # "heat loss" | "2.1.2.11" | "Table 2.1.2.12" | "2.1.2.5" | "impossible"


def headroom(
    elements: Sequence[Element], climate_zone: int, tables: Tables
) -> List[Headroom]:
    """The lowest construction R-value each element could have and still comply.

    This is what makes the elements feel connected rather than independently
    specified: lift the walls and the roof is free to come down, and by exactly
    this much. It falls out of the comparison in closed form, because
    HLreference is fixed by geometry (see `reference_heat_loss`):

        A_i / R_i  <=  HLreference - sum over the others of A_j / R_j
        R_i        >=  A_i / (that remaining budget)

    Two things can bind harder than the arithmetic. Paragraph 2.1.2.11 and
    Table 2.1.2.12 set floors no trade-off may cross, so the answer is the
    higher of the two; `binding` says which. And the 40% glazing gate in
    2.1.2.5 is not about R-values at all — when it fails, no element has any
    headroom, because the building cannot use this method.

    A `lowest_r` above the element's current R is not an error: it means the
    building does not comply yet, and that is what this element would have to
    reach for it to.
    """
    _validate(elements, climate_zone, tables)

    areas = _areas_by_type(elements)
    gross_wall = sum(areas.get(t, 0.0) for t in GROSS_WALL_TYPES)
    glazing_fraction = (areas.get("glazing", 0.0) / gross_wall) if gross_wall else 0.0
    glazing_limit_ok = glazing_fraction <= tables.max_wall_glazing_fraction + 1e-9

    resolved = [
        (el, el.r_value if el.r_value is not None else tables.default_r_value(el.element_type))
        for el in elements
    ]
    proposed_total = sum(el.area_m2 / r_value for el, r_value in resolved)
    reference = reference_heat_loss(areas, climate_zone, tables)

    rows = []
    for el, r_value in resolved:
        floor, floor_rule = _floor_for(el, climate_zone, tables)
        budget = reference - (proposed_total - el.area_m2 / r_value)

        if not glazing_limit_ok:
            lowest, binding = None, "2.1.2.5"
        elif budget <= 0:
            lowest, binding = None, "impossible"
        elif floor is not None and floor >= el.area_m2 / budget:
            lowest, binding = floor, floor_rule
        else:
            lowest, binding = el.area_m2 / budget, "heat loss"

        rows.append(
            Headroom(
                label=el.label or el.element_type,
                element_type=el.element_type,
                area_m2=el.area_m2,
                current_r=r_value,
                lowest_r=lowest,
                binding=binding,
            )
        )
    return rows


def _floor_for(el: Element, zone: int, tables: Tables) -> Tuple[Optional[float], str]:
    """The highest untradeable minimum that applies to this element, and its rule."""
    candidates = [(tables.minimum_r.get(el.element_type), "2.1.2.11")]
    if el.heated:
        candidates.append((tables.heated_minimum(el.element_type, zone), "Table 2.1.2.12"))
    applicable = [(value, rule) for value, rule in candidates if value is not None]
    return max(applicable, default=(None, ""))
