"""Unit tests for the deterministic H1/AS1 Calculation-method engine.

These run against the shipped H1/AS1 6th edition table rather than a fixture:
the point of most of them is that the engine matches Table 2.1.2.7 and the
paragraphs around it, which a made-up table could not demonstrate.
"""
import pytest

from h1 import tables as tables_module
from h1.engine import Element, calculate
from h1.tables import TableError

TABLES = tables_module.load()

# A plain single-storey house: 100 m² roof, 104 m² gross wall of which 20 m² is
# glazed, on a slab. Insulated at roughly the values the reference building uses.
def house(**overrides):
    elements = {
        "roof": Element("roof", 100.0, 6.6, "ceiling"),
        "wall": Element("wall", 80.0, 2.0, "external wall"),
        "glazing": Element("glazing", 20.0, 0.46, "joinery"),
        "door": Element("opaque_door", 4.0, 1.0, "entry door"),
        "slab": Element("slab_on_ground_floor", 100.0, 1.5, "slab"),
    }
    elements.update(overrides)
    return [el for el in elements.values() if el is not None]


def test_the_reference_building_is_always_30_percent_glazed():
    """Table 2.1.2.7 splits gross wall area 70/30 whatever the proposal does.

    This is the part of the method that is easiest to get wrong — the reference
    building does not copy the proposed glazing ratio.
    """
    modest = calculate(house(), climate_zone=1, tables=TABLES)
    glassy = calculate(
        house(
            wall=Element("wall", 64.0, 2.0, "external wall"),
            glazing=Element("glazing", 36.0, 0.46, "joinery"),
        ),
        climate_zone=1,
        tables=TABLES,
    )

    assert modest.gross_wall_area_m2 == pytest.approx(104.0)
    assert glassy.gross_wall_area_m2 == pytest.approx(104.0)
    assert modest.reference_heat_loss == pytest.approx(glassy.reference_heat_loss)


def test_reference_heat_loss_matches_table_2_1_2_7_for_zone_1():
    result = calculate(house(), climate_zone=1, tables=TABLES)

    expected = (
        100.0 / 6.6              # roof + skylight
        + (104.0 * 0.70) / 1.6   # 70% of gross wall area
        + (104.0 * 0.30) / 0.46  # 30% of gross wall area, glazed
        + 100.0 / 1.5            # slab-on-ground
    )
    assert result.reference_heat_loss == pytest.approx(expected)


def test_proposed_heat_loss_matches_equation_2_1():
    result = calculate(house(), climate_zone=1, tables=TABLES)

    expected = 100.0 / 6.6 + 80.0 / 2.0 + 20.0 / 0.46 + 4.0 / 1.0 + 100.0 / 1.5
    assert result.proposed_heat_loss == pytest.approx(expected)


def test_a_lightly_glazed_house_gains_margin_from_the_30_percent_reference():
    result = calculate(house(), climate_zone=1, tables=TABLES)

    assert result.wall_glazing_fraction == pytest.approx(20.0 / 104.0)
    assert result.complies is True
    assert result.margin > 0


def test_a_weak_wall_can_be_traded_against_a_strong_roof():
    """The whole point of the calculation method: elements offset each other."""
    traded = calculate(
        house(
            wall=Element("wall", 80.0, 1.2, "poorly insulated wall"),
            roof=Element("roof", 100.0, 12.0, "deep ceiling insulation"),
        ),
        climate_zone=1,
        tables=TABLES,
    )

    assert traded.complies is True
    assert traded.below_minimum == []  # R1.2 clears the R1.0 wall floor


def test_glazing_over_40_percent_of_gross_wall_area_fails_whatever_the_insulation():
    """Paragraph 2.1.2.5 is a gate, not a trade-off."""
    result = calculate(
        house(
            wall=Element("wall", 50.0, 10.0, "superbly insulated wall"),
            glazing=Element("glazing", 50.0, 1.2, "triple glazing"),
            door=None,
            roof=Element("roof", 100.0, 20.0, "very deep insulation"),
        ),
        climate_zone=1,
        tables=TABLES,
    )

    assert result.wall_glazing_fraction == pytest.approx(0.50)
    assert result.glazing_limit_ok is False
    assert result.proposed_heat_loss < result.reference_heat_loss  # the totals would pass
    assert result.complies is False
    assert any("2.1.2.5" in note for note in result.notes)


