# -*- coding: utf-8 -*-
"""H1 check from this Revit model, and a link that opens the calculator filled in.

One click:
  1. sums the area of every element tagged for H1 (walls, roofs, floors, ceilings,
     windows, doors - and the perimeter of slab floors);
  2. sends the areas and R-values to https://rvalue.ezbuild.co.nz/api/v1/h1-check and
     shows PASS / FAIL with the heat-loss table, the way the BRANZ H1/AS1 tool works it;
  3. makes a link to https://rvalue.ezbuild.co.nz with the whole project in it -
     address, client, every construction with its area, every window and door with its
     size - copies it to the clipboard and opens it in your browser. The project travels
     in the link itself (after #); nothing is stored on a server.

Set up (once per project or template) - shared or project parameters:
  H1 Element   (Text, on the type or the instance): roof, wall, slab, floor,
               skylight, glazing or door. Elements without it are left out.
  H1 R-value   (Number, on the type or the instance): the construction R-value,
               e.g. from rvalue.ezbuild.co.nz. Windows and doors: their R.
               Optional for the link: without it the calculator starts that type
               from its own default construction for you to fill in.
  H1 Climate Zone (Integer, Project Information): 1-6.
Optional: H1 Heated (Yes/No), H1 Ceiling Perimeter (Yes/No) on roofs,
          H1 DP Lot (Text, Project Information), e.g. "Lot 1 DP 58577".
Project Information's Project Address, Client Name and Author fill the calculator's
address, client and designer.

Areas: walls, roofs, floors and ceilings use Revit's computed area; windows, doors and
skylights use width x height. H1/AS1 2.1.2.10 asks for finished internal-face areas -
check the areas Revit gives against that before relying on the result. The BRANZ tool's
own result is the one for the consent.

Install: download https://rvalue.ezbuild.co.nz/revit/EZbuild.extension.zip, unzip it into
a folder of your own, and add that folder in pyRevit Settings > Custom Extension
Directories, then Save Settings and Reload.
"""
import json
import base64
from pyrevit import revit, DB, forms, script

SITE = 'https://rvalue.ezbuild.co.nz/'
API = SITE + 'api/v1/h1-check'
P_EL, P_R, P_ZONE = 'H1 Element', 'H1 R-value', 'H1 Climate Zone'
P_HEAT, P_PER, P_LEGAL = 'H1 Heated', 'H1 Ceiling Perimeter', 'H1 DP Lot'
FT2_M2, FT_M = 0.09290304, 0.3048
TYPES = ('roof', 'wall', 'slab', 'floor', 'skylight', 'glazing', 'door')
OPENINGS = ('glazing', 'door', 'skylight')

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
            bp = getattr(DB.BuiltInParameter, n, None)
            if bp is None:
                continue
            p = e.get_Parameter(bp)
            if p is not None and p.HasValue and p.AsDouble() > 0:
                return p.AsDouble()
    return 0.0


def size_mm(el):
    w = bip(el, 'WINDOW_WIDTH', 'DOOR_WIDTH', 'FAMILY_WIDTH_PARAM', 'FURNITURE_WIDTH')
    h = bip(el, 'WINDOW_HEIGHT', 'DOOR_HEIGHT', 'FAMILY_HEIGHT_PARAM', 'GENERIC_HEIGHT')
    return int(round(w * FT_M * 1000)), int(round(h * FT_M * 1000))


def info(name, *bips):
    """A Project Information value: a named parameter, else a built-in one."""
    pi = doc.ProjectInformation
    v = pval(pi, name) if name else None
    if v:
        return v
    for n in bips:
        bp = getattr(DB.BuiltInParameter, n, None)
        p = pi.get_Parameter(bp) if bp is not None else None
        if p is not None and p.HasValue and p.AsString():
            return p.AsString()
    return ''


cats = [DB.BuiltInCategory.OST_Walls, DB.BuiltInCategory.OST_Roofs, DB.BuiltInCategory.OST_Floors,
        DB.BuiltInCategory.OST_Ceilings, DB.BuiltInCategory.OST_Windows, DB.BuiltInCategory.OST_Doors]
rows, ops, skipped = {}, {}, []
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
            r = round(float(r), 2) if r is not None else None
        except (TypeError, ValueError):
            r = None
        tp = doc.GetElement(el.GetTypeId())
        name = DB.Element.Name.GetValue(tp) if tp else el.Category.Name
        if t in OPENINGS:
            w, h = size_mm(el)
            if not (w and h):
                skipped.append('{} {}: no width / height'.format(el.Category.Name, el.Id))
                continue
            key = (t, name, r, w, h)
            ops[key] = ops.get(key, 0) + 1
        else:
            key = (t, name, r, bool(pval(el, P_HEAT)), bool(pval(el, P_PER)))
            a, per = rows.get(key, (0.0, 0.0))
            rows[key] = (a + bip(el, 'HOST_AREA_COMPUTED') * FT2_M2,
                         per + (bip(el, 'HOST_PERIMETER_COMPUTED') * FT_M if t == 'slab' else 0.0))

