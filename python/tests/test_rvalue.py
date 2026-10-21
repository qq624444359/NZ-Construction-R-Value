"""Conformance tests for the isothermal planes method (NZS 4214:2006 clause 5.7).

The load-bearing tests reproduce worked example F1 from the standard's Appendix F.
An implementation of a published method is only worth anything if it returns the
published answer, and F1 is the only independent check available — everything
else here would be the implementation agreeing with itself.

Inputs and expected results are cited to the clause they come from, and are the
minimum needed to verify conformance. The standard's tables are not reproduced
anywhere in this repository; see `h1/rvalue/data/nzs4214.schema.yaml`.
"""
import pytest

from h1.rvalue.engine import (
    Bridged,
    Construction,
    Layer,
    Region,
    RValueError,
    calculate,
    framing_fraction,
)

# NZS 4214:2006 Appendix F1 — timber framed wall. 6 mm fibre-cement over 94 mm
# framing at 600 mm centres with R1.8 insulation between, 10 mm plasterboard
# lining, 2.4 m high. Timber conductivity 0.12 W/mK.
TIMBER_CONDUCTIVITY = 0.12
FRAMING_DEPTH_MM = 94.0
FRAMING_WIDTH_MM = 47.0


def f1_wall(frame_fraction: float, frame_r: float) -> Construction:
    return Construction(
        name="F1 timber framed wall",
        outside_surface_r=0.03,
        inside_surface_r=0.09,
        elements=(
            Layer("6 mm fibre-cement", 0.03),
            Bridged(
                "Framing and insulation",
                regions=(
                    Region("Insulation", 1.0 - frame_fraction, (Layer("R1.8 insulation", 1.80),)),
                    Region("Timber framing", frame_fraction, (Layer("94 mm timber", frame_r),)),
                ),
            ),
            Layer("10 mm plasterboard", 0.04),
        ),
    )


def test_f1_reproduces_the_standards_published_answer():
    """Appendix F1 states RT = 1.69, using the intermediates it prints."""
    wall = f1_wall(frame_fraction=0.151, frame_r=0.78)

    result = calculate(wall)

    assert result.total_r_as_printed == pytest.approx(1.69, abs=0.005)


def test_f1_at_full_precision_lands_within_a_hundredth_of_the_published_answer():
    """F1's 1.69 depends on its printed inputs, not on a different method.

    Recompute the area fraction from the panel geometry and the timber resistance
    from thickness over conductivity, and the same wall gives 1.6958 — a
    hundredth above the published figure, and it presents as 1.70. Worth knowing
    before someone treats a 0.01 difference as a mistake.
    """
    frame_r = (FRAMING_DEPTH_MM / 1000) / TIMBER_CONDUCTIVITY  # 0.7833…
    frame_fraction = framing_fraction(
        stud_width_mm=FRAMING_WIDTH_MM, stud_spacing_mm=600.0,
        panel_height_mm=2400.0, horizontal_members=4,
    )

    result = calculate(f1_wall(frame_fraction=frame_fraction, frame_r=frame_r))

    assert result.total_r == pytest.approx(1.6958, abs=0.001)
    assert abs(result.total_r - 1.69) < 0.01
    assert round(result.total_r, 2) == 1.70


def test_the_two_totals_agree_unless_rounding_actually_accumulates():
    """`total_r_as_printed` is the hand-calculation figure, not a second method."""
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    assert result.total_r_as_printed == pytest.approx(result.total_r, abs=0.005)
    assert result.notes == []


def test_f1_bridged_portion_matches_the_worked_intermediate():
    """The standard shows 1/Rb = 0.665 and Rb = 1.50 for this layer."""
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    bridged = next(e for e in result.elements if e.kind == "bridged")
    assert bridged.r_value == pytest.approx(1.503, abs=0.005)
    assert 1 / bridged.r_value == pytest.approx(0.665, abs=0.001)


def test_the_framing_path_and_the_insulation_path_are_both_reported():
    """A bridged portion has two parallel heat paths; collapsing them loses the method."""
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    bridged = next(e for e in result.elements if e.kind == "bridged")
    by_name = {r.name: r for r in bridged.regions}
    assert by_name["Timber framing"].fraction == pytest.approx(0.151)
    assert by_name["Timber framing"].r_value == pytest.approx(0.78)
    assert by_name["Insulation"].fraction == pytest.approx(0.849)
    assert by_name["Insulation"].r_value == pytest.approx(1.80)


