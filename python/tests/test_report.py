"""Tests for the consent PDF.

The house is LOT1 of a real submission, entered with the element schedule its
BRANZ results sheet printed — so the report's totals can be checked against a
second, independent tool (proposed 256.6 W/K, reference 257.1 W/K, PASS).
"""
import pymupdf
import pytest

from h1 import branz_export, engine, report
from h1 import tables as tables_module

TABLES = tables_module.load()

LOT1 = [
    engine.Element("slab_on_ground_floor", 43.3, 0.70, "Concrete"),
    engine.Element("other_floor", 27.3, 3.60, "Mid-floor"),
    engine.Element("roof", 60.2, 7.18, "Flat ceiling roofing"),
    engine.Element("roof", 10.3, 4.44, "Rafter roofing"),
    engine.Element("wall", 63.9, 2.20, "Fibre cement 90mm"),
    engine.Element("wall", 20.9, 3.15, "Fibre cement 140mm"),
    engine.Element("wall", 19.7, 2.14, "Metal cladding"),
    engine.Element("wall", 20.9, 2.11, "Stone cladding"),
    engine.Element("wall", 14.4, 2.08, "Internal wall"),
] + [
    engine.Element("glazing", area, 0.46, f"EXW{i}")
    for i, area in enumerate([8.6, 4.8, 4.3, 0.9, 4.4, 0.5, 9.7, 1.9, 3.8, 2.2, 1.1, 3.8], 103)
] + [
    engine.Element("opaque_door", 2.2, 0.37, "EXD102"),
    engine.Element("opaque_door", 1.6, 0.18, "IN101"),
]

PROJECT = branz_export.ProjectDetails(
    project_name="Example project", address="1 Example Road", designer="A Designer",
    date="01/10/2026", territorial_authority="Auckland",
)


def text_of(pdf: bytes):
    doc = pymupdf.open(stream=pdf, filetype="pdf")
    flags = pymupdf.TEXTFLAGS_TEXT & ~pymupdf.TEXT_PRESERVE_LIGATURES  # "fl" glyph -> "fl"
    return doc, "\n".join(page.get_text("text", flags=flags) for page in doc)


def test_the_engine_agrees_with_the_branz_sheet_for_lot1():
    result = engine.calculate(LOT1, 1, TABLES)

    assert result.proposed_heat_loss == pytest.approx(256.6, abs=0.15)
    assert result.reference_heat_loss == pytest.approx(257.1, abs=0.15)
    assert result.complies


def test_the_results_page_carries_the_verdict_totals_and_schedule():
    doc, text = text_of(report.build(LOT1, 1, TABLES, PROJECT))
    result = engine.calculate(LOT1, 1, TABLES)

    assert "PASS" in text
    # the sheet's areas are rounded to 0.1 m², so match the engine, not the sheet
    assert f"{result.proposed_heat_loss:.1f}" in text
    assert f"{result.reference_heat_loss:.1f}" in text
    assert "Example project" in text
    assert "Rafter roofing" in text and "IN101" in text
    assert "Walls (70% of gross wall area)" in text


def test_the_branz_section_names_each_sheet_and_its_anchor():
    _, text = text_of(report.build(LOT1, 1, TABLES, PROJECT))

    for sheet in ("Slab Floors", "Roof", "Walls", "Glazing (walls & doors)", "Doors (opaque)"):
        assert sheet in text
    assert "C10" in text


def test_each_construction_gets_its_own_page_and_unknown_layers_print_as_a_dash():
    wall = report.Construction(
        name="Fibre cement 90mm", element_type="wall", total_r=2.20,
        method="NZS 4214 isothermal planes", framing_fraction=0.38,
        layers=[report.Layer("Cladding", 7.5, None), report.Layer("Insulation", 90, 2.6)],
        notes=["Layer values pending NZS 4214 Appendix E."],
    )
    plain, _ = text_of(report.build(LOT1, 1, TABLES, PROJECT))
    doc, text = text_of(report.build(LOT1, 1, TABLES, PROJECT, [wall]))

    assert doc.page_count == plain.page_count + 1
    last = doc[-1].get_text("text", flags=pymupdf.TEXTFLAGS_TEXT & ~pymupdf.TEXT_PRESERVE_LIGATURES)
    assert "Fibre cement 90mm" in last and "38.0%" in last and "—" in last


def test_a_failing_building_says_fail():
    worse = [engine.Element(e.element_type, e.area_m2, e.r_value * 0.7, e.label) for e in LOT1]
    _, text = text_of(report.build(worse, 1, TABLES, PROJECT))

    assert "FAIL" in text