if not rows and not ops:
    forms.alert('Nothing to check: tag walls, roofs, floors, windows and doors with "{}" (and "{}").'.format(P_EL, P_R), exitscript=True)

zone = pval(doc.ProjectInformation, P_ZONE)
if not zone:
    zone = forms.ask_for_one_item(['1', '2', '3', '4', '5', '6'], default='1', prompt='H1 climate zone (Appendix C)', title='H1 check')
zone = int(zone) if zone else None

# ---------- the seed: the whole project, for the calculator link ----------
seed = {
    'format': 'ezbuild-h1-seed', 'version': 1, 'source': 'Revit', 'climate_zone': zone,
    'proj': {'address': info(None, 'PROJECT_ADDRESS'), 'client': info(None, 'CLIENT_NAME'),
             'designer': info(None, 'PROJECT_AUTHOR'), 'legal': info(P_LEGAL)},
    'elements': [], 'openings': []}
for k, (a, per) in sorted(rows.items()):
    if a <= 0:
        continue
    e = {'type': k[0], 'name': k[1], 'area_m2': round(a, 2), 'r_value': k[2]}
    if k[0] == 'slab' and per > 0:
        e['perimeter_m'] = round(per, 2)
    if k[3]:
        e['heated'] = True
    seed['elements'].append(e)
for k, n in sorted(ops.items()):
    seed['openings'].append({'type': k[0], 'name': k[1], 'r_value': k[2], 'width_mm': k[3], 'height_mm': k[4], 'qty': n})

def b64(b):
    s = base64.urlsafe_b64encode(b)
    return (s if isinstance(s, str) else s.decode('ascii')).rstrip('=')


raw = json.dumps(seed, separators=(',', ':')).encode('ascii')   # ASCII only: names with accents are escaped
try:
    import zlib
    payload = 'z.' + b64(zlib.compress(raw, 9))
except Exception:
    payload = 'j.' + b64(raw)
link = SITE + '#h1=' + payload

# ---------- the H1 check: only elements with an R-value ----------
elements = []
for k, (a, per) in sorted(rows.items()):
    if a > 0 and k[2]:
        elements.append({'type': k[0], 'name': k[1], 'r_value': k[2], 'area_m2': round(a, 2), 'heated': k[3], 'ceiling_perimeter': k[4]})
for k, n in sorted(ops.items()):
    if k[2]:
        elements.append({'type': k[0], 'name': k[1], 'r_value': k[2], 'area_m2': round(k[3] * k[4] * n / 1e6, 2)})
no_r = sorted(set(k[1] for k in list(rows) + list(ops) if not k[2]))

res = None
if zone and elements:
    from System.Net import WebClient
    from System.Text import Encoding
    wc = WebClient()
    wc.Headers.Add('Content-Type', 'application/json')
    wc.Encoding = Encoding.UTF8
    try:
        res = json.loads(wc.UploadString(API, 'POST', json.dumps({'climate_zone': zone, 'elements': elements})))
    except Exception as ex:
        out.print_md('**The H1 check could not be reached:** {}'.format(ex))

if res:
    out.print_md('## H1 check: **{}**'.format(res['result']))
    out.print_md('Climate zone {} - proposed heat loss **{} W/K**, reference **{} W/K**, margin {} W/K. Glazing {}% of the gross wall.'.format(
        res['climate_zone'], res['heat_loss_proposed_w_k'], res['heat_loss_reference_w_k'], res['margin_w_k'], res['glazing_percent_of_gross_wall']))
    for e in res.get('errors', []):
        out.print_md('- **{}**'.format(e))
    out.print_table([[r['name'], r['sheet'], r['area_m2'], r['r_value'], r['heat_loss_w_k']] for r in res['rows']],
                    columns=['Element', 'BRANZ sheet', 'Area m2', 'R', 'W/K'])
    out.print_md('_{}_'.format(res.get('method', '')))
if no_r:
    out.print_md('No **{}** yet - left out of the check, set up from the default construction in the calculator: {}'.format(P_R, ', '.join(no_r)))
if skipped:
    out.print_md('Left out:\n' + '\n'.join('- ' + s for s in skipped))

# ---------- the link ----------
copied = False
try:
    script.clipboard_copy(link)
    copied = True
except Exception:
    try:
        import clr
        clr.AddReference('System.Windows.Forms')
        from System.Windows.Forms import Clipboard
        Clipboard.SetText(link)
        copied = True
    except Exception:
        pass
out.print_md('### The calculator, filled in from this model')
out.print_md('[Open in the calculator]({}){}'.format(link, ' - the link is on the clipboard.' if copied else ''))
if forms.alert('Open the calculator filled in from this model?', sub_msg='{} constructions, {} window and door types.'.format(len(seed['elements']), len(seed['openings'])),
               yes=True, no=True):
    from System.Diagnostics import Process
    Process.Start(link)
