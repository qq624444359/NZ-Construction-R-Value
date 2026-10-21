"""Unit tests for writing a specification into the BRANZ H1/AS1 workbook.

The real workbook is BRANZ's and is not in this repository, so these run against
a stand-in with the same sheet names and column layouts. One test does exercise
the genuine article, and skips unless H1_BRANZ_TEMPLATE points at a copy.

The layout tests are the point. The opaque sheets and the joinery sheets put
R-values in different columns, and getting that wrong would not raise anything —
it would silently file a compliance document with the numbers in the wrong place.
"""
import os
from pathlib import Path

import openpyxl
import pytest

from h1 import branz_export
from h1.branz_export import FIRST_ROW, LAST_ROW, ProjectDetails, Row, rows_from_candidate
from h1.tables import TableError

REAL_TEMPLATE = os.environ.get("H1_BRANZ_TEMPLATE")


@pytest.fixture
def template(tmp_path):
    """A stand-in with the sheets, columns and a formula the real workbook has."""
    workbook = openpyxl.Workbook()
    workbook.remove(workbook.active)
    for element_type, (sheet_name, columns) in branz_export.LAYOUTS.items():
        sheet = workbook.create_sheet(sheet_name)
        sheet["C9"] = f"{sheet_name} - Description"
        for row in range(FIRST_ROW, LAST_ROW + 1):
            sheet[f"B{row}"] = "=ROW()-9"
            if "heated" in columns:
                sheet[f"{columns['heated']}{row}"] = "No"
    results = workbook.create_sheet("Results")
    results["K25"] = "=SUM(J18:J24)"
    details = workbook.create_sheet("Project Details")
    details["E7"] = "Project name"

    path = tmp_path / "template.xlsx"
    workbook.save(path)
    return path


def export(rows, template, tmp_path, project=None):
    out = branz_export.write(rows, template, tmp_path / "out.xlsx", project)
    return openpyxl.load_workbook(out)


def test_opaque_elements_take_the_c_d_e_f_layout(template, tmp_path):
    book = export([Row("wall", "external wall", 80.0, 2.6)], template, tmp_path)

    sheet = book["Walls"]
    assert sheet["C10"].value == "external wall"
    assert sheet["D10"].value == "No"
    assert sheet["E10"].value == 80.0
    assert sheet["F10"].value == 2.6


def test_joinery_puts_the_r_value_in_column_h_not_f(template, tmp_path):
    """Glazing, skylights and doors carry ID/height/width in D-G."""
    book = export([Row("glazing", "joinery", 35.0, 0.37)], template, tmp_path)

    sheet = book["Glazing (walls & doors)"]
    assert sheet["C10"].value == "joinery"
    assert sheet["E10"].value == 35.0
    assert sheet["H10"].value == 0.37
    assert sheet["F10"].value is None  # height, left for the user
    assert sheet["G10"].value is None  # width


@pytest.mark.parametrize(
    "element_type, sheet_name",
    [
        ("slab_on_ground_floor", "Slab Floors"),
        ("other_floor", "Other Floors"),
        ("roof", "Roof"),
        ("wall", "Walls"),
        ("skylight", "Skylights"),
        ("glazing", "Glazing (walls & doors)"),
        ("opaque_door", "Doors (opaque)"),
    ],
)
def test_every_element_type_lands_on_its_own_sheet(element_type, sheet_name, template, tmp_path):
    book = export([Row(element_type, "thing", 10.0, 2.0)], template, tmp_path)

    assert book[sheet_name]["C10"].value == "thing"


def test_several_assemblies_of_one_type_take_consecutive_rows(template, tmp_path):
    book = export(
        [
            Row("wall", "street elevation", 30.0, 1.9),
            Row("wall", "other walls", 100.0, 2.6),
        ],
        template,
        tmp_path,
    )

    sheet = book["Walls"]
    assert (sheet["C10"].value, sheet["E10"].value, sheet["F10"].value) == ("street elevation", 30.0, 1.9)
    assert (sheet["C11"].value, sheet["E11"].value, sheet["F11"].value) == ("other walls", 100.0, 2.6)


def test_formulas_in_the_template_are_left_alone(template, tmp_path):
    book = export([Row("wall", "external wall", 80.0, 2.6)], template, tmp_path)

    assert book["Results"]["K25"].value == "=SUM(J18:J24)"
    assert book["Walls"]["B10"].value == "=ROW()-9"