@pytest.mark.parametrize(
    "element, minimum",
    [
        (Element("roof", 100.0, 2.5, "thin ceiling"), 2.6),
        (Element("wall", 80.0, 0.9, "uninsulated wall"), 1.0),
        (Element("other_floor", 100.0, 1.2, "timber floor"), 1.3),
    ],
)
def test_paragraph_2_1_2_11_minimums_are_not_tradeable(element, minimum):
    key = {"roof": "roof", "wall": "wall", "other_floor": "slab"}[element.element_type]
    overrides = {key: element}
    if element.element_type == "other_floor":
        overrides["roof"] = Element("roof", 100.0, 30.0, "compensating roof")

    result = calculate(house(**overrides), climate_zone=1, tables=TABLES)

    assert [b.minimum for b in result.below_minimum] == [minimum]
    assert result.below_minimum[0].rule == "2.1.2.11"
    assert result.complies is False


def test_slab_on_ground_has_no_minimum_r_value():
    """2.1.2.11 lists roofs, walls and non-slab floors only."""
    result = calculate(
        house(slab=Element("slab_on_ground_floor", 100.0, 0.5, "uninsulated slab")),
        climate_zone=1,
        tables=TABLES,
    )

    assert result.below_minimum == []


def test_a_heated_floor_is_held_to_table_2_1_2_12():
    result = calculate(
        house(
            slab=Element("slab_on_ground_floor", 100.0, 2.6, "underfloor heating", heated=True),
        ),
        climate_zone=5,
        tables=TABLES,
    )

    assert [b.rule for b in result.below_minimum] == ["Table 2.1.2.12"]
    assert result.below_minimum[0].minimum == 3.0
    assert result.complies is False


def test_an_unheated_floor_at_the_same_r_value_is_fine():
    result = calculate(
        house(slab=Element("slab_on_ground_floor", 100.0, 2.6, "slab")),
        climate_zone=5,
        tables=TABLES,
    )

    assert result.below_minimum == []


def test_an_unknown_r_value_falls_back_to_the_2_1_2_13_defaults():
    result = calculate(
        house(
            door=Element("opaque_door", 4.0, None, "door of unknown build-up"),
            glazing=Element("glazing", 20.0, None, "unspecified joinery"),
        ),
        climate_zone=1,
        tables=TABLES,
    )

    by_label = {p.label: p for p in result.proposed}
    assert by_label["door of unknown build-up"].r_value == 0.18
    assert by_label["unspecified joinery"].r_value == 0.15
    assert any("2.1.2.13" in note for note in result.notes)


def test_roof_and_skylight_share_one_reference_term():
    result = calculate(
        house() + [Element("skylight", 5.0, 0.5, "skylight")],
        climate_zone=1,
        tables=TABLES,
    )

    reference = {r.element_type: r for r in result.reference}
    assert reference["roof_and_skylight"].area_m2 == pytest.approx(105.0)
    assert reference["roof_and_skylight"].r_value == 6.6


def test_slab_and_other_floors_take_different_reference_r_values():
    result = calculate(
        house(slab=Element("slab_on_ground_floor", 60.0, 1.5, "slab"))
        + [Element("other_floor", 40.0, 2.5, "suspended floor")],
        climate_zone=4,
        tables=TABLES,
    )

    reference = {r.element_type: r for r in result.reference}
    assert reference["slab_on_ground"].r_value == 1.5   # zone 4
    assert reference["other_floor"].r_value == 2.8      # zone 4 differs from zones 1-3


