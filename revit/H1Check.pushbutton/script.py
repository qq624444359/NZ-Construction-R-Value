# -*- coding: utf-8 -*-
"""H1 check from this Revit model, by the EZbuild Construction R-value API.

Sums the area of every element tagged for H1, sends the areas and R-values to
https://rvalue.ezbuild.co.nz/api/v1/h1-check and shows PASS / FAIL with the
heat-loss table, the way the BRANZ H1/AS1 calculation tool works it.

Set up (once per project or template) - shared or project parameters:
  H1 Element   (Text, on the type or the instance): roof, wall, slab, floor,
               skylight, glazing or door. Elements without it are left out.
  H1 R-value   (Number, on the type or the instance): the construction R-value,
               e.g. from rvalue.ezbuild.co.nz. Windows and doors: their R.
  H1 Climate Zone (Integer, Project Information): 1-6.
Optional: H1 Heated (Yes/No) and H1 Ceiling Perimeter (Yes/No) on roofs.

Areas: walls, roofs, floors and ceilings use Revit's computed area; windows,
doors and skylights use width x height. H1/AS1 2.1.2.10 asks for finished
internal-face areas - check the areas Revit gives against that before relying
on the result. The BRANZ tool's own result is the one for the consent.

Put this file in a pushbutton folder of a pyRevit extension, e.g.
  EZbuild.extension/EZbuild.tab/H1.panel/H1Check.pushbutton/script.py
"""
import json
from pyrevit import revit, DB, forms, script

API = 'https://rvalue.ezbuild.co.nz/api/v1/h1-check'
P_EL, P_R, P_ZONE = 'H1 Element', 'H1 R-value', 'H1 Climate Zone'
P_HEAT, P_PER = 'H1 Heated', 'H1 Ceiling Perimeter'
FT2_M2, FT_M = 0.09290304, 0.3048
TYPES = ('roof', 'wall', 'slab', 'floor', 'skylight', 'glazing', 'door')

doc = revit.doc
out = script.get_output()


def pval(el, name):
    """A parameter's value from the instance, then its type."""
    for e in (el, doc.GetElement(el.GetTypeId())):
        if e is None:
            continue
        p = e.LookupParameter(name)
        if p is None or not p.HasValue:
            continue
        st = p.StorageType
        if st == DB.StorageType.String:
            return p.AsString()
        if st == DB.StorageType.Integer:
            return p.AsInteger()
        if st == DB.StorageType.Double:
            return p.AsDouble()
    return None


def bip(el, *names):
    """The first built-in parameter found on the instance or its type, as a double (internal units)."""
    for e in (el, doc.GetElement(el.GetTypeId())):
        if e is None:
            continue
        for n in names:
            p = e.get_Parameter(getattr(DB.BuiltInParameter, n))
            if p is not None and p.HasValue and p.AsDouble() > 0:
                return p.AsDouble()
    return 0.0


def area_m2(el, h1type):
    if h1type in ('glazing', 'door', 'skylight'):
        w = bip(el, 'WINDOW_WIDTH', 'DOOR_WIDTH', 'FAMILY_WIDTH_PARAM', 'FURNITURE_WIDTH')
        h = bip(el, 'WINDOW_HEIGHT', 'DOOR_HEIGHT', 'FAMILY_HEIGHT_PARAM', 'GENERIC_HEIGHT')
        return w * FT_M * h * FT_M
    return bip(el, 'HOST_AREA_COMPUTED') * FT2_M2


cats = [DB.BuiltInCategory.OST_Walls, DB.BuiltInCategory.OST_Roofs, DB.BuiltInCategory.OST_Floors,
        DB.BuiltInCategory.OST_Ceilings, DB.BuiltInCategory.OST_Windows, DB.BuiltInCategory.OST_Doors]
rows, skipped = {}, []
for cat in cats:
    for el in DB.FilteredElementCollector(doc).OfCategory(cat).WhereElementIsNotElementType():
        t = pval(el, P_EL)
        if not t:
            continue
        t = str(t).strip().lower()
        if t not in TYPES:
            skipped.append('{} {}: "{}" is not one of {}'.format(el.Category.Name, el.Id, t, ', '.join(TYPES)))
            continue
        r = pval(el, P_R)
        try:
            r = float(r)
        except (TypeError, ValueError):
            skipped.append('{} {}: no {}'.format(el.Category.Name, el.Id, P_R))
            continue
        tp = doc.GetElement(el.GetTypeId())
        name = DB.Element.Name.GetValue(tp) if tp else el.Category.Name
        key = (t, name, round(r, 2), bool(pval(el, P_HEAT)), bool(pval(el, P_PER)))
        rows[key] = rows.get(key, 0.0) + area_m2(el, t)

zone = pval(doc.ProjectInformation, P_ZONE)
if not zone:
    zone = forms.ask_for_one_item(['1', '2', '3', '4', '5', '6'], default='1', prompt='H1 climate zone (Appendix C)', title='H1 check')
if not zone or not rows:
    forms.alert('Nothing to check: tag walls, roofs, floors, windows and doors with "{}" and "{}".'.format(P_EL, P_R), exitscript=True)

elements = [{'type': k[0], 'name': k[1], 'r_value': k[2], 'area_m2': round(a, 2), 'heated': k[3], 'ceiling_perimeter': k[4]}
            for k, a in sorted(rows.items()) if a > 0]
body = json.dumps({'climate_zone': int(zone), 'elements': elements})

from System.Net import WebClient
from System.Text import Encoding
wc = WebClient()
wc.Headers.Add('Content-Type', 'application/json')
wc.Encoding = Encoding.UTF8
try:
    res = json.loads(wc.UploadString(API, 'POST', body))
except Exception as e:
    forms.alert('The H1 check could not be reached: {}'.format(e), exitscript=True)

out.print_md('## H1 check: **{}**'.format(res['result']))
out.print_md('Climate zone {} - proposed heat loss **{} W/K**, reference **{} W/K**, margin {} W/K. Glazing {}% of the gross wall.'.format(
    res['climate_zone'], res['heat_loss_proposed_w_k'], res['heat_loss_reference_w_k'], res['margin_w_k'], res['glazing_percent_of_gross_wall']))
for e in res.get('errors', []):
    out.print_md('- **{}**'.format(e))
out.print_table([[r['name'], r['sheet'], r['area_m2'], r['r_value'], r['heat_loss_w_k']] for r in res['rows']],
                columns=['Element', 'BRANZ sheet', 'Area m2', 'R', 'W/K'])
if skipped:
    out.print_md('Left out:\n' + '\n'.join('- ' + s for s in skipped))
out.print_md('_{}_'.format(res.get('method', '')))
