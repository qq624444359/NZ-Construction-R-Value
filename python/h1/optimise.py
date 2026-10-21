"""
Find the cheapest sets of build-ups that comply with the H1 calculation method.

The calculation method's whole character is that it has no single answer: drop
the slab insulation and lift the walls, or keep the slab and buy better glazing,
and both can land under the same reference heat loss. Designers currently find a
workable combination by trying them one at a time in a calculator, which is slow
and stops at the first thing that passes rather than the cheapest thing that
passes.

Two facts make that search cheap to do exhaustively instead:

  * `HLreference` depends only on geometry (see `engine.reference_heat_loss`).
    Every candidate is measured against the same fixed budget.
  * The real choices are discrete and few. Nobody specifies "R2.37 walls"; they
    pick from a handful of build-ups their builder will actually do.

The unit of search is an `Assembly` — a set of surfaces that will all be built
the same way — not an individual surface. That distinction is what keeps the
space small enough to enumerate. A house with twenty windows is usually one
joinery decision, not twenty; making it twenty would be 3^20 combinations for a
choice nobody wanted to make separately. Meanwhile a brick-veneer street
elevation and weatherboard elsewhere genuinely are two decisions, and modelling
them as one average wall would quietly price a building nobody is going to build.

So this enumerates rather than approximates: the answer is the true cheapest
compliant set, plus the runners-up, not a local optimum from a heuristic.

The search does its own arithmetic for speed, but every candidate it is about to
return is re-checked by `engine.calculate` before it leaves this module. The
engine stays the single authority on whether something complies — a faster inner
loop must never become a second opinion on compliance.
"""
from __future__ import annotations

import heapq
import itertools
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from h1 import engine
from h1.catalogue import Catalogue, Option
from h1.scope import FOIL_INSULATION_TAG
from h1.tables import ELEMENT_TYPES, TableError, Tables

# A catalogue big enough to exceed this is a data mistake, not a search problem.
MAX_COMBINATIONS = 20_000_000

# Reserved tag: an option that is offered but never preferred, whatever it costs.
# Insulating under or around a slab is the example — it is disruptive to build,
# so it should only appear once no combination without it complies. Candidates
# that avoid every last-resort option always rank ahead of ones that use any.
LAST_RESORT_TAG = "last-resort"


@dataclass(frozen=True)
class Assembly:
    """One specification decision: surfaces that will all be built the same way.

    Group by the decision, not by the surface. All the windows that will get the
    same joinery are one assembly; a brick-veneer elevation and the weatherboard
    walls behind it are two, because they carry different build-ups and prices.
    """

    name: str
    element_type: str
    area_m2: float
    fixed_r: Optional[float] = None   # pinned: not searched, used as given
    require_tags: tuple = ()          # only options carrying all of these
    exclude_tags: tuple = ()          # on top of the search-wide excludes
    heated: bool = False              # heated ceiling / wall / floor, Table 2.1.2.12


@dataclass(frozen=True)
class Selection:
    assembly: str
    element_type: str
    name: str
    area_m2: float
    r_value: float
    cost_per_m2: Optional[float]
    cost: float
    heat_loss: float
    tags: tuple = ()


@dataclass(frozen=True)
class Candidate:
    total_cost: float
    heat_loss: float
    margin: float
    selections: List[Selection]
    result: engine.Result


@dataclass(frozen=True)
class Solutions:
    budget_heat_loss: float
    currency: str
    provisional: bool
    candidates: List[Candidate] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


def optimise(
    assemblies: Sequence[Assembly],
    climate_zone: int,
    tables: Tables,
    catalogue: Catalogue,
    *,
    exclude_tags: Sequence[str] = (),
    limit: int = 10,
) -> Solutions:
    notes: List[str] = []
    _validate(assemblies, climate_zone, tables, limit)

    variable, fixed = _split(assemblies, catalogue, tables, exclude_tags, notes)
    _warn_about_foil(variable, notes)

    areas: Dict[str, float] = {}
    for assembly in assemblies:
        areas[assembly.element_type] = areas.get(assembly.element_type, 0.0) + assembly.area_m2
    budget = engine.reference_heat_loss(areas, climate_zone, tables)
    base_heat_loss = sum(a.area_m2 / a.fixed_r for a in fixed)

    searched = sorted(variable, key=lambda pair: len(pair[1]))
    combinations = 1
    for _, options in searched:
        combinations *= len(options)
        if combinations > MAX_COMBINATIONS:
            raise TableError(
                f"These {len(searched)} assemblies allow over {MAX_COMBINATIONS:,} "
                f"combinations — merge assemblies that share a decision, or exclude more tags"
            )

    found = _search_preferring_first_choices(searched, budget - base_heat_loss, limit, notes)

    heated = {a.name: a.heated for a in assemblies}
    candidates = []
    for total_cost, selections in found:
        elements = [
            engine.Element(a.element_type, a.area_m2, a.fixed_r, a.name, a.heated)
            for a in fixed
        ] + [
            engine.Element(s.element_type, s.area_m2, s.r_value, s.assembly, heated[s.assembly])
            for s in selections
        ]
        result = engine.calculate(elements, climate_zone, tables)
        if not result.complies:
            # The fast loop and the engine disagreed. Trust the engine, drop it.
            continue
        candidates.append(
            Candidate(
                total_cost=total_cost,
                heat_loss=result.proposed_heat_loss,
                margin=result.margin,
                selections=selections,
                result=result,
            )
        )

    if not candidates:
        notes.append(
            "No combination in the catalogue complies. Either the geometry needs to "
            "change, or the catalogue needs build-ups that reach higher R-values."
        )

    provisional = not (tables.verified and catalogue.verified)
    if provisional:
        reasons = []
        if not tables.verified:
            reasons.append("the H1 figures have not been checked by a person")
        if not catalogue.verified:
            reasons.append("the construction catalogue is not priced and verified")
        notes.append(f"Provisional: {' and '.join(reasons)}.")

    return Solutions(
        budget_heat_loss=budget,
        currency=catalogue.currency,
        provisional=provisional,
        candidates=candidates,
        notes=notes,
    )


