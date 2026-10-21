"""
Construction R-values of slab-on-ground floors — H1/AS1 6th edition, Appendix E.

A slab is not a build-up of layers the way a wall or roof is. Most of its heat
goes out through the ground at the edge, so its R-value depends on the shape of
the floor far more than on what it is made of: the tables are indexed by the
slab's area-to-perimeter ratio and by how thick the external walls sitting on it
are. A compact house earns a much better slab than a long thin one with the same
concrete.

Insulation is fixed by the tables, not chosen freely: vertical edge R1.0, and
underslab R1.2 or R2.4 as a 1.2 m strip along the perimeter or as full cover.
A product is credited with the highest of those it meets (`underslab_credit`);
anything beyond R2.4 needs the H1/VM1 Appendix E calculation (E.1.1.1 b).

Foundation insulation is disruptive to build, so the optimiser treats every
insulated arrangement as a last resort — see `optimise.LAST_RESORT_TAG`.
"""
from __future__ import annotations

import bisect
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import yaml

from h1.tables import TableError

DATA = Path(__file__).parent / "data" / "h1_as1_6th_slab.yaml"
PRODUCTS = Path(__file__).parent / "data" / "floor_insulation_products.yaml"

FOUNDATIONS = ("slab", "raft")
UNDERSLAB = ("none", "strip_1.2", "strip_2.4", "full_1.2", "full_2.4")
UNDERSLAB_TABLE_R = (1.2, 2.4)
EDGE_TABLE_R = 1.0

Key = Tuple[str, bool, str, bool]  # foundation, edge insulation, underslab, masonry veneer


@dataclass(frozen=True)
class SlabTables:
    verified: bool
    bands_mm: Tuple[float, ...]
    ratios: Tuple[float, ...]
    tables: Dict[Key, Tuple[Tuple[float, ...], ...]]


@dataclass(frozen=True)
class Rung:
    foundation: str
    edge_insulation: bool
    underslab: str
    r_value: float

    @property
    def insulated(self) -> bool:
        return self.edge_insulation or self.underslab != "none"


def load(path: Path = DATA) -> SlabTables:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    bands = tuple(float(b) for b in raw["wall_thickness_bands_mm"])
    ratios = tuple(float(x) for x in raw["area_to_perimeter_ratios"])
    tables: Dict[Key, Tuple[Tuple[float, ...], ...]] = {}
    for letter, t in raw["tables"].items():
        rows = tuple(tuple(float(v) for v in row) for row in t["r_values"])
        if len(rows) != len(ratios) or any(len(row) != len(bands) for row in rows):
            raise TableError(f"Table E.1.2.1{letter}: expected {len(ratios)} rows of {len(bands)}")
        if t["foundation"] not in FOUNDATIONS or t["underslab"] not in UNDERSLAB:
            raise TableError(f"Table E.1.2.1{letter}: unknown foundation or underslab")
        key = (t["foundation"], bool(t["edge_insulation"]), t["underslab"], bool(t["masonry_veneer"]))
        if key in tables:
            raise TableError(f"Table E.1.2.1{letter} duplicates another table's scenario")
        tables[key] = rows
    return SlabTables(bool(raw.get("verified")), bands, ratios, tables)


def area_to_perimeter(area_m2: float, perimeter_m: float, *, external: bool = False,
                      w_m: float = 0.0) -> float:
    """Paragraph E.1.2.2: Equation E.1 (internal) or E.2 (external, less w / 2)."""
    if area_m2 <= 0 or perimeter_m <= 0:
        raise TableError("Slab area and perimeter must both be positive")
    ratio = area_m2 / perimeter_m
    return ratio - w_m / 2 if external else ratio


def construction_r(
    t: SlabTables,
    *,
    ratio: float,
    wall_thickness_mm: float,
    masonry_veneer: bool,
    foundation: str = "slab",
    edge_insulation: bool = False,
    underslab: str = "none",
) -> float:
    """One table cell. The ratio takes the nearest smaller row (every table's note)."""
    if foundation not in FOUNDATIONS:
        raise TableError(f"foundation must be one of {FOUNDATIONS}, got {foundation!r}")
    if underslab not in UNDERSLAB:
        raise TableError(f"underslab must be one of {UNDERSLAB}, got {underslab!r}")
    if foundation == "raft" and underslab != "none":
        raise TableError("The raft tables (E.1.2.1A-D) have no underslab insulation option")

    row = bisect.bisect_right(t.ratios, ratio) - 1
    if row < 0:
        raise TableError(
            f"A slab area-to-perimeter ratio of {ratio:.2f} is below the tables' first row "
            f"({t.ratios[0]:g}); use the H1/VM1 Appendix E calculation instead"
        )
    column = bisect.bisect_right(t.bands_mm, wall_thickness_mm) - 1
    if column < 0:
        raise TableError(
            f"Effective wall thickness {wall_thickness_mm:g} mm is thinner than the tables' "
            f"90 mm minimum"
        )
    return t.tables[(foundation, edge_insulation, underslab, masonry_veneer)][row][column]


def combine(parts: Sequence[Tuple[float, float]]) -> float:
    """Equations E.3-E.5: weight 1/R by each part's share of the slab perimeter."""
    if abs(sum(share for share, _ in parts) - 1.0) > 1e-6:
        raise TableError("The shares of the slab perimeter must add up to 1")
    return 1.0 / sum(share / r for share, r in parts if share > 0)


def underslab_credit(product_r: float) -> Optional[float]:
    """The highest underslab R the tables recognise that this product meets."""
    met = [r for r in UNDERSLAB_TABLE_R if product_r >= r]
    return max(met) if met else None


@dataclass(frozen=True)
class UnderslabProduct:
    brand: str
    product: str
    thickness_mm: float
    r_value: float
    credited: Optional[float]      # the table R it earns, or None
    thinnest_for_credit: bool      # False: a thinner board of this product earns the same


def underslab_products(path: Path = PRODUCTS) -> List[UnderslabProduct]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    out: List[UnderslabProduct] = []
    for product in raw.get("underslab") or []:
        seen = set()
        for size in sorted(product["thicknesses"], key=lambda s: s["thickness_mm"]):
            credited = underslab_credit(float(size["r_value"]))
            out.append(UnderslabProduct(
                product["brand"], product["product"], float(size["thickness_mm"]),
                float(size["r_value"]), credited, credited is not None and credited not in seen))
            seen.add(credited)
    return out


def ladder(t: SlabTables, *, ratio: float, wall_thickness_mm: float, masonry_veneer: bool,
           foundation: str = "slab") -> List[Rung]:
    """Every insulation arrangement the tables offer for this geometry, uninsulated first."""
    underslabs = UNDERSLAB if foundation == "slab" else ("none",)
    rungs = [
        Rung(foundation, edge, underslab, construction_r(
            t, ratio=ratio, wall_thickness_mm=wall_thickness_mm, masonry_veneer=masonry_veneer,
            foundation=foundation, edge_insulation=edge, underslab=underslab))
        for edge in (False, True)
        for underslab in underslabs
    ]
    return sorted(rungs, key=lambda rung: (rung.insulated, rung.r_value))