def test_colder_zones_use_a_tougher_reference_glazing_value():
    zone_4 = calculate(house(), climate_zone=4, tables=TABLES)
    zone_5 = calculate(house(), climate_zone=5, tables=TABLES)

    glazing = lambda r: {x.element_type: x for x in r.reference}["glazing"].r_value
    assert glazing(zone_4) == 0.46
    assert glazing(zone_5) == 0.50
    # A better-insulated reference loses less heat, so the same house has less margin.
    assert zone_5.margin < zone_4.margin


def test_every_result_is_provisional_until_the_table_is_checked_by_a_person():
    result = calculate(house(), climate_zone=1, tables=TABLES)

    assert result.provisional is True
    assert any("provisional" in note for note in result.notes)


@pytest.mark.parametrize(
    "elements, message",
    [
        ([], "No envelope elements"),
        ([Element("chimney", 10.0, 1.0)], "unknown element type"),
        ([Element("wall", 0.0, 2.0)], "area must be positive"),
        ([Element("wall", 10.0, -1.0)], "R-value must be positive"),
    ],
)
def test_bad_input_is_rejected(elements, message):
    with pytest.raises(TableError, match=message):
        calculate(elements, climate_zone=1, tables=TABLES)


def test_unknown_climate_zone_is_rejected():
    with pytest.raises(TableError, match="Climate zone 9"):
        calculate(house(), climate_zone=9, tables=TABLES)


# ── table loading ───────────────────────────────────────────────────────────

def raw_table(**overrides):
    import copy
    from pathlib import Path

    import yaml

    path = tables_module.DATA_DIR / f"{tables_module.DEFAULT_TABLE}.yaml"
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    for key, value in overrides.items():
        raw[key] = value
    return copy.deepcopy(raw)


def test_a_reference_term_missing_a_zone_is_rejected():
    broken = raw_table()
    del broken["reference_r_values"]["wall"][6]

    with pytest.raises(TableError, match=r"no value for zone\(s\) \[6\]"):
        tables_module.parse(broken)


def test_a_wall_split_that_does_not_sum_to_one_is_rejected():
    with pytest.raises(TableError, match="must sum to 1.0"):
        tables_module.parse(
            raw_table(reference_wall_split={"wall_fraction": 0.7, "glazing_fraction": 0.4})
        )


def test_a_non_positive_reference_r_value_is_rejected():
    broken = raw_table()
    broken["reference_r_values"]["roof_and_skylight"][1] = 0

    with pytest.raises(TableError, match="must be a positive number"):
        tables_module.parse(broken)


def test_the_shipped_table_is_edition_6_and_not_yet_verified():
    """Guards the transcription. Flip this once a person has checked the numbers."""
    assert TABLES.edition == "H1/AS1 6th edition"
    assert TABLES.zones == (1, 2, 3, 4, 5, 6)
    assert TABLES.minimum_wall_framing_fraction == 0.38
    assert TABLES.verified is False, (
        "The shipped H1 table is now marked verified — update this test, and make sure "
        "the numbers really were checked against the published H1/AS1 6th edition."
    )


def test_marking_an_element_heated_surfaces_the_bathroom_exemption():
    """2.1.2.12 exempts elements serving only a shower/bath/toilet room.

    Nothing in the data can tell us which rooms a heated floor serves, so a user
    who marks a heated bathroom floor would be failed by a rule that does not
    apply to it. Say so rather than letting the FAIL stand unexplained.
    """
    result = calculate(
        house(slab=Element("slab_on_ground_floor", 100.0, 3.5, "underfloor heating", heated=True)),
        climate_zone=1,
        tables=TABLES,
    )

    note = next(n for n in result.notes if "Table 2.1.2.12" in n)
    assert "underfloor heating" in note
    assert "shower, bath or toilet" in note


def test_an_unheated_building_says_nothing_about_heated_minimums():
    result = calculate(house(), climate_zone=1, tables=TABLES)

    assert not any("Table 2.1.2.12" in n for n in result.notes)


# ── headroom: how far each element can drop ─────────────────────────────────

from h1.engine import headroom


