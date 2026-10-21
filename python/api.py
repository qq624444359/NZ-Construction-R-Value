"""Optional HTTP API over the H1 calculation package.

The calculator website does not need this — it runs in the browser. These are
the endpoints EZbuild served before the calculator was split out, kept so the
Python calculation can be used over HTTP:

    pip install -r requirements.txt
    uvicorn api:app --port 10000
"""
import os
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from h1 import engine as h1_engine, tables as h1_tables
from h1 import catalogue as h1_catalogue, optimise as h1_optimise_mod
from h1 import branz_export as h1_branz_export, regions as h1_regions
from h1 import scope as h1_scope
from h1 import slab as h1_slab_mod
from h1 import report as h1_report_mod
from h1.tables import TableError as H1TableError

app = FastAPI(title="Construction R-value — H1 API")


# ── H1 energy efficiency ─────────────────────────────────────────────────────
# Public and unauthenticated on purpose. The work is arithmetic on numbers the
# caller supplies: it spends no tokens, touches no user data, and reads nothing
# from Supabase, so there is nothing here for auth to protect — and a calculator
# anyone can open is the top of the signup funnel rather than a thing behind it.

# Where the BRANZ calculation workbook lives. It is BRANZ's file, not ours, so
# it is not committed to this repo — point this at a copy you obtained from them.
H1_BRANZ_TEMPLATE = os.getenv("H1_BRANZ_TEMPLATE", "")

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class H1ElementPayload(BaseModel):
    element_type: str
    area_m2: float
    r_value: Optional[float] = None   # omit for the Paragraph 2.1.2.13 defaults
    label: str = ""
    heated: bool = False              # heated ceiling / wall / floor, Table 2.1.2.12


class H1AssemblyPayload(BaseModel):
    """One specification decision — surfaces that will all be built the same way."""
    name: str
    element_type: str
    area_m2: float
    fixed_r: Optional[float] = None
    require_tags: List[str] = []
    exclude_tags: List[str] = []
    heated: bool = False


class H1ScopePayload(BaseModel):
    """Part 1 facts. Unstated fields come back as `not_stated`, not as `no`."""
    non_housing_occupied_space_m2: Optional[float] = None
    has_curtain_walling: Optional[bool] = None
    has_foil_insulation: Optional[bool] = None


class H1ProjectPayload(BaseModel):
    project_name: str = ""
    client: str = ""
    address: str = ""
    designer: str = ""
    date: str = ""
    territorial_authority: str = ""


class H1CalculatePayload(BaseModel):
    scope: Optional[H1ScopePayload] = None
    elements: List[H1ElementPayload]
    climate_zone: Optional[int] = None
    territorial_authority: Optional[str] = None


class H1OptimisePayload(BaseModel):
    scope: Optional[H1ScopePayload] = None
    assemblies: List[H1AssemblyPayload]
    climate_zone: Optional[int] = None
    territorial_authority: Optional[str] = None
    exclude_tags: List[str] = []
    limit: int = 10


class H1ExportPayload(BaseModel):
    rows: List[H1ElementPayload]
    project: Optional[H1ProjectPayload] = None


class H1LayerPayload(BaseModel):
    name: str
    thickness_mm: Optional[float] = None
    r_value: Optional[float] = None


class H1ConstructionPayload(BaseModel):
    name: str
    element_type: str
    total_r: float
    method: str = ""
    framing_fraction: Optional[float] = None
    layers: List[H1LayerPayload] = []
    notes: List[str] = []


class H1ReportPayload(BaseModel):
    elements: List[H1ElementPayload]
    project: Optional[H1ProjectPayload] = None
    constructions: List[H1ConstructionPayload] = []
    climate_zone: Optional[int] = None
    territorial_authority: Optional[str] = None


class H1SlabPayload(BaseModel):
    """Slab shape, per H1/AS1 Appendix E.1.2.2. Internal dimensions unless `external`."""
    area_m2: float
    perimeter_m: float
    wall_thickness_mm: float
    masonry_veneer: bool = False
    foundation: str = "slab"          # "slab" or "raft" (raft includes foam pods)
    external: bool = False
    w_m: float = 0.0                  # Equation E.2, with external dimensions only