def test_the_parallel_average_is_not_the_area_weighted_mean_of_the_resistances():
    """Conductances add, not resistances — getting this backwards flatters the wall."""
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    bridged = next(e for e in result.elements if e.kind == "bridged")
    naive_mean = 0.151 * 0.78 + 0.849 * 1.80
    assert naive_mean == pytest.approx(1.646, abs=0.005)
    assert bridged.r_value < naive_mean  # 1.50, not 1.65


def test_a_layer_can_be_built_from_thickness_and_conductivity():
    layer = Layer.of_material("94 mm timber", FRAMING_DEPTH_MM, TIMBER_CONDUCTIVITY)

    assert layer.r_value == pytest.approx(0.7833, abs=0.0001)


def test_surface_films_are_part_of_the_total():
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    surfaces = [e for e in result.elements if e.kind == "surface"]
    assert [e.r_value for e in surfaces] == [0.03, 0.09]
    assert sum(e.r_value for e in result.elements) == pytest.approx(result.total_r)


def test_shares_of_the_total_add_up():
    result = calculate(f1_wall(frame_fraction=0.151, frame_r=0.78))

    assert sum(e.share for e in result.elements) == pytest.approx(1.0)


# ── framing fraction ────────────────────────────────────────────────────────

def test_framing_fraction_matches_the_f1_panel():
    """F1: 600 mm centres, 47 mm framing, 2.4 m high, four horizontal members."""
    fraction = framing_fraction(
        stud_width_mm=FRAMING_WIDTH_MM,
        stud_spacing_mm=600.0,
        panel_height_mm=2400.0,
        horizontal_members=4,
    )

    assert fraction == pytest.approx(1 - 0.849469, abs=0.0001)


def test_a_clear_panel_falls_well_under_the_38_percent_h1_assumes():
    """Which is exactly why 2.1.3.1 a) i) does not let you use it unargued."""
    fraction = framing_fraction(
        stud_width_mm=FRAMING_WIDTH_MM, stud_spacing_mm=600.0,
        panel_height_mm=2400.0, horizontal_members=4,
    )

    assert fraction < 0.38


def test_closer_stud_spacing_means_more_framing():
    tight = framing_fraction(stud_width_mm=47.0, stud_spacing_mm=400.0,
                             panel_height_mm=2400.0, horizontal_members=4)
    loose = framing_fraction(stud_width_mm=47.0, stud_spacing_mm=600.0,
                             panel_height_mm=2400.0, horizontal_members=4)

    assert tight > loose


@pytest.mark.parametrize(
    "kwargs, message",
    [
        ({"stud_width_mm": 0.0}, "stud_width_mm must be positive"),
        ({"stud_spacing_mm": -1.0}, "stud_spacing_mm must be positive"),
        ({"panel_height_mm": 0.0}, "panel_height_mm must be positive"),
        ({"horizontal_members": -1}, "cannot be negative"),
        ({"stud_spacing_mm": 47.0}, "leaves no cavity"),
    ],
)
def test_bad_framing_geometry_is_rejected(kwargs, message):
    call = {"stud_width_mm": 47.0, "stud_spacing_mm": 600.0,
            "panel_height_mm": 2400.0, "horizontal_members": 4, **kwargs}
    with pytest.raises(RValueError, match=message):
        framing_fraction(**call)


# ── input validation ────────────────────────────────────────────────────────

def one_region_bridged():
    return Bridged("Framing", regions=(Region("Timber", 1.0, (Layer("timber", 0.78),)),))


@pytest.mark.parametrize(
    "elements, outside_r, inside_r, message",
    [
        ((), 0.03, 0.09, "no layers"),
        ((Layer("x", 0.0),), 0.03, 0.09, "R-value must be positive"),
        ((Layer("x", 0.1),), 0.0, 0.09, "surface resistances must be positive"),
        ((Layer("x", 0.1),), 0.03, -0.09, "surface resistances must be positive"),
        ((one_region_bridged(),), 0.03, 0.09, "one region means nothing is being bridged"),
    ],
)
def test_bad_constructions_are_rejected(elements, outside_r, inside_r, message):
    with pytest.raises(RValueError, match=message):
        calculate(Construction("test", outside_r, inside_r, elements))


def test_area_fractions_that_do_not_cover_the_cross_section_are_rejected():
    wall = Construction(
        "test", 0.03, 0.09,
        (Bridged("Framing", regions=(
            Region("Timber", 0.15, (Layer("timber", 0.78),)),
            Region("Insulation", 0.75, (Layer("insulation", 1.8),)),  # sums to 0.90
        )),),
    )

    with pytest.raises(RValueError, match="sum to 0.9, not 1"):
        calculate(wall)