def by_label(rows):
    return {r.label: r for r in rows}


def test_substituting_the_lowest_r_lands_exactly_on_the_reference():
    """The closed form is only right if the building then sits on the boundary.

    The wall, not the roof: this house's roof headroom is held by the 2.1.2.11
    floor, so substituting it would land short of the reference rather than on it.
    """
    wall = by_label(headroom(house(), climate_zone=1, tables=TABLES))["external wall"]
    assert wall.binding == "heat loss"

    on_the_line = house(wall=Element("wall", 80.0, wall.lowest_r, "external wall"))
    result = calculate(on_the_line, climate_zone=1, tables=TABLES)

    assert result.proposed_heat_loss == pytest.approx(result.reference_heat_loss)
    assert result.complies is True


def test_lifting_one_element_lets_another_come_down():
    """Raise the wall and the joinery is free to drop — by exactly this much."""
    before = by_label(headroom(house(), 1, TABLES))["joinery"]
    after = by_label(
        headroom(house(wall=Element("wall", 80.0, 3.0, "external wall")), 1, TABLES)
    )["joinery"]

    assert before.lowest_r == pytest.approx(0.288, abs=0.001)
    assert after.lowest_r == pytest.approx(0.242, abs=0.001)


def test_an_element_already_at_its_2_1_2_11_floor_reports_that_rule():
    generous = house(
        wall=Element("wall", 80.0, 6.0, "external wall"),
        glazing=Element("glazing", 20.0, 1.2, "joinery"),
    )

    roof = by_label(headroom(generous, 1, TABLES))["ceiling"]

    assert roof.lowest_r == 2.6
    assert roof.binding == "2.1.2.11"


def test_a_heated_element_is_held_to_the_higher_of_the_two_floors():
    heated = house(
        slab=Element("slab_on_ground_floor", 100.0, 3.5, "underfloor heating", heated=True),
        wall=Element("wall", 80.0, 6.0, "external wall"),
    )

    slab = by_label(headroom(heated, 5, TABLES))["underfloor heating"]

    assert slab.lowest_r == 3.0  # Table 2.1.2.12, zone 5 — 2.1.2.11 sets no slab floor
    assert slab.binding == "Table 2.1.2.12"


def test_nothing_has_headroom_when_the_glazing_gate_fails():
    glassy = house(
        wall=Element("wall", 50.0, 10.0, "external wall"),
        glazing=Element("glazing", 50.0, 1.2, "joinery"),
        door=None,
    )

    rows = headroom(glassy, 1, TABLES)

    assert all(r.lowest_r is None and r.binding == "2.1.2.5" for r in rows)


def test_an_element_that_cannot_rescue_the_building_says_so():
    """With the rest already over budget, no R-value for this one complies."""
    hopeless = house(
        wall=Element("wall", 80.0, 1.05, "external wall"),
        slab=Element("slab_on_ground_floor", 100.0, 0.3, "slab"),
        glazing=Element("glazing", 20.0, 0.16, "joinery"),
    )

    roof = by_label(headroom(hopeless, 6, TABLES))["ceiling"]

    assert roof.lowest_r is None
    assert roof.binding == "impossible"


def test_a_non_complying_building_reports_what_each_element_would_have_to_reach():
    thin = house(
        roof=Element("roof", 100.0, 2.8, "ceiling"),
        wall=Element("wall", 80.0, 1.1, "external wall"),
        glazing=Element("glazing", 20.0, 0.2, "joinery"),
    )
    assert calculate(thin, 1, TABLES).complies is False

    joinery = by_label(headroom(thin, 1, TABLES))["joinery"]

    assert joinery.lowest_r > joinery.current_r
    assert joinery.binding == "heat loss"


def test_every_element_gets_a_row_with_its_resolved_r():
    rows = headroom(
        house(door=Element("opaque_door", 4.0, None, "entry door")), 1, TABLES
    )

    assert len(rows) == len(house())
    assert by_label(rows)["entry door"].current_r == 0.18  # 2.1.2.13 default
