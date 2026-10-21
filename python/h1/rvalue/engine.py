"""
Construction R-values by the isothermal planes method (NZS 4214:2006).

H1/AS1 does not contain this arithmetic. Paragraph 2.1.3.1 a) says construction
R-values for walls, roofs and non-slab floors "shall be determined by ... using
NZS 4214 as modified by Paragraph 2.1.3.2", so the compliance document defers to
the standard and then amends one clause of it. This module is the amended
method; `h1/engine.py` is what consumes the R-values it produces.

The method (NZS 4214 clause 5.7.1) is a parallel-conductance average across the
part of the construction where framing bridges the insulation, wrapped in a
plain series sum of everything else:

    within the bridged portion, per region x with area fraction f_x:
        1/Rb = f1/R1 + f2/R2 + ...          (Eq. 5)
        Rb   = 1 / (1/Rb)                   (Eq. 6)
    then over the whole construction:
        RT   = Rsi + R1 + R2 + ... + Rn + Rse   (Eq. 10)

Why that shape matters to anything reading this: a bridged portion has TWO heat
paths in parallel — through the timber and through the insulation beside it —
and they cannot be collapsed into one "effective R after N% framing" number
before the parallel average is taken. Any interface that shows a single column
of layers is describing a calculation this standard does not perform.

NOT in this module, deliberately:

  * **The tables.** Surface resistances, air-space resistances and material
    conductivities live in NZS 4214 Appendix E, whose copyright notice forbids
    reproducing any part without written permission from Standards New Zealand.
    So the numbers arrive as arguments and the caller supplies them from a data
    file it loads — see `data/nzs4214.schema.yaml` for the shape and why the
    committed copy is empty. Implementing a published method is not the same as
    republishing its data.
  * **Metal framing (clause 5.7.4).** The "enclosing equivalent solid rectangle"
    needs Equations 7-9, which are typeset as stacked fractions that do not
    survive text extraction unambiguously. Worked example F3 would settle the
    symbol assignment, but a compliance calculation is not the place to ship a
    reading reverse-engineered from one example. Timber framing is exact here;
    steel is not yet supported and says so rather than guessing.
  * **Where the bridged portion starts and ends.** H1/AS1 2.1.3.2 replaces
    NZS 4214 clause 5.7.1 a) with a longer rule about which adjacent layers get
    pulled into the bridged portion. The caller states the structure. `cross`
    covers the case roofs hit — two adjacent framed layers whose members cross
    — but nothing yet derives the grouping from a flat layer list.

On precision: worked example F1 states RT = 1.69, and that answer depends on the
*inputs* being the two-decimal values the example prints (f = 0.849, timber
R = 0.78). Recompute those from the geometry and conductivity instead
(0.849469 and 0.7833) and the same wall gives 1.6958, which presents as 1.70.
Neither is a different method; the gap is where you round. The engine keeps full
precision and also reports `total_r_as_printed`, the sum a hand calculation
following the standard's two-decimal presentation would reach, so a 0.01
disagreement with someone else's tool can be recognised rather than argued about.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Sequence, Tuple, Union

FRACTION_TOLERANCE = 1e-6


class RValueError(ValueError):
    """The construction is not something the isothermal planes method can evaluate."""


@dataclass(frozen=True)
class Layer:
    """One homogeneous layer. `r_value` in m²·K/W."""

    name: str
    r_value: float

    @classmethod
    def of_material(cls, name: str, thickness_mm: float, conductivity: float) -> "Layer":
        """R = thickness / conductivity, with thickness in mm for the caller's sake."""
        if thickness_mm <= 0:
            raise RValueError(f"{name}: thickness must be positive, got {thickness_mm}")
        if conductivity <= 0:
            raise RValueError(f"{name}: conductivity must be positive, got {conductivity}")
        return cls(name, (thickness_mm / 1000.0) / conductivity)


@dataclass(frozen=True)
class Region:
    """One heat path through a bridged portion — the timber, or the insulation beside it.

    `fraction` is f_x: the share of the cross-section at right angles to the heat
    flow that this path occupies.
    """

    name: str
    fraction: float
    layers: Tuple[Layer, ...]


@dataclass(frozen=True)
class Bridged:
    """A portion of the construction where framing bridges the layers within it."""

    name: str
    regions: Tuple[Region, ...]


Element = Union[Layer, Bridged]


@dataclass(frozen=True)
class Construction:
    """A construction, listed outside to inside, between its two surface films."""

    name: str
    outside_surface_r: float
    inside_surface_r: float
    elements: Tuple[Element, ...]


@dataclass(frozen=True)
class RegionResult:
    name: str
    fraction: float
    r_value: float


@dataclass(frozen=True)
class ElementResult:
    name: str
    kind: str  # "surface" | "layer" | "bridged"
    r_value: float
    share: float  # of the total R
    regions: Tuple[RegionResult, ...] = ()


@dataclass(frozen=True)
class Result:
    total_r: float
    total_r_as_printed: float  # contributions rounded to 2 dp first, as the standard prints them
    elements: List[ElementResult] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