def test_a_region_needs_layers():
    wall = Construction(
        "test", 0.03, 0.09,
        (Bridged("Framing", regions=(
            Region("Timber", 0.15, (Layer("timber", 0.78),)),
            Region("Empty", 0.85, ()),
        )),),
    )

    with pytest.raises(RValueError, match="no layers"):
        calculate(wall)


def test_the_shipped_data_file_is_a_schema_and_stays_empty():
    """Appendix E's tables must not enter this repository. See the file's header."""
    from pathlib import Path

    import yaml

    from h1.rvalue import engine

    path = Path(engine.__file__).parent / "data" / "nzs4214.schema.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    assert raw["verified"] is False
    for section in ("surface_resistance", "air_space_resistance", "emittance",
                    "materials", "subfloor_resistance", "slab_on_ground"):
        assert section in raw, section
    assert raw["materials"] == {}, (
        "The schema file now carries material data. NZS 4214 Appendix E may not be "
        "reproduced here — put real values in nzs4214.local.yaml, which is gitignored."
    )


# ── crossed framing: truss chords with battens fixed beneath ────────────────
# R-values below are synthetic round numbers chosen to exercise the method.
# They are not NZS 4214 Appendix E data.

from h1.rvalue.engine import FramedLayer, cross, member_fraction

CHORDS = FramedLayer("Chord", 0.05, (Layer("chord", 1.0),), "Insulation", (Layer("insulation", 4.0),))
BATTENS = FramedLayer("Batten", 0.075, (Layer("batten", 0.4),), "Cavity", (Layer("cavity", 0.2),))


@pytest.mark.parametrize("width, spacing, expected", [(45, 900, 0.05), (45, 600, 0.075)])
def test_member_fraction_is_width_over_spacing(width, spacing, expected):
    assert member_fraction(width, spacing) == pytest.approx(expected)


@pytest.mark.parametrize("width, spacing, message", [
    (0, 900, "member_width_mm must be positive"),
    (45, 45, "must exceed member_width_mm"),
])
def test_bad_member_geometry_is_rejected(width, spacing, message):
    with pytest.raises(RValueError, match=message):
        member_fraction(width, spacing)


def test_crossing_two_framed_layers_gives_four_paths_covering_the_plan():
    regions = cross(CHORDS, BATTENS)

    assert [r.name for r in regions] == [
        "Chord × Batten", "Chord × Cavity", "Insulation × Batten", "Insulation × Cavity",
    ]
    assert sum(r.fraction for r in regions) == pytest.approx(1.0)
    assert regions[0].fraction == pytest.approx(0.05 * 0.075)


def test_each_path_carries_the_layers_it_actually_passes_through():
    by_name = {r.name: r for r in cross(CHORDS, BATTENS)}

    assert [l.name for l in by_name["Chord × Cavity"].layers] == ["chord", "cavity"]
    assert [l.name for l in by_name["Insulation × Batten"].layers] == ["insulation", "batten"]


def test_adjacent_layers_as_one_portion_beat_two_portions_in_series():
    """H1/AS1 2.1.3.2: adjacent bridged layers are one portion. Splitting understates."""
    one = calculate(Construction("one", 0.01, 0.01, (Bridged("crossed", cross(CHORDS, BATTENS)),)))
    two = calculate(Construction("two", 0.01, 0.01, (
        Bridged("chords", (Region("chord", 0.05, (Layer("c", 1.0),)),
                           Region("ins", 0.95, (Layer("i", 4.0),)))),
        Bridged("battens", (Region("batten", 0.075, (Layer("b", 0.4),)),
                            Region("cav", 0.925, (Layer("v", 0.2),)))),
    )))

    assert one.total_r - 0.02 == pytest.approx(3.7504, abs=0.0005)
    assert two.total_r - 0.02 == pytest.approx(3.6861, abs=0.0005)
    assert one.total_r > two.total_r


def test_shared_layers_sit_on_every_path():
    """2.1.3.2 (i): an adjoining air cavity or insulation layer joins the portion."""
    regions = cross(CHORDS, BATTENS, shared_layers=(Layer("roof space", 0.3),))

    assert all(r.layers[0].name == "roof space" for r in regions)


