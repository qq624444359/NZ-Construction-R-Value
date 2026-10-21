"""Tests for the eaves geometry — how much depth is left for insulation there."""
import math

import pytest

from h1.rvalue.engine import RValueError
from h1.rvalue.perimeter import perimeter_depth


def test_a_rafter_leaves_its_vertical_depth_at_the_wall_not_its_own_depth():
    """A 90 mm rafter at 20 degrees stands 95.8 mm tall measured vertically."""
    result = perimeter_depth(
        roof_pitch_deg=20.0, rafter_depth_mm=90.0,
        insulation_thickness_mm=275.0, strip_width_mm=500.0,
    )

    assert result.at_wall_mm == pytest.approx(90.0 / math.cos(math.radians(20)), abs=0.01)
    assert result.at_wall_mm == pytest.approx(95.8, abs=0.05)


def test_the_blanket_reaches_full_thickness_where_the_roof_has_climbed_far_enough():
    result = perimeter_depth(
        roof_pitch_deg=20.0, rafter_depth_mm=90.0,
        insulation_thickness_mm=275.0, strip_width_mm=500.0,
    )

    expected = (275.0 - result.at_wall_mm) / math.tan(math.radians(20))
    assert result.full_depth_from_mm == pytest.approx(expected, abs=0.1)
    assert result.full_depth_from_mm == pytest.approx(492.4, abs=0.5)
    assert result.compressed_width_mm == pytest.approx(492.4, abs=0.5)
    assert result.at_strip_edge_mm > 275.0


def test_raising_the_heel_moves_the_squashed_strip_in():
    flat = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                           insulation_thickness_mm=275.0)
    raised = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                             insulation_thickness_mm=275.0, raised_heel_mm=150.0)

    assert raised.at_wall_mm > flat.at_wall_mm
    assert raised.compressed_width_mm < flat.compressed_width_mm


def test_a_steeper_pitch_shortens_the_squashed_strip():
    shallow = perimeter_depth(roof_pitch_deg=15.0, rafter_depth_mm=90.0,
                              insulation_thickness_mm=275.0)
    steep = perimeter_depth(roof_pitch_deg=35.0, rafter_depth_mm=90.0,
                            insulation_thickness_mm=275.0)

    assert steep.compressed_width_mm < shallow.compressed_width_mm


def test_a_thin_blanket_is_not_squashed_at_all():
    result = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                             insulation_thickness_mm=90.0)

    assert result.compressed_width_mm == 0.0
    assert result.full_depth_from_mm == 0.0
    assert any("fits at the wall line" in n for n in result.notes)
    assert not any("manufacturer" in n for n in result.notes)


def test_a_flat_roof_never_gains_depth():
    result = perimeter_depth(roof_pitch_deg=0.0, rafter_depth_mm=140.0,
                             insulation_thickness_mm=275.0, strip_width_mm=500.0)

    assert result.at_strip_edge_mm == pytest.approx(result.at_wall_mm)
    assert result.full_depth_from_mm is None
    assert result.compressed_width_mm == 500.0
    assert any("flat roof" in n.lower() for n in result.notes)


def test_insulation_between_the_bottom_chords_gains_their_depth():
    """BRANZ: heel height is measured from the TOP of the bottom chord, but the blanket
    starts at its underside, so a 90 mm chord adds 90 mm at the wall."""
    above = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                            insulation_thickness_mm=275.0)
    between = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                              insulation_thickness_mm=275.0, bottom_chord_depth_mm=90.0)

    assert between.at_wall_mm == pytest.approx(above.at_wall_mm + 90.0)
    assert between.at_wall_mm == pytest.approx(185.8, abs=0.05)
    assert between.full_depth_from_mm == pytest.approx((275.0 - 185.77) / math.tan(math.radians(20)), abs=0.5)
    assert between.compressed_width_mm < above.compressed_width_mm


def test_the_ventilation_gap_comes_off_the_available_depth():
    without = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                              insulation_thickness_mm=275.0)
    with_gap = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                               insulation_thickness_mm=275.0, ventilation_gap_mm=25.0)

    assert with_gap.at_wall_mm == pytest.approx(without.at_wall_mm - 25.0)
    assert with_gap.compressed_width_mm > without.compressed_width_mm


def test_compression_always_sends_the_reader_to_the_manufacturer():
    """The reduction is their figure, not something this tool may infer."""
    result = perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                             insulation_thickness_mm=275.0)

    assert any("manufacturer" in n for n in result.notes)


def test_a_vent_gap_that_swallows_the_depth_is_rejected():
    with pytest.raises(RValueError, match="leaves no depth at the wall"):
        perimeter_depth(roof_pitch_deg=20.0, rafter_depth_mm=90.0,
                        insulation_thickness_mm=275.0, ventilation_gap_mm=200.0)


@pytest.mark.parametrize("kwargs, message", [
    ({"roof_pitch_deg": 90.0}, "roof_pitch_deg must be between 0 and 90"),
    ({"roof_pitch_deg": -5.0}, "roof_pitch_deg must be between 0 and 90"),
    ({"rafter_depth_mm": 0.0}, "rafter_depth_mm must be positive"),
    ({"insulation_thickness_mm": 0.0}, "insulation_thickness_mm must be positive"),
    ({"strip_width_mm": 0.0}, "strip_width_mm must be positive"),
    ({"raised_heel_mm": -1.0}, "raised_heel_mm cannot be negative"),
    ({"bottom_chord_depth_mm": -1.0}, "bottom_chord_depth_mm cannot be negative"),
])
def test_bad_geometry_is_rejected(kwargs, message):
    call = {"roof_pitch_deg": 20.0, "rafter_depth_mm": 90.0,
            "insulation_thickness_mm": 275.0, **kwargs}
    with pytest.raises(RValueError, match=message):
        perimeter_depth(**call)
