"""The API routes must keep returning what they should — the h1 modules can stay
green while the wiring in api.py breaks."""
import os

import pytest


@pytest.fixture(scope="module")
def server_module():
    import api
    return api


# ── H1 endpoints ────────────────────────────────────────────────────────────
# Wiring the h1 modules into api.py is exactly the kind of thing that can
# break with every unit test still green — the modules keep working, the routes
# stop returning what they should.

_H1_HOUSE = {
    "territorial_authority": "Auckland",
    "elements": [
        {"element_type": "roof", "area_m2": 140, "r_value": 6.6},
        {"element_type": "wall", "area_m2": 130, "r_value": 2.6},
        {"element_type": "glazing", "area_m2": 35, "r_value": 0.37},
        {"element_type": "slab_on_ground_floor", "area_m2": 140, "r_value": 1.3},
    ],
}


def test_h1_calculate_resolves_a_council_to_its_climate_zone(server_module):
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        body = client.post("/api/h1/calculate", json=_H1_HOUSE).json()

    assert body["climate_zone"] == 1
    assert body["complies"] is True


def test_h1_calculate_always_reports_scope_findings(server_module):
    """Part 1 must be answered even when the caller says nothing about it."""
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        silent = client.post("/api/h1/calculate", json=_H1_HOUSE).json()
        declared = client.post("/api/h1/calculate", json={
            **_H1_HOUSE,
            "scope": {"non_housing_occupied_space_m2": 450, "has_foil_insulation": True},
        }).json()

    assert {f["status"] for f in silent["scope_findings"]} == {"not_stated"}

    out = {f["rule"] for f in declared["scope_findings"] if f["status"] == "out_of_scope"}
    assert out == {"1.1.1.1 b)", "1.1.2.1"}
    # Advisory, not blocking: the envelope arithmetic is still reported.
    assert declared["complies"] is True


def test_h1_calculate_needs_a_zone_or_a_council(server_module):
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        response = client.post("/api/h1/calculate", json={"elements": _H1_HOUSE["elements"]})

    assert response.status_code == 400
    assert "territorial_authority" in response.json()["detail"]


def test_h1_report_returns_a_pdf(server_module):
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        response = client.post("/api/h1/report", json={
            **_H1_HOUSE,
            "project": {"project_name": "Smoke test"},
            "constructions": [{"name": "Wall A", "element_type": "wall", "total_r": 2.6,
                               "layers": [{"name": "Insulation", "thickness_mm": 90}]}],
        })

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert 'filename="Smoke test.pdf"' in response.headers["content-disposition"]


def test_h1_slab_returns_the_ladder_uninsulated_first(server_module):
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        body = client.post("/api/h1/slab", json={
            "area_m2": 150, "perimeter_m": 50, "wall_thickness_mm": 90, "masonry_veneer": False,
        }).json()
        too_thin = client.post("/api/h1/slab", json={
            "area_m2": 150, "perimeter_m": 50, "wall_thickness_mm": 70, "masonry_veneer": False,
        })

    assert body["area_to_perimeter"] == 3.0
    assert body["ladder"][0] == {"foundation": "slab", "edge_insulation": False,
                                 "underslab": "none", "r_value": 1.2, "insulated": False}
    assert all(rung["insulated"] for rung in body["ladder"][1:])
    assert body["provisional"] is True
    assert any(p["product"] == "SlabX200" for p in body["underslab_products"])
    assert too_thin.status_code == 400


def test_h1_paste_blocks_anchor_each_sheet_at_row_10(server_module):
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        body = client.post("/api/h1/paste-blocks", json={
            "rows": [
                {"element_type": "wall", "area_m2": 130, "r_value": 2.6, "label": "walls"},
                {"element_type": "glazing", "area_m2": 35, "r_value": 0.37, "label": "joinery"},
            ]
        }).json()

    spans = {b["sheet"]: b["span"] for b in body["blocks"]}
    assert spans == {"Walls": "C10:F10", "Glazing (walls & doors)": "C10:H10"}


@pytest.mark.skipif(
    bool(os.environ.get("H1_BRANZ_TEMPLATE")),
    reason="H1_BRANZ_TEMPLATE is set, so this deployment has opted in to filling the workbook",
)
def test_h1_export_is_inert_until_a_template_is_configured(server_module):
    """The shipped default must not quietly redistribute BRANZ's workbook.

    Handing users filled copies of BRANZ's file is redistribution of their work.
    That needs a deliberate act by whoever runs the server — setting
    H1_BRANZ_TEMPLATE — not a default nobody chose.
    """
    from fastapi.testclient import TestClient

    with TestClient(server_module.app) as client:
        response = client.post("/api/h1/export", json={
            "rows": [{"element_type": "wall", "area_m2": 130, "r_value": 2.6, "label": "walls"}]
        })

    assert response.status_code == 503