def test_a_shared_layer_inside_the_portion_is_not_the_same_as_one_outside_it():
    inside = calculate(Construction("in", 0.01, 0.01, (
        Bridged("crossed", cross(CHORDS, BATTENS, shared_layers=(Layer("roof space", 0.3),))),
    )))
    outside = calculate(Construction("out", 0.01, 0.01, (
        Layer("roof space", 0.3), Bridged("crossed", cross(CHORDS, BATTENS)),
    )))

    assert inside.total_r != pytest.approx(outside.total_r, abs=1e-6)


@pytest.mark.parametrize("fraction", [0.0, 1.0, -0.1])
def test_a_framed_layer_needs_both_members_and_a_cavity(fraction):
    bad = FramedLayer("Chord", fraction, (Layer("c", 1.0),), "Ins", (Layer("i", 4.0),))
    with pytest.raises(RValueError, match="frame_fraction must be between 0 and 1"):
        cross(bad, BATTENS)


# ── blanket deeper than the framing it sits in ──────────────────────────────

from h1.rvalue.engine import split_over_framing


def test_a_blanket_deeper_than_the_chords_splits_at_the_top_of_them():
    """175 mm of R3.6 in 90 mm chords: 90 mm between, 85 mm over the top."""
    split = split_over_framing("Ceiling insulation", 3.6, 175.0, 90.0)

    assert split.within.r_value == pytest.approx(3.6 * 90 / 175)
    assert split.above.r_value == pytest.approx(3.6 * 85 / 175)
    assert split.within.r_value + split.above.r_value == pytest.approx(3.6)
    assert split.residual_cavity_mm == 0.0
    assert "85 mm" in split.note


def test_the_two_paths_end_up_describing_the_same_depth():
    """Which is the whole point — isothermal planes are cut at fixed depths."""
    split = split_over_framing("Ceiling insulation", 3.6, 175.0, 90.0)

    timber = Layer.of_material("90 mm chord", 90.0, 0.12)
    regions = cross(
        FramedLayer("Chord", 0.05, (timber,), "Insulation", (split.within,)),
        BATTENS,
        shared_layers=(split.above,),
    )

    assert all(r.layers[0].name.endswith("(over framing)") for r in regions)
    assert sum(r.fraction for r in regions) == pytest.approx(1.0)


def test_leaving_the_blanket_whole_on_one_path_understates_the_roof():
    """The unsplit model pretends nothing covers the timber, so it reads low.

    Conservative, but still wrong: the designer is told to add insulation the
    roof does not need. R3.3422 against R3.7584 on these figures.
    """
    split = split_over_framing("Ceiling insulation", 3.6, 175.0, 90.0)
    timber = (Layer.of_material("90 mm chord", 90.0, 0.12),)

    correct = calculate(Construction("correct", 0.01, 0.01, (
        Bridged("b", cross(FramedLayer("Chord", 0.05, timber, "Insulation", (split.within,)),
                           BATTENS, shared_layers=(split.above,))),
    )))
    naive = calculate(Construction("naive", 0.01, 0.01, (
        Bridged("b", cross(FramedLayer("Chord", 0.05, timber, "Insulation", (Layer("blanket", 3.6),)),
                           BATTENS)),
    )))

    assert correct.total_r == pytest.approx(3.7584, abs=0.001)
    assert naive.total_r == pytest.approx(3.3422, abs=0.001)
    assert naive.total_r < correct.total_r


def test_a_blanket_shallower_than_the_framing_reports_the_cavity_it_leaves():
    split = split_over_framing("Ceiling insulation", 3.6, 140.0, 190.0)

    assert split.above is None
    assert split.within.r_value == pytest.approx(3.6)
    assert split.residual_cavity_mm == pytest.approx(50.0)
    assert "50 mm of cavity" in split.note


def test_a_blanket_that_exactly_fills_says_so():
    split = split_over_framing("Ceiling insulation", 2.2, 90.0, 90.0)

    assert split.above is None
    assert split.residual_cavity_mm == 0.0
    assert split.note == "The blanket exactly fills the framing depth."


@pytest.mark.parametrize("args, message", [
    ((0.0, 175.0, 90.0), "R-value must be positive"),
    ((3.6, 0.0, 90.0), "thickness must be positive"),
    ((3.6, 175.0, 0.0), "framing depth must be positive"),
])
def test_bad_blanket_input_is_rejected(args, message):
    with pytest.raises(RValueError, match=message):
        split_over_framing("Ceiling insulation", *args)