def _validate(
    assemblies: Sequence[Assembly], climate_zone: int, tables: Tables, limit: int
) -> None:
    if not assemblies:
        raise TableError("No assemblies supplied")
    if climate_zone not in tables.zones:
        raise TableError(f"Climate zone {climate_zone} is not in {list(tables.zones)}")
    if limit < 1:
        raise TableError(f"limit must be at least 1, got {limit}")

    seen = set()
    for assembly in assemblies:
        if not assembly.name:
            raise TableError("Every assembly needs a name")
        if assembly.name in seen:
            raise TableError(f"Duplicate assembly name {assembly.name!r}")
        seen.add(assembly.name)
        if assembly.element_type not in ELEMENT_TYPES:
            raise TableError(
                f"{assembly.name}: unknown element type {assembly.element_type!r}; "
                f"expected one of {', '.join(ELEMENT_TYPES)}"
            )
        if assembly.area_m2 <= 0:
            raise TableError(f"{assembly.name}: area must be positive, got {assembly.area_m2}")
        if assembly.fixed_r is not None:
            if assembly.fixed_r <= 0:
                raise TableError(f"{assembly.name}: fixed_r must be positive")
            if assembly.require_tags or assembly.exclude_tags:
                raise TableError(
                    f"{assembly.name}: fixed_r pins the build-up, so tag filters on it "
                    f"would never be used — drop one or the other"
                )


def _split(
    assemblies: Sequence[Assembly],
    catalogue: Catalogue,
    tables: Tables,
    exclude_tags: Sequence[str],
    notes: List[str],
) -> Tuple[List[Tuple[Assembly, List[Option]]], List[Assembly]]:
    """Sort assemblies into ones the search chooses for and ones the caller pinned."""
    variable: List[Tuple[Assembly, List[Option]]] = []
    fixed: List[Assembly] = []

    for assembly in assemblies:
        if assembly.fixed_r is not None:
            fixed.append(assembly)
            continue

        excluded = tuple(exclude_tags) + tuple(assembly.exclude_tags)
        options = catalogue.for_type(assembly.element_type, excluded)
        if assembly.require_tags:
            wanted = set(assembly.require_tags)
            options = [o for o in options if wanted.issubset(o.tags)]
        if not options:
            raise TableError(
                f"{assembly.name}: no catalogue options left for {assembly.element_type!r} "
                f"after applying require_tags={list(assembly.require_tags)} and excluding "
                f"{list(excluded) or 'nothing'} — loosen the filters or pin it with fixed_r"
            )

        minimum = tables.minimum_r.get(assembly.element_type)
        usable = [o for o in options if minimum is None or o.r_value >= minimum]
        if not usable:
            raise TableError(
                f"{assembly.name}: every option is below the R{minimum} minimum that "
                f"Paragraph 2.1.2.11 sets, so none of them can ever comply"
            )
        if len(usable) < len(options):
            notes.append(
                f"{assembly.name}: {len(options) - len(usable)} option(s) dropped for falling "
                f"below the R{minimum} minimum in Paragraph 2.1.2.11."
            )

        priced = [o for o in usable if o.cost_per_m2 is not None]
        if not priced:
            raise TableError(
                f"{assembly.name}: no option has a cost_per_m2, so nothing can be ranked. "
                f"Price the catalogue, or pin this assembly with fixed_r."
            )
        if len(priced) < len(usable):
            notes.append(
                f"{assembly.name}: {len(usable) - len(priced)} option(s) ignored for having "
                f"no cost_per_m2."
            )

        variable.append((assembly, sorted(priced, key=lambda o: o.cost_per_m2)))

    if not variable:
        raise TableError("Every assembly is pinned with fixed_r — there is nothing to search")
    return variable, fixed