def test_unused_rows_are_cleared_so_output_is_deterministic(template, tmp_path):
    dirty = openpyxl.load_workbook(template)
    dirty["Walls"]["C12"] = "left over from a previous run"
    dirty["Walls"]["E12"] = 999
    dirty.save(template)

    book = export([Row("wall", "external wall", 80.0, 2.6)], template, tmp_path)

    assert book["Walls"]["C12"].value is None
    assert book["Walls"]["E12"].value is None
    assert book["Walls"]["D12"].value == "No"  # the template's own default, not blank


def test_a_heated_element_is_written_as_yes(template, tmp_path):
    book = export([Row("slab_on_ground_floor", "underfloor heating", 100.0, 3.0, heated=True)],
                  template, tmp_path)

    assert book["Slab Floors"]["D10"].value == "Yes"


def test_heated_on_a_sheet_without_the_column_is_rejected(template, tmp_path):
    with pytest.raises(TableError, match="no heated-element column"):
        export([Row("glazing", "joinery", 35.0, 0.37, heated=True)], template, tmp_path)


def test_project_details_are_written(template, tmp_path):
    book = export(
        [Row("wall", "external wall", 80.0, 2.6)],
        template,
        tmp_path,
        ProjectDetails(project_name="86 Sartors Ave", designer="EZbuild",
                       territorial_authority="Auckland"),
    )

    details = book["Project Details"]
    assert details["F7"].value == "86 Sartors Ave"
    assert details["F9"].value == "EZbuild"
    assert details["F12"].value == "Auckland"


def test_more_rows_than_the_sheet_holds_is_rejected(template, tmp_path):
    too_many = [Row("wall", f"wall {i}", 1.0, 2.0) for i in range(LAST_ROW - FIRST_ROW + 2)]

    with pytest.raises(TableError, match="rows per sheet"):
        export(too_many, template, tmp_path)


@pytest.mark.parametrize(
    "rows, message",
    [
        ([], "No rows to export"),
        ([Row("chimney", "x", 1.0, 1.0)], "unknown element type"),
        ([Row("wall", "x", 0.0, 1.0)], "area must be positive"),
        ([Row("wall", "x", 1.0, 0.0)], "R-value must be positive"),
    ],
)
def test_bad_rows_are_rejected(rows, message, template, tmp_path):
    with pytest.raises(TableError, match=message):
        export(rows, template, tmp_path)


def test_a_missing_template_says_where_to_get_one(tmp_path):
    with pytest.raises(TableError, match="Download the"):
        branz_export.write(
            [Row("wall", "x", 10.0, 2.0)], tmp_path / "nope.xlsx", tmp_path / "out.xlsx"
        )


def test_a_workbook_that_is_not_the_branz_one_is_rejected(tmp_path):
    stranger = openpyxl.Workbook()
    path = tmp_path / "stranger.xlsx"
    stranger.save(path)

    with pytest.raises(TableError, match="does not look like"):
        branz_export.write([Row("wall", "x", 10.0, 2.0)], path, tmp_path / "out.xlsx")


def test_rows_from_candidate_keeps_the_assembly_and_build_up_names():
    from h1.optimise import Candidate, Selection

    candidate = Candidate(
        total_cost=1.0,
        heat_loss=1.0,
        margin=1.0,
        selections=[
            Selection("street elevation", "wall", "90mm stud brick veneer", 30.0, 1.9, 165.0,
                      4950.0, 15.8, ("brick-veneer",))
        ],
        result=None,
    )

    rows = rows_from_candidate(candidate)

    assert rows[0].element_type == "wall"
    assert "street elevation" in rows[0].description
    assert "90mm stud brick veneer" in rows[0].description
    assert (rows[0].area_m2, rows[0].r_value) == (30.0, 1.9)


@pytest.mark.skipif(not REAL_TEMPLATE, reason="H1_BRANZ_TEMPLATE not set")
def test_the_real_branz_workbook_survives_a_round_trip(tmp_path):
    """Formulas, defined names, validations and protection must all come through."""
    before = openpyxl.load_workbook(REAL_TEMPLATE)

    out = branz_export.write(
        [
            Row("wall", "external wall", 80.0, 2.6),
            Row("glazing", "joinery", 20.0, 0.37),
        ],
        Path(REAL_TEMPLATE),
        tmp_path / "out.xlsx",
        ProjectDetails(project_name="test", territorial_authority="Auckland"),
    )
    after = openpyxl.load_workbook(out)

    assert set(after.defined_names) == set(before.defined_names)
    assert after["Results"]["H33"].value == "=0.7*(TotalWallArea)"
    assert after["Results"]["H34"].value == "=0.3*(TotalWallArea)"
    assert after["Walls"]["F10"].value == 2.6
    assert after["Glazing (walls & doors)"]["H10"].value == 0.37
    for name in ("Walls", "Results", "Project Details"):
        assert after[name].protection.sheet == before[name].protection.sheet
        assert len(after[name].data_validations.dataValidation) == len(
            before[name].data_validations.dataValidation
        )