MAX_H1_ELEMENTS = 500


def _h1_scope_findings(payload_scope: Optional["H1ScopePayload"]) -> list:
    """Part 1 comes before Part 2: an out-of-scope building's tidy result is worth nothing."""
    declared = h1_scope.BuildingScope(**payload_scope.model_dump()) if payload_scope else None
    try:
        findings = h1_scope.check(declared)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return [asdict(f) for f in findings]


def _h1_climate_zone(climate_zone: Optional[int], territorial_authority: Optional[str]) -> int:
    """Designers know their council, not their zone number. Accept either."""
    if climate_zone is not None:
        return climate_zone
    if territorial_authority:
        return h1_regions.climate_zone_for(territorial_authority)
    raise H1TableError("Pass either climate_zone or territorial_authority")


@app.get("/api/h1/territorial-authorities")
async def h1_territorial_authorities():
    return {"territorial_authorities": h1_regions.territorial_authorities()}


@app.post("/api/h1/calculate")
async def h1_calculate(payload: H1CalculatePayload):
    if len(payload.elements) > MAX_H1_ELEMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"At most {MAX_H1_ELEMENTS} envelope elements per request",
        )
    try:
        result = h1_engine.calculate(
            [
                h1_engine.Element(e.element_type, e.area_m2, e.r_value, e.label, e.heated)
                for e in payload.elements
            ],
            climate_zone=_h1_climate_zone(payload.climate_zone, payload.territorial_authority),
            tables=h1_tables.load(),
        )
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {**asdict(result), "scope_findings": _h1_scope_findings(payload.scope)}


@app.post("/api/h1/report")
async def h1_report(payload: H1ReportPayload):
    """The consent PDF: results, BRANZ entry sheet, one page per construction."""
    if len(payload.elements) > MAX_H1_ELEMENTS:
        raise HTTPException(status_code=400, detail=f"At most {MAX_H1_ELEMENTS} envelope elements per request")
    project = payload.project or H1ProjectPayload()
    try:
        pdf = h1_report_mod.build(
            [h1_engine.Element(e.element_type, e.area_m2, e.r_value, e.label, e.heated)
             for e in payload.elements],
            climate_zone=_h1_climate_zone(payload.climate_zone,
                                          payload.territorial_authority or project.territorial_authority),
            tables=h1_tables.load(),
            project=h1_branz_export.ProjectDetails(**project.model_dump()),
            constructions=[
                h1_report_mod.Construction(
                    **{**c.model_dump(exclude={"layers"}),
                       "layers": [h1_report_mod.Layer(**l.model_dump()) for l in c.layers]})
                for c in payload.constructions
            ],
        )
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    filename = (project.project_name or "h1-calculation").replace('"', "") + ".pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.post("/api/h1/slab")
async def h1_slab(payload: H1SlabPayload):
    """Every insulation arrangement Appendix E offers for this slab, uninsulated first."""
    try:
        tables = h1_slab_mod.load()
        ratio = h1_slab_mod.area_to_perimeter(
            payload.area_m2, payload.perimeter_m, external=payload.external, w_m=payload.w_m)
        rungs = h1_slab_mod.ladder(
            tables, ratio=ratio, wall_thickness_mm=payload.wall_thickness_mm,
            masonry_veneer=payload.masonry_veneer, foundation=payload.foundation)
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "area_to_perimeter": round(ratio, 3),
        "ladder": [{**asdict(rung), "insulated": rung.insulated} for rung in rungs],
        "underslab_products": [asdict(p) for p in h1_slab_mod.underslab_products()],
        "provisional": not tables.verified,
    }


@app.post("/api/h1/headroom")
async def h1_headroom(payload: H1CalculatePayload):
    """How far each element could drop with the others held as specified.

    This is what makes the envelope feel connected rather than a list of
    independent specifications: lift the walls and the roof is free to come
    down, and by exactly this much. HLreference is fixed by geometry, so it
    falls out in closed form — no search needed.
    """
    try:
        rows = h1_engine.headroom(
            [
                h1_engine.Element(e.element_type, e.area_m2, e.r_value, e.label, e.heated)
                for e in payload.elements
            ],
            climate_zone=_h1_climate_zone(payload.climate_zone, payload.territorial_authority),
            tables=h1_tables.load(),
        )
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "headroom": [asdict(row) for row in rows],
        "scope_findings": _h1_scope_findings(payload.scope),
    }


