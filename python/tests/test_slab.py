"""Tests for slab-on-ground construction R-values, H1/AS1 6th edition Appendix E.

Expected values are read off the printed tables (page numbers in comments), not
out of the data file, so a transcription slip in the YAML fails here.
"""
import pytest

from h1 import slab
from h1.tables import TableError

T = slab.load()


def r(**kwargs):
    base = {"ratio": 3.0, "wall_thickness_mm": 90, "masonry_veneer": False}
    return slab.construction_r(T, **{**base, **kwargs})


def test_the_data_is_flagged_until_a_person_checks_it():
    assert T.verified is False


@pytest.mark.parametrize("kwargs, expected", [
    # Table E.1.2.1A, raft, no insulation, masonry veneer (p31)
    ({"foundation": "raft", "masonry_veneer": True, "ratio": 0.6}, 0.8),
    ({"foundation": "raft", "masonry_veneer": True, "ratio": 10.0, "wall_thickness_mm": 300}, 4.6),
    # Table E.1.2.1B, raft, no insulation, other cladding (p32)
    ({"foundation": "raft", "ratio": 0.6}, 0.6),
    ({"foundation": "raft", "ratio": 10.0, "wall_thickness_mm": 300}, 4.3),
    # Table E.1.2.1F, slab, no insulation, other cladding (p36)
    ({"ratio": 3.0, "wall_thickness_mm": 180}, 1.3),
    # Table E.1.2.1H, slab, R1.0 vertical edge, other cladding (p38)
    ({"edge_insulation": True, "ratio": 4.0, "wall_thickness_mm": 250}, 1.9),
    # Table E.1.2.1L, slab, 1.2 m strip of R2.4, other cladding (p42)
    ({"underslab": "strip_2.4", "ratio": 2.0, "wall_thickness_mm": 140}, 1.2),
    # Table E.1.2.1P, slab, full cover R2.4, other cladding (p46)
    ({"underslab": "full_2.4", "ratio": 4.0, "wall_thickness_mm": 300}, 3.1),
    # Table E.1.2.1X, slab, edge R1.0 + full cover R2.4, other cladding (p54)
    ({"edge_insulation": True, "underslab": "full_2.4", "ratio": 3.0, "wall_thickness_mm": 90}, 2.5),
])
def test_values_match_the_printed_tables(kwargs, expected):
    assert r(**kwargs) == pytest.approx(expected)


def test_a_ratio_between_rows_takes_the_nearest_smaller_row_never_interpolates():
    """Every table's note: use the nearest ratio in the table that is smaller."""
    assert r(ratio=3.99) == r(ratio=3.8)
    assert r(ratio=4.5) == r(ratio=4.0)
    assert r(ratio=25.0) == r(ratio=10.0)


def test_a_ratio_below_the_first_row_is_outside_the_tables():
    with pytest.raises(TableError, match="H1/VM1"):
        r(ratio=0.5)


def test_wall_thickness_picks_its_band():
    # Table E.1.2.1F row 3.0: 1.2, 1.2, 1.3, 1.3, 1.4
    assert r(wall_thickness_mm=139) == pytest.approx(1.2)
    assert r(wall_thickness_mm=180) == pytest.approx(1.3)
    assert r(wall_thickness_mm=400) == pytest.approx(1.4)


def test_a_wall_thinner_than_90_mm_is_outside_the_tables():
    with pytest.raises(TableError, match="90 mm"):
        r(wall_thickness_mm=70)


def test_a_raft_has_no_underslab_tables():
    with pytest.raises(TableError, match="raft"):
        r(foundation="raft", underslab="full_1.2")


def test_insulation_only_ever_improves_the_floor():
    for ratio in T.ratios:
        bare = r(ratio=ratio)
        for underslab in slab.UNDERSLAB:
            for edge in (False, True):
                assert r(ratio=ratio, underslab=underslab, edge_insulation=edge) >= bare


def test_area_to_perimeter_from_internal_and_external_dimensions():
    # E.1: A / P
    assert slab.area_to_perimeter(150.0, 50.0) == pytest.approx(3.0)
    # E.2: A / P - w / 2, from the outer slab edge
    assert slab.area_to_perimeter(160.0, 52.0, external=True, w_m=0.2) == pytest.approx(160 / 52 - 0.1)


def test_part_perimeter_edge_insulation_weights_one_over_r_by_share_of_perimeter():
    """Equation E.3; E.4 and E.5 are the same weighting with more parts."""
    combined = slab.combine([(0.25, 1.2), (0.75, 1.5)])
    assert combined == pytest.approx(1 / (0.25 / 1.2 + 0.75 / 1.5))
    assert 1.2 < combined < 1.5


def test_shares_of_perimeter_must_add_up_to_one():
    with pytest.raises(TableError, match="add up to 1"):
        slab.combine([(0.5, 1.2), (0.4, 1.5)])


@pytest.mark.parametrize("product_r, credited", [
    (1.22, 1.2),   # EXPOL SlabX200 40 mm
    (2.20, 1.2),   # 75 mm — short of R2.4, so it only counts as R1.2
    (3.00, 2.4),   # 100 mm — the tables stop at R2.4
    (6.00, 2.4),
    (1.00, None),  # below R1.2 earns no underslab table at all
])
def test_a_product_is_credited_with_the_highest_table_value_it_meets(product_r, credited):
    assert slab.underslab_credit(product_r) == credited


def test_slabx200_thicknesses_are_credited_and_the_wasted_ones_marked():
    """Only 40 mm and 100 mm are worth buying under the tables."""
    rows = {p.thickness_mm: p for p in slab.underslab_products() if p.product == "SlabX200"}

    assert rows[40].credited == 1.2 and rows[40].thinnest_for_credit
    for mm in (50, 60, 75):
        assert rows[mm].credited == 1.2 and not rows[mm].thinnest_for_credit
    assert rows[100].credited == 2.4 and rows[100].thinnest_for_credit
    for mm in (150, 200):
        assert rows[mm].credited == 2.4 and not rows[mm].thinnest_for_credit


def test_the_ladder_lists_every_arrangement_for_the_geometry_insulated_last():
    rungs = slab.ladder(T, ratio=3.0, wall_thickness_mm=90, masonry_veneer=False)

    assert rungs[0].edge_insulation is False and rungs[0].underslab == "none"
    assert len(rungs) == 10  # none/edge × none + 4 underslab options
    assert all(rung.insulated for rung in rungs[1:])
    assert {round(x.r_value, 1) for x in rungs} >= {1.2, 2.5}
