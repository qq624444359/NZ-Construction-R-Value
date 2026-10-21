"""
The PDF a designer attaches to a building consent: the H1/AS1 calculation, how
each construction R-value was arrived at, and the numbers to enter into BRANZ's
workbook.

It is our own report, laid out after what councils already read — proposed
building against reference building, the element schedule, the verdict — but it
does not copy BRANZ's sheet. Every figure comes from `engine.calculate`, so the
report can never disagree with what the website showed.

Sections, each starting on a new page:

  1. Results           project, proposed vs reference heat loss, verdict, schedule
  2. BRANZ entry       per workbook sheet: anchor cell and the rows to type or paste
  3. Constructions     one page per build-up: layers, framing fraction, total R
"""
from __future__ import annotations

import html
import io
from dataclasses import dataclass, field
from typing import List, Optional, Sequence

import pymupdf

from h1 import branz_export, engine
from h1.tables import Tables

TYPE_NAMES = {
    "slab_on_ground_floor": "Slab floors",
    "other_floor": "Other floors",
    "roof": "Roof",
    "skylight": "Skylights",
    "wall": "Walls",
    "glazing": "Glazing (walls & doors)",
    "opaque_door": "Doors (opaque)",
}
REFERENCE_NAMES = {
    "slab_on_ground": "Slab floors",
    "other_floor": "Other floors",
    "roof_and_skylight": "Roof (gross, includes skylights)",
    "wall": "Walls (70% of gross wall area)",
    "glazing": "Glazing allowance (30% of gross wall area)",
}

CSS = """
* { font-family: sans-serif; }
body { font-size: 9pt; color: #1b2333; }
h1 { font-size: 15pt; margin: 0 0 2pt 0; }
h2 { font-size: 11pt; margin: 12pt 0 4pt 0; }
.sub { color: #5d6880; font-size: 8pt; margin-bottom: 8pt; }
table { border-collapse: collapse; width: 100%; margin-bottom: 6pt; }
th { text-align: left; font-size: 8pt; color: #5d6880; border-bottom: 1px solid #9aa3b5; padding: 2pt 4pt; }
td { border-bottom: 1px solid #e3e7ef; padding: 2pt 4pt; }
.num { text-align: right; }
.total td { font-weight: bold; border-top: 1px solid #1b2333; }
.pass { color: #17803d; font-weight: bold; font-size: 13pt; }
.fail { color: #b42318; font-weight: bold; font-size: 13pt; }
.warn { color: #b54708; }
.note { color: #5d6880; font-size: 8pt; }
.mono { font-family: monospace; }
"""


@dataclass(frozen=True)
class Layer:
    name: str
    thickness_mm: Optional[float] = None
    r_value: Optional[float] = None       # None prints as a dash, never a guess


@dataclass(frozen=True)
class Construction:
    name: str
    element_type: str
    total_r: float
    method: str = ""                      # e.g. "NZS 4214 isothermal planes"
    framing_fraction: Optional[float] = None
    layers: List[Layer] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


def _e(text) -> str:
    return html.escape(str(text))


def _n(value: Optional[float], places: int = 1) -> str:
    return "—" if value is None else f"{value:,.{places}f}"


def build(
    elements: Sequence[engine.Element],
    climate_zone: int,
    tables: Tables,
    project: Optional[branz_export.ProjectDetails] = None,
    constructions: Sequence[Construction] = (),
) -> bytes:
    """Render the report. Returns the PDF as bytes."""
    project = project or branz_export.ProjectDetails()
    result = engine.calculate(elements, climate_zone, tables)
    rows = [
        branz_export.Row(e.element_type, e.label or TYPE_NAMES[e.element_type], e.area_m2,
                         loss.r_value, e.heated)
        for e, loss in zip(elements, result.proposed)
    ]
    sections = [_results(result, project, elements), _branz(rows, project)]
    sections += [_construction(c) for c in constructions]

    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)
    page = pymupdf.paper_rect("a4")
    frame = page + (40, 40, -40, -40)
    for body in sections:
        story = pymupdf.Story(html=f"<body>{body}</body>", user_css=CSS)
        more = True
        while more:
            device = writer.begin_page(page)
            more, _ = story.place(frame)
            story.draw(device)
            writer.end_page()
    writer.close()
    return buffer.getvalue()


def _header(title: str, project: branz_export.ProjectDetails, extra: str = "") -> str:
    who = " · ".join(_e(v) for v in (project.project_name, project.address) if v)
    return f"<h1>{_e(title)}</h1><div class='sub'>{who}{extra}</div>"