def calculate(construction: Construction) -> Result:
    _validate(construction)
    notes: List[str] = []

    contributions: List[Tuple[str, str, float, Tuple[RegionResult, ...]]] = [
        ("Outside surface", "surface", construction.outside_surface_r, ())
    ]
    for element in construction.elements:
        if isinstance(element, Layer):
            contributions.append((element.name, "layer", element.r_value, ()))
        else:
            r_value, regions = _bridged_resistance(element)
            contributions.append((element.name, "bridged", r_value, regions))
    contributions.append(("Inside surface", "surface", construction.inside_surface_r, ()))

    total = sum(r for _, _, r, _ in contributions)
    as_printed = sum(round(r, 2) for _, _, r, _ in contributions)

    if round(total, 2) != round(as_printed, 2):
        notes.append(
            f"Rounding each layer to two decimals first gives R{as_printed:.2f}, against "
            f"R{total:.2f} at full precision. NZS 4214's worked examples present the "
            f"rounded form; quote whichever the checker's tool uses."
        )

    return Result(
        total_r=total,
        total_r_as_printed=as_printed,
        elements=[
            ElementResult(name, kind, r_value, r_value / total if total else 0.0, regions)
            for name, kind, r_value, regions in contributions
        ],
        notes=notes,
    )


def _bridged_resistance(bridged: Bridged) -> Tuple[float, Tuple[RegionResult, ...]]:
    """Equations 5 and 6 — a conductance average weighted by area fraction."""
    regions = []
    conductance = 0.0
    for region in bridged.regions:
        r_value = sum(layer.r_value for layer in region.layers)
        if r_value <= 0:
            raise RValueError(
                f"{bridged.name} / {region.name}: region resistance must be positive"
            )
        conductance += region.fraction / r_value
        regions.append(RegionResult(region.name, region.fraction, r_value))
    return 1.0 / conductance, tuple(regions)


def _validate(construction: Construction) -> None:
    if construction.outside_surface_r <= 0 or construction.inside_surface_r <= 0:
        raise RValueError(f"{construction.name}: surface resistances must be positive")
    if not construction.elements:
        raise RValueError(f"{construction.name}: no layers")

    for element in construction.elements:
        if isinstance(element, Layer):
            if element.r_value <= 0:
                raise RValueError(f"{element.name}: R-value must be positive")
            continue

        if not element.regions:
            raise RValueError(f"{element.name}: a bridged portion needs at least one region")
        if len(element.regions) < 2:
            raise RValueError(
                f"{element.name}: a bridged portion needs the framing path and the path "
                f"beside it — one region means nothing is being bridged"
            )
        for region in element.regions:
            if not 0 < region.fraction <= 1:
                raise RValueError(
                    f"{element.name} / {region.name}: area fraction must be between 0 and 1, "
                    f"got {region.fraction}"
                )
            if not region.layers:
                raise RValueError(f"{element.name} / {region.name}: no layers")

        total = sum(region.fraction for region in element.regions)
        if abs(total - 1.0) > FRACTION_TOLERANCE:
            raise RValueError(
                f"{element.name}: area fractions sum to {total:g}, not 1 — every part of "
                f"the cross-section belongs to exactly one region"
            )


def framing_fraction(
    *,
    stud_width_mm: float,
    stud_spacing_mm: float,
    panel_height_mm: float,
    horizontal_members: int,
) -> float:
    """The framing area fraction of a stud panel, as worked example F1 computes it.

    Counts one stud per spacing plus `horizontal_members` full-width plates and
    dwangs. This is a clear panel: it does not include the extra framing at
    corners, junctions, lintels or around openings, which is why H1/AS1
    2.1.3.1 a) i) requires 38% to be assumed for framed walls unless a lower
    fraction "can be demonstrated" for the actual building — a clear-panel
    figure is not that demonstration on its own.
    """
    for value, label in (
        (stud_width_mm, "stud_width_mm"),
        (stud_spacing_mm, "stud_spacing_mm"),
        (panel_height_mm, "panel_height_mm"),
    ):
        if value <= 0:
            raise RValueError(f"{label} must be positive, got {value}")
    if horizontal_members < 0:
        raise RValueError(f"horizontal_members cannot be negative, got {horizontal_members}")

    cavity_width = stud_spacing_mm - stud_width_mm
    cavity_height = panel_height_mm - horizontal_members * stud_width_mm
    if cavity_width <= 0 or cavity_height <= 0:
        raise RValueError("The framing leaves no cavity — check the widths and spacing")

    cavity_fraction = (cavity_width * cavity_height) / (stud_spacing_mm * panel_height_mm)
    return 1.0 - cavity_fraction


def member_fraction(member_width_mm: float, spacing_mm: float) -> float:
    """Area fraction of a one-way array of members: width over spacing.

    45 mm chords at 900 mm centres are 5.0%; 45 mm battens at 600 mm are 7.5%.
    End members and blocking are not counted — for walls, where they matter,
    use `framing_fraction` and remember H1/AS1 2.1.3.1 a) i).
    """
    if member_width_mm <= 0:
        raise RValueError(f"member_width_mm must be positive, got {member_width_mm}")
    if spacing_mm <= member_width_mm:
        raise RValueError(
            f"spacing_mm ({spacing_mm}) must exceed member_width_mm ({member_width_mm})"
        )
    return member_width_mm / spacing_mm


