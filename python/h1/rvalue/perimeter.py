"""
How much depth the eaves actually leaves for insulation.

At the wall line a pitched roof gives the ceiling almost no room: the rafter or
top chord sits on the plate and the roof only climbs away from it as you move
inward. Insulation laid to its nominal thickness is therefore squeezed over a
strip at the perimeter, and that strip is where a roof's R-value fails while the
middle of it looks fine.

This module computes the geometry and stops there:

    depth at the wall   = bottom chord depth + rafter depth / cos(pitch)
                          + raised heel - ventilation
    depth x mm inward   = that + x * tan(pitch)

The rafter's vertical depth is its perpendicular depth over cos(pitch), which is
why a 90 mm rafter at 20 degrees leaves 95.8 mm at the plate rather than 90.
That vertical depth plus any raise is what BRANZ calls the heel height, measured
from the top of the bottom chord. Where the lower layer lies between the bottom
chords the blanket starts at their underside, so their depth is available too.

What it deliberately does NOT do is convert compression into an R-value. The
relationship between how far a blanket is squashed and what it then delivers is
the insulation manufacturer's figure for that product; the industry calculator
that models it is published under a notice forbidding its algorithms from being
copied. Geometry is trigonometry and belongs to nobody. The reduction does not,
so it is asked for rather than inferred.

H1/AS1 is what makes the strip worth computing: Table 2.1.2.12 note 4 allows the
roof to fall to R3.3 for up to 500 mm in from the ceiling perimeter where space
restricts full-thickness insulation, and 2.1.2.11 a) holds every part of the
roof at R2.6 or better, the perimeter included.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional

from h1.rvalue.engine import RValueError


@dataclass(frozen=True)
class PerimeterDepth:
    at_wall_mm: float
    at_strip_edge_mm: float
    full_depth_from_mm: Optional[float]  # distance inward where the blanket stops being squashed
    compressed_width_mm: float           # how much of the strip is squashed
    strip_width_mm: float
    notes: List[str] = field(default_factory=list)


def perimeter_depth(
    *,
    roof_pitch_deg: float,
    rafter_depth_mm: float,
    insulation_thickness_mm: float,
    strip_width_mm: float = 500.0,
    raised_heel_mm: float = 0.0,
    ventilation_gap_mm: float = 0.0,
    bottom_chord_depth_mm: float = 0.0,
) -> PerimeterDepth:
    """Available depth across the eaves strip. Geometry only — no R-values.

    `ventilation_gap_mm` is subtracted from the available depth. Whether the
    vent path takes room at the wall line depends on the detail — a roll vent
    over the plate does not eat the same space a clear gap does — so it is an
    input rather than an assumption, and defaults to nothing being taken.

    `bottom_chord_depth_mm` is the depth of the framing the insulation lies
    between; leave it at 0 when the blanket sits on top of the bottom chord.
    """
    if not 0 <= roof_pitch_deg < 90:
        raise RValueError(f"roof_pitch_deg must be between 0 and 90, got {roof_pitch_deg}")
    for value, label in (
        (rafter_depth_mm, "rafter_depth_mm"),
        (insulation_thickness_mm, "insulation_thickness_mm"),
        (strip_width_mm, "strip_width_mm"),
    ):
        if value <= 0:
            raise RValueError(f"{label} must be positive, got {value}")
    for value, label in ((raised_heel_mm, "raised_heel_mm"), (ventilation_gap_mm, "ventilation_gap_mm"),
                         (bottom_chord_depth_mm, "bottom_chord_depth_mm")):
        if value < 0:
            raise RValueError(f"{label} cannot be negative, got {value}")

    pitch = math.radians(roof_pitch_deg)
    at_wall = (bottom_chord_depth_mm + rafter_depth_mm / math.cos(pitch)
               + raised_heel_mm - ventilation_gap_mm)
    if at_wall <= 0:
        raise RValueError(
            f"The ventilation gap leaves no depth at the wall "
            f"({at_wall:.1f} mm) — check the heel and the vent detail"
        )

    rise = math.tan(pitch)
    at_edge = at_wall + strip_width_mm * rise
    notes: List[str] = []

    if at_wall >= insulation_thickness_mm:
        full_from: Optional[float] = 0.0
        compressed = 0.0
        notes.append(
            f"{insulation_thickness_mm:g} mm fits at the wall line — the perimeter is not "
            f"squashed at this pitch and heel."
        )
    elif rise == 0:
        full_from = None
        compressed = strip_width_mm
        notes.append(
            "A flat roof never gains depth away from the wall, so the whole strip is "
            "squashed to the same degree."
        )
    else:
        full_from = (insulation_thickness_mm - at_wall) / rise
        compressed = min(full_from, strip_width_mm)
        if full_from > strip_width_mm:
            notes.append(
                f"The blanket is still squashed at the edge of the {strip_width_mm:g} mm strip; "
                f"it reaches full thickness {full_from:.0f} mm in from the wall."
            )
        else:
            notes.append(
                f"Squashed over the first {compressed:.0f} mm of the "
                f"{strip_width_mm:g} mm strip."
            )

    if compressed > 0:
        notes.append(
            "What that compression does to the R-value is the insulation manufacturer's "
            "figure for this product at this thickness — enter it rather than inferring one."
        )

    return PerimeterDepth(
        at_wall_mm=at_wall,
        at_strip_edge_mm=at_edge,
        full_depth_from_mm=full_from,
        compressed_width_mm=compressed,
        strip_width_mm=strip_width_mm,
        notes=notes,
    )