def _results(result: engine.Result, project: branz_export.ProjectDetails,
             elements: Sequence[engine.Element]) -> str:
    details = [
        ("Client", project.client), ("Project", project.project_name),
        ("Address", project.address), ("Designer", project.designer), ("Date", project.date),
        ("Territorial authority", project.territorial_authority),
        ("Climate zone", str(result.climate_zone)), ("Edition", result.edition),
    ]
    out = [_header("H1/AS1 calculation method — results", project)]
    # label above value, two to a row: the PDF engine does not honour column widths
    cells = [f"<td><span class='note'>{k}</span><br/>{_e(v) if v else '—'}</td>" for k, v in details]
    out.append("<table>" + "".join(
        f"<tr>{''.join(cells[i:i + 2])}</tr>" for i in range(0, len(cells), 2)
    ) + "</table>")

    verdict = "PASS" if result.complies else "FAIL"
    out.append(f"<p class='{verdict.lower()}'>{verdict}</p>")
    out.append(
        f"<p>Proposed heat loss <b>{_n(result.proposed_heat_loss)}</b> W/K against a reference of "
        f"<b>{_n(result.reference_heat_loss)}</b> W/K — margin {_n(result.margin)} W/K. "
        f"Glazing is {result.wall_glazing_fraction * 100:.1f}% of the gross wall area"
        f"{'' if result.glazing_limit_ok else ' — above the 40% limit of 2.1.2.5'}.</p>"
    )

    by_type = {}
    for loss in result.proposed:
        area, heat = by_type.get(loss.element_type, (0.0, 0.0))
        by_type[loss.element_type] = (area + loss.area_m2, heat + loss.heat_loss)
    out.append("<h2>Proposed building</h2><table><tr><th>Element</th><th class='num'>Area (m²)</th>"
               "<th class='num'>Heat loss (W/K)</th></tr>")
    for t, name in TYPE_NAMES.items():
        if t in by_type:
            out.append(f"<tr><td>{name}</td><td class='num'>{_n(by_type[t][0])}</td>"
                       f"<td class='num'>{_n(by_type[t][1])}</td></tr>")
    out.append(f"<tr class='total'><td>Total</td><td></td>"
               f"<td class='num'>{_n(result.proposed_heat_loss)}</td></tr></table>")

    out.append("<h2>Reference building</h2><table><tr><th>Element</th><th class='num'>Area (m²)</th>"
               "<th class='num'>R (m²·K/W)</th><th class='num'>Heat loss (W/K)</th></tr>")
    for loss in result.reference:
        out.append(f"<tr><td>{_e(REFERENCE_NAMES.get(loss.element_type, loss.label))}</td>"
                   f"<td class='num'>{_n(loss.area_m2)}</td><td class='num'>{_n(loss.r_value, 2)}</td>"
                   f"<td class='num'>{_n(loss.heat_loss)}</td></tr>")
    out.append(f"<tr class='total'><td>Total</td><td></td><td></td>"
               f"<td class='num'>{_n(result.reference_heat_loss)}</td></tr></table>")

    out.append("<h2>Element schedule</h2><table><tr><th>#</th><th>Type</th><th>Description</th>"
               "<th>Heated</th><th class='num'>Area (m²)</th><th class='num'>R (m²·K/W)</th>"
               "<th class='num'>Heat loss (W/K)</th></tr>")
    for i, (el, loss) in enumerate(zip(elements, result.proposed), 1):
        out.append(f"<tr><td>{i}</td><td>{TYPE_NAMES[el.element_type]}</td><td>{_e(el.label)}</td>"
                   f"<td>{'Yes' if el.heated else 'No'}</td><td class='num'>{_n(loss.area_m2)}</td>"
                   f"<td class='num'>{_n(loss.r_value, 2)}</td><td class='num'>{_n(loss.heat_loss)}</td></tr>")
    out.append("</table>")

    for below in result.below_minimum:
        out.append(f"<p class='warn'>{_e(below.label)}: R{below.r_value:.2f} is below the "
                   f"R{below.minimum:.2f} minimum of {_e(below.rule)}.</p>")
    for note in result.notes:
        out.append(f"<p class='note'>{_e(note)}</p>")
    if result.provisional:
        out.append("<p class='warn'>Provisional: the H1/AS1 figures in this tool have not yet been "
                   "checked against the printed standard by a person.</p>")
    return "".join(out)


def _branz(rows: Sequence[branz_export.Row], project: branz_export.ProjectDetails) -> str:
    paste = branz_export.paste_blocks(rows, project)
    out = [_header("Entering this into the BRANZ workbook", project),
           "<p>Download the H1/AS1 6th edition calculation method spreadsheet from BRANZ. On each "
           "sheet below, click the anchor cell and type the rows — or use Copy on the website, "
           "which pastes the whole sheet at once. Only the input columns are covered.</p>"]
    if paste.project:
        out.append("<h2>Project Details</h2><table><tr><th>Cell</th><th>Field</th><th>Value</th></tr>")
        out += [f"<tr><td class='mono'>{p['cell']}</td><td>{p['label']}</td><td>{_e(p['value'])}</td></tr>"
                for p in paste.project]
        out.append("</table>")
    for block in paste.blocks:
        out.append(f"<h2>{_e(block.sheet)} <span class='note'>— start at "
                   f"<span class='mono'>{block.anchor}</span>, fills {block.span}</span></h2>")
        out.append("<table><tr><th>Row</th>" + "".join(f"<th>{_e(h)}</th>" for h in block.headers)
                   + "</tr>")
        for offset, cells in enumerate(block.rows):
            out.append(f"<tr><td class='mono'>{branz_export.FIRST_ROW + offset}</td>"
                       + "".join(f"<td>{_e(c)}</td>" for c in cells) + "</tr>")
        out.append("</table>")
    return "".join(out)


def _construction(c: Construction) -> str:
    out = [f"<h1>{_e(c.name)}</h1>",
           f"<div class='sub'>{TYPE_NAMES[c.element_type]}"
           f"{' · ' + _e(c.method) if c.method else ''}</div>",
           f"<p>Construction R-value <b>R{c.total_r:.2f}</b> m²·K/W"]
    if c.framing_fraction is not None:
        out.append(f" · framing fraction {c.framing_fraction * 100:.1f}%")
    out.append("</p>")
    if c.layers:
        out.append("<table><tr><th>Layer</th><th class='num'>Thickness (mm)</th>"
                   "<th class='num'>R (m²·K/W)</th></tr>")
        out += [f"<tr><td>{_e(l.name)}</td><td class='num'>{_n(l.thickness_mm, 0)}</td>"
                f"<td class='num'>{_n(l.r_value, 2)}</td></tr>" for l in c.layers]
        out.append("</table>")
    out += [f"<p class='note'>{_e(n)}</p>" for n in c.notes]
    return "".join(out)