def _warn_about_foil(
    variable: List[Tuple[Assembly, List[Option]]], notes: List[str]
) -> None:
    """Foil is not a preference like the other tags — it ends the pathway (1.1.2.1).

    Ranking a foil build-up against the rest by price would present it as an
    option, when choosing it means H1/AS1 does not apply to the building at all
    and every number here becomes moot. Say so; each Selection carries its tags,
    so the caller can see which candidates are affected.
    """
    affected = sorted(
        {
            f"{assembly.name}: {option.name}"
            for assembly, options in variable
            for option in options
            if FOIL_INSULATION_TAG in option.tags
        }
    )
    if affected:
        notes.append(
            f"Ranked alongside build-ups that use foil insulation ({'; '.join(affected)}). "
            f"H1/AS1 does not apply to a building with foil insulation anywhere in it "
            f"(1.1.2.1) — exclude the {FOIL_INSULATION_TAG!r} tag unless you are "
            f"demonstrating compliance another way."
        )


def _search_preferring_first_choices(
    searched: List[Tuple[Assembly, List[Option]]], budget: float, limit: int, notes: List[str]
) -> List[Tuple[float, List[Selection]]]:
    """Search without last-resort options first; bring them in only to fill what is left.

    If the first pass returned fewer than `limit`, it found every compliant set
    that avoids them, so a second search of the full space for `limit` more than
    that is guaranteed to hold `limit` that use one — when that many exist.
    """
    preferred = [(a, [o for o in opts if LAST_RESORT_TAG not in o.tags]) for a, opts in searched]
    if all(len(p) == len(s) for (_, p), (_, s) in zip(preferred, searched)):
        return _search(searched, budget, limit)

    found = _search(preferred, budget, limit) if all(opts for _, opts in preferred) else []
    if len(found) == limit:
        return found

    fallback = [
        (cost, selections)
        for cost, selections in _search(searched, budget, limit + len(found))
        if any(LAST_RESORT_TAG in s.tags for s in selections)
    ][: limit - len(found)]
    if fallback:
        used = sorted({s.name for _, sel in fallback for s in sel if LAST_RESORT_TAG in s.tags})
        if found:
            notes.append(
                f"Listed after every answer that avoids them, as a last resort: {'; '.join(used)}."
            )
        else:
            notes.append(
                f"Nothing complies without a last resort: {'; '.join(used)}. Improving other "
                f"elements further, or changing the geometry, would avoid it."
            )
    return found + fallback


def _search(
    searched: List[Tuple[Assembly, List[Option]]], budget: float, limit: int
) -> List[Tuple[float, List[Selection]]]:
    """Branch and bound over the catalogue, keeping the `limit` cheapest compliant sets."""
    count = len(searched)

    # Suffix bounds: the least heat loss and the least cost still achievable from
    # level i onward. Both prune whole subtrees before they are walked.
    best_heat_loss = [0.0] * (count + 1)
    least_cost = [0.0] * (count + 1)
    for i in range(count - 1, -1, -1):
        assembly, options = searched[i]
        best_heat_loss[i] = best_heat_loss[i + 1] + assembly.area_m2 / max(
            o.r_value for o in options
        )
        least_cost[i] = least_cost[i + 1] + assembly.area_m2 * min(
            o.cost_per_m2 for o in options
        )

    # Max-heap on cost, capped at `limit`, so the worst kept candidate can prune.
    heap: List[Tuple[float, int, List[Option]]] = []
    tiebreak = itertools.count()

    def worst_kept() -> float:
        return -heap[0][0] if len(heap) >= limit else float("inf")

    def walk(level: int, heat_loss: float, cost: float, chosen: List[Option]) -> None:
        if heat_loss + best_heat_loss[level] > budget + 1e-9:
            return
        if cost + least_cost[level] >= worst_kept():
            return
        if level == count:
            heapq.heappush(heap, (-cost, next(tiebreak), list(chosen)))
            if len(heap) > limit:
                heapq.heappop(heap)
            return

        assembly, options = searched[level]
        for option in options:  # cheapest first
            next_cost = cost + assembly.area_m2 * option.cost_per_m2
            # Options are cost-sorted, so once the floor price is unreachable the
            # rest of this level is too.
            if next_cost + least_cost[level + 1] >= worst_kept():
                break
            chosen.append(option)
            walk(level + 1, heat_loss + assembly.area_m2 / option.r_value, next_cost, chosen)
            chosen.pop()

    walk(0, 0.0, 0.0, [])

    ordered = sorted(((-c, opts) for c, _, opts in heap), key=lambda pair: pair[0])
    return [(cost, _selections(searched, opts)) for cost, opts in ordered]


def _selections(
    searched: List[Tuple[Assembly, List[Option]]], options: List[Option]
) -> List[Selection]:
    return [
        Selection(
            assembly=assembly.name,
            element_type=assembly.element_type,
            name=option.name,
            area_m2=assembly.area_m2,
            r_value=option.r_value,
            cost_per_m2=option.cost_per_m2,
            cost=assembly.area_m2 * option.cost_per_m2,
            heat_loss=assembly.area_m2 / option.r_value,
            tags=option.tags,
        )
        for (assembly, _), option in zip(searched, options)
    ]