# ── paste blocks: getting the numbers across without touching BRANZ's file ──

from h1.branz_export import LAYOUTS, PASTE_HEADERS, paste_blocks, _span

SPEC = [
    Row("roof", "ceiling", 140.0, 6.6),
    Row("wall", "street elevation", 30.0, 1.9),
    Row("wall", "other walls", 100.0, 2.6),
    Row("glazing", "joinery", 35.0, 0.37),
    Row("slab_on_ground_floor", "slab", 140.0, 3.0, heated=True),
]


def block_for(instructions, sheet):
    return next(b for b in instructions.blocks if b.sheet == sheet)


def test_paste_headers_match_the_span():
    """Guards the one place LAYOUTS and PASTE_HEADERS could drift apart."""
    for element_type, (_, columns) in LAYOUTS.items():
        width = len(_span(columns["description"], columns["r_value"]))
        assert len(PASTE_HEADERS[element_type]) == width, element_type


def test_an_opaque_block_is_four_columns_anchored_at_c10():
    block = block_for(paste_blocks(SPEC), "Walls")

    assert block.anchor == "C10"
    assert block.span == "C10:F11"
    assert block.rows == [["street elevation", "No", "30", "1.9"],
                          ["other walls", "No", "100", "2.6"]]


def test_a_joinery_block_leaves_id_height_and_width_blank():
    """D-G are the user's own joinery schedule; only C, E and H are ours."""
    block = block_for(paste_blocks(SPEC), "Glazing (walls & doors)")

    assert block.span == "C10:H10"
    assert block.rows == [["joinery", "", "35", "", "", "0.37"]]


def test_rows_of_one_element_type_share_a_single_block():
    blocks = paste_blocks(SPEC).blocks

    assert [b.sheet for b in blocks].count("Walls") == 1
    assert block_for(paste_blocks(SPEC), "Walls").row_count == 2


def test_the_tsv_is_what_excel_splits_across_columns():
    block = block_for(paste_blocks(SPEC), "Walls")

    assert block.tsv == "street elevation\tNo\t30\t1.9\nother walls\tNo\t100\t2.6"


def test_a_heated_element_pastes_yes():
    assert block_for(paste_blocks(SPEC), "Slab Floors").rows[0][1] == "Yes"


def test_a_tab_in_a_description_cannot_shift_the_rest_of_the_paste():
    block = block_for(paste_blocks([Row("wall", "wall\twith\ttabs\nand a newline", 30.0, 1.9)]), "Walls")

    assert block.rows[0] == ["wall with tabs and a newline", "No", "30", "1.9"]
    assert block.tsv.count("\t") == 3


def test_whole_numbers_lose_their_decimal_point():
    block = block_for(paste_blocks([Row("wall", "wall", 30.0, 2.0)]), "Walls")

    assert block.rows[0][2:] == ["30", "2"]


def test_project_details_come_back_as_cells_to_type():
    instructions = paste_blocks(SPEC, ProjectDetails(project_name="86 Sartors Ave",
                                                     territorial_authority="Auckland"))

    by_cell = {d["cell"]: d["value"] for d in instructions.project}
    assert by_cell == {"F7": "86 Sartors Ave", "F12": "Auckland"}


def test_paste_blocks_reject_the_same_bad_input_as_the_writer():
    with pytest.raises(TableError, match="unknown element type"):
        paste_blocks([Row("chimney", "x", 1.0, 1.0)])


@pytest.mark.skipif(not REAL_TEMPLATE, reason="H1_BRANZ_TEMPLATE not set")
def test_no_paste_block_can_collide_with_sheet_protection():
    """The whole approach rests on this: every cell a paste touches is unlocked."""
    workbook = openpyxl.load_workbook(REAL_TEMPLATE)

    for block in paste_blocks(SPEC).blocks:
        sheet = workbook[block.sheet]
        assert sheet.protection.sheet is True, f"{block.sheet} is unprotected; re-check this test"
        columns = _span(block.anchor[0], block.span.split(":")[1][0])
        for row in range(FIRST_ROW, LAST_ROW + 1):
            for column in columns:
                assert not sheet[f"{column}{row}"].protection.locked, (
                    f"{block.sheet}!{column}{row} is locked — a paste at {block.anchor} "
                    f"would be refused by Excel"
                )