@app.post("/api/h1/optimise")
async def h1_optimise(payload: H1OptimisePayload):
    """Rank the compliant build-up combinations by what they cost to build.

    The calculation method has no single answer — lower the slab and lift the
    walls, or keep the slab and buy better glazing, and both can land under the
    same reference heat loss. Designers currently find one by trying them a
    combination at a time. This enumerates them all and sorts by cost.
    """
    if len(payload.assemblies) > MAX_H1_ELEMENTS:
        raise HTTPException(
            status_code=400, detail=f"At most {MAX_H1_ELEMENTS} assemblies per request"
        )
    try:
        solutions = h1_optimise_mod.optimise(
            [
                h1_optimise_mod.Assembly(
                    name=a.name,
                    element_type=a.element_type,
                    area_m2=a.area_m2,
                    fixed_r=a.fixed_r,
                    require_tags=tuple(a.require_tags),
                    exclude_tags=tuple(a.exclude_tags),
                    heated=a.heated,
                )
                for a in payload.assemblies
            ],
            climate_zone=_h1_climate_zone(payload.climate_zone, payload.territorial_authority),
            tables=h1_tables.load(),
            catalogue=h1_catalogue.load(),
            exclude_tags=payload.exclude_tags,
            limit=payload.limit,
        )
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {**asdict(solutions), "scope_findings": _h1_scope_findings(payload.scope)}


@app.post("/api/h1/paste-blocks")
async def h1_paste_blocks(payload: H1ExportPayload):
    """Return tab-separated blocks the user pastes into their own BRANZ workbook.

    The default way across. We never hold or hand over BRANZ's file — the user
    downloads it from BRANZ themselves — and Excel splits tab-separated text
    across columns on paste, so one paste per sheet replaces the transcription
    step that would otherwise be where a transposed digit enters a consent.
    """
    project = payload.project or H1ProjectPayload()
    try:
        instructions = h1_branz_export.paste_blocks(
            [
                h1_branz_export.Row(
                    element_type=r.element_type,
                    description=r.label,
                    area_m2=r.area_m2,
                    r_value=r.r_value,
                    heated=r.heated,
                )
                for r in payload.rows
                if r.r_value is not None
            ],
            project=h1_branz_export.ProjectDetails(**project.model_dump()),
        )
    except H1TableError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return asdict(instructions)


@app.post("/api/h1/export")
async def h1_export(payload: H1ExportPayload):
    """Fill a copy of the BRANZ calculation workbook with a chosen specification.

    We search; BRANZ proves. A council accepts the BRANZ spreadsheet because it
    is the tool the sector already agreed on, so the deliverable is a filled copy
    of it — and nobody has to take our arithmetic on trust.
    """
    if not H1_BRANZ_TEMPLATE:
        raise HTTPException(
            status_code=503,
            detail="H1_BRANZ_TEMPLATE is not configured on this server",
        )
    project = payload.project or H1ProjectPayload()
    with tempfile.TemporaryDirectory() as workdir:
        out_path = Path(workdir) / "H1_calculation.xlsx"
        try:
            h1_branz_export.write(
                [
                    h1_branz_export.Row(
                        element_type=r.element_type,
                        description=r.label,
                        area_m2=r.area_m2,
                        r_value=r.r_value,
                        heated=r.heated,
                    )
                    for r in payload.rows
                    if r.r_value is not None
                ],
                template_path=Path(H1_BRANZ_TEMPLATE),
                output_path=out_path,
                project=h1_branz_export.ProjectDetails(**project.model_dump()),
            )
        except H1TableError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        data = out_path.read_bytes()

    name = (project.project_name or "H1").replace('"', "") or "H1"
    return Response(
        content=data,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{name} - H1 calculation.xlsx"'},
    )