@dataclass(frozen=True)
class FramedLayer:
    """One layer of parallel members and the cavity between them."""

    frame_name: str
    frame_fraction: float
    frame_layers: Tuple[Layer, ...]
    cavity_name: str
    cavity_layers: Tuple[Layer, ...]


def cross(
    first: FramedLayer, second: FramedLayer, shared_layers: Tuple[Layer, ...] = ()
) -> Tuple[Region, ...]:
    """The four heat paths through two adjacent framed layers whose members cross.

    H1/AS1 2.1.3.2 puts immediately adjacent bridged layers into ONE bridged
    portion — truss bottom chords with ceiling battens fixed straight to their
    underside, for instance. Modelling them as two portions in series places an
    isothermal plane between them that the rule does not allow, and understates
    the result. In plan the members form a grid, so the regions are the four
    combinations and each area fraction is the product of the two.

    `shared_layers` are homogeneous layers that sit inside the bridged portion
    and so lie on every path — 2.1.3.2 (i) pulls an adjoining insulation layer
    or air cavity (a roof space, a blanket laid over the chords) into the
    portion rather than leaving it in series outside.
    """
    for layer in (first, second):
        if not 0 < layer.frame_fraction < 1:
            raise RValueError(
                f"{layer.frame_name}: frame_fraction must be between 0 and 1, "
                f"got {layer.frame_fraction}"
            )

    def paths(layer: FramedLayer):
        return (
            (layer.frame_name, layer.frame_fraction, layer.frame_layers),
            (layer.cavity_name, 1.0 - layer.frame_fraction, layer.cavity_layers),
        )

    return tuple(
        Region(
            f"{a_name} × {b_name}",
            a_fraction * b_fraction,
            tuple(shared_layers) + a_layers + b_layers,
        )
        for a_name, a_fraction, a_layers in paths(first)
        for b_name, b_fraction, b_layers in paths(second)
    )


@dataclass(frozen=True)
class BlanketSplit:
    """A bulk insulation layer divided at the top of the framing it sits in."""

    within: Layer                 # the part between the members — one path of the bridged portion
    above: Optional[Layer]        # the part lying over them — shared by every path
    residual_cavity_mm: float     # unfilled depth left beside the members, if any
    note: str


def split_over_framing(
    name: str, r_value: float, thickness_mm: float, framing_depth_mm: float
) -> BlanketSplit:
    """Divide a blanket between the framing cavity and what lies over the top.

    A 175 mm blanket in 90 mm chords is not 175 mm of insulation beside 90 mm of
    timber — the isothermal planes are cut at fixed depths, so the two paths have
    to describe the same thickness. Only what fits between the members is in the
    bridged portion; the rest lies continuously over the framing and, per H1/AS1
    2.1.3.2 (i), joins the portion as a layer on every path. Pass it as
    `shared_layers` to `cross`.

    R is apportioned by thickness, which holds for a bulk blanket at one
    conductivity. It does not hold for insulation compressed to fit — if the
    product is squeezed into a shallower cavity, its declared R no longer
    applies and the manufacturer's compressed figure is the one to enter.

    A blanket shallower than the framing leaves a cavity beside the members that
    this does not resolve into a layer: an unfilled air space has its own
    resistance from Table E3, which depends on its width and the emittance of
    its surfaces. `residual_cavity_mm` says how much, so the caller can say so
    rather than quietly pretending the cavity is not there.
    """
    if r_value <= 0:
        raise RValueError(f"{name}: R-value must be positive, got {r_value}")
    if thickness_mm <= 0:
        raise RValueError(f"{name}: thickness must be positive, got {thickness_mm}")
    if framing_depth_mm <= 0:
        raise RValueError(f"{name}: framing depth must be positive, got {framing_depth_mm}")

    r_per_mm = r_value / thickness_mm
    within_mm = min(thickness_mm, framing_depth_mm)
    above_mm = thickness_mm - within_mm
    residual = max(0.0, framing_depth_mm - thickness_mm)

    if above_mm > 0:
        note = (
            f"{above_mm:g} mm of the {thickness_mm:g} mm blanket lies over the framing and "
            f"is shared by every path; {within_mm:g} mm sits between the members."
        )
    elif residual > 0:
        note = (
            f"The {thickness_mm:g} mm blanket leaves {residual:g} mm of cavity beside the "
            f"{framing_depth_mm:g} mm members. That air space has its own resistance — add it "
            f"to this path rather than leaving the depth unaccounted for."
        )
    else:
        note = "The blanket exactly fills the framing depth."

    return BlanketSplit(
        within=Layer(f"{name} (between members)", r_per_mm * within_mm),
        above=Layer(f"{name} (over framing)", r_per_mm * above_mm) if above_mm > 0 else None,
        residual_cavity_mm=residual,
        note=note,
    )
