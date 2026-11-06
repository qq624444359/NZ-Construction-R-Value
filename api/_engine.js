/* The calculator's own model (js/*.js — the same files the website runs) loaded once per server instance,
   plus the request shapes the API and the MCP server share. Files starting with _ are not endpoints on Vercel. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, parseInt };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['products.js', 'h1-data.js', 'slab-appendix-e.js', 'rvalue-model.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext('globalThis.__M={calc,tpl,newC,LIB,D,KINDS,MEMBER,prodList,SLABU,strategy:typeof strategy==="function"?strategy:null}', ctx);
const M = ctx.__M, H = ctx.H1;
const VERSION = '1.0.0';
const r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;

class InputError extends Error {}
const bad = m => { throw new InputError(m); };
const ELEMENTS = ['wall', 'roof', 'floor'];

/* ---------- construction types ---------- */
function types() {
  return ELEMENTS.map(el => ({
    element: el,
    kinds: M.KINDS[el].map(k => ({
      kind: k.id, name: k.name,
      options: k.opts.map(o => ({ id: o[0], label: o[1], default: !!o[2] })),
      ...(k.slab ? { input: 'slab' } : k.manual ? { input: 'r_value' } : { input: 'layers' })
    }))
  }));
}

function build(el, kind, options) {
  if (!ELEMENTS.includes(el)) bad('element must be one of ' + ELEMENTS.join(', ') + '.');
  const K = M.KINDS[el].find(k => k.id === (kind || M.KINDS[el][0].id));
  if (!K) bad('kind "' + kind + '" is not a ' + el + ' type. Use one of: ' + M.KINDS[el].map(k => k.id).join(', ') + '.');
  const c = M.newC(el); c.kind = K.id; c.o = {};
  for (const [id, on] of Object.entries(options || {})) {
    if (!K.opts.some(o => o[0] === id)) bad('option "' + id + '" does not apply to ' + el + '/' + K.id + '. Options: ' + (K.opts.map(o => o[0]).join(', ') || 'none') + '.');
    c.o[id] = !!on;
  }
  fill(c);
  return { c, K };
}
/* the starting value of every layer, as a new construction gets on the website (rvc-v6.js ensure) */
const DEFM = { clad: 5, ab: 1, lin: 1, lin0: 1, roof: 0, ceil: 1, sark: 0, floor: 0, floor2: 0, flin: 0 }, WALL_ST = { d: 90, w: 45, s: 600 };
function fitIns(member, depth) { const L = M.prodList(member, depth).filter(([, t]) => t <= depth), b = L.length ? L.reduce((a, x) => x[0] > a[0] ? x : a) : null; return b ? { insR: b[0], insT: b[1] } : {}; }
function fill(c) {
  const t = M.tpl(c); if (t.manual) return;
  (t.slots || []).forEach(s => {
    if (c.v[s.id]) return;
    if (s.k === 'mat') c.v[s.id] = { m: s.lib === 'itBoard' ? 0 : DEFM[s.id] || 0 };
    else if (s.k === 'frame') { const d = M.MEMBER[s.member]; c.v[s.id] = Object.assign({ d: d.d, w: d.w, s: d.s, mode: 'std', insR: null, insT: null, gap: 0, cover: s.member === 'chord' }, d.dw ? { dw: d.dw } : {}, c.el === 'wall' && s.id === 'st' ? Object.assign({}, WALL_ST, fitIns(s.member, WALL_ST.d)) : {}); }
    else c.v[s.id] = {};
  });
}

/* every layer of a type, with what it accepts */
function describe({ element, kind, options } = {}) {
  const { c, K } = build(element, kind, options), t = M.tpl(c);
  const out = { element, kind: K.id, name: t.name, options: t.opts.map(o => ({ id: o.id, label: o.label, on: o.on })) };
  if (t.slab) {
    out.input = 'slab';
    out.slab = {
      area_m2: 'floor area, m² (required)', perimeter_m: 'exposed perimeter, m (required)',
      floor: ['slab', 'raft'], edge_insulation: ['none', 'r10'], underslab: Object.keys(M.SLABU),
      wall: ['other', 'masonry'], dimensions: ['internal', 'external'], wall_thickness_mm: 'effective wall thickness, default 100',
      parts: '[{length_m, edge_insulation, wall}] — parts of the perimeter with their own edge insulation or wall (Eq E.3–E.5)',
      vm1_r: 'an R-value calculated to H1/VM1 Appendix E instead of the tables (optional)'
    };
    return out;
  }
  if (t.manual) { out.input = 'r_value'; out.r_value = 'the construction R-value, m²K/W (required)'; return out; }
  out.input = 'layers';
  out.layers = t.slots.map(s => {
    const v = c.v[s.id] || {}, L = { id: s.id, label: s.label, type: s.k };
    if (s.k === 'mat') {
      L.default = (M.LIB[s.lib][v.m || 0] || {}).id;
      L.choices = M.LIB[s.lib].map(o => ({ id: o.id, name: o.n, r: o.r }));
      L.accepts = 'a choice id or name, or {"r": number} for your own R-value';
    } else if (s.k === 'frame') {
      const d = M.MEMBER[s.member] || {};
      L.member = s.member;
      L.default = { depth_mm: v.d ?? d.d, width_mm: v.w ?? d.w, centres_mm: v.s ?? d.s, ...(v.dw != null ? { dwangs_mm: v.dw } : {}),
        ...(v.insR != null ? { insulation_r: v.insR, insulation_mm: v.insT } : {}), ...(s.cover ? { covers_chords: v.cover !== false } : {}) };
      L.accepts = '{depth_mm, width_mm, centres_mm, dwangs_mm?, framing_fraction? (walls: 0.38 by default — a lower value needs evidence), insulation_r?, insulation_mm?' + (s.cover ? ', covers_chords?' : '') + '}';
      const P = M.prodList(s.member, L.default.depth_mm);
      if (P.length) L.products = P.slice(0, 40).map(p => ({ r: p[0], mm: p[1], name: p[2] || undefined }));
    } else if (s.k === 'ins') {
      L.default = v.on === false ? null : { r: v.r, mm: v.t };
      L.accepts = s.opt ? '{r, mm} to add this layer, or null' : '{r, mm}';
    } else if (s.k === 'fix') { L.r = s.r; L.accepts = 'fixed — not an input'; }
    else if (s.k === 'gap') { L.accepts = 'automatic'; }
    return L;
  });
  return out;
}

/* a library choice by id, exact name, or the one name that contains the text */
function pick(lib, want, label) {
  const L = M.LIB[lib], s = String(want).trim().toLowerCase();
  let i = L.findIndex(o => o.id === s || o.n.toLowerCase() === s);
  if (i < 0) { const m = L.map((o, k) => [o, k]).filter(([o]) => o.n.toLowerCase().includes(s) || o.id.includes(s.replace(/\s+/g, '-'))); if (m.length === 1) i = m[0][1]; else if (m.length > 1) bad(label + ': "' + want + '" matches ' + m.map(([o]) => '"' + o.n + '"').join(', ') + ' — use the id.'); }
  if (i < 0) bad(label + ': "' + want + '" is not in the list. Choices: ' + L.map(o => o.id).join(', ') + '.');
  return i;
}
const num = (x, label) => { if (x == null || x === '') return undefined; const n = +x; if (!isFinite(n)) bad(label + ' must be a number.'); return n; };

/* ---------- R-value of one construction ---------- */
function construction(body = {}) {
  let c;
  if (body.construction) {                    /* a construction exactly as the calculator saves it */
    c = JSON.parse(JSON.stringify(body.construction));
    if (!ELEMENTS.includes(c.el)) bad('construction.el must be one of ' + ELEMENTS.join(', ') + '.');
  } else {
    ({ c } = build(body.element, body.kind, body.options));
    const t = M.tpl(c), lay = body.layers || {};
    if (t.slab) {
      const s = body.slab || bad('This is a slab-on-ground floor: give "slab": {area_m2, perimeter_m, …}.');
      c.area = num(s.area_m2, 'slab.area_m2') ?? bad('slab.area_m2 is required.');
      const sv = c.v.slab = { sP: num(s.perimeter_m, 'slab.perimeter_m') ?? bad('slab.perimeter_m is required.'),
        sF: s.floor || 'slab', sE: s.edge_insulation || 'none', sU: s.underslab || 'none', sWall: s.wall || 'other',
        sM: s.dimensions === 'internal' ? 'int' : 'ext', sT: num(s.wall_thickness_mm, 'slab.wall_thickness_mm') ?? 100 };
      if (!['slab', 'raft'].includes(sv.sF)) bad('slab.floor must be slab or raft.');
      if (!['none', 'r10'].includes(sv.sE)) bad('slab.edge_insulation must be none or r10.');
      if (!M.SLABU[sv.sU]) bad('slab.underslab must be one of ' + Object.keys(M.SLABU).join(', ') + '.');
      if (!['other', 'masonry'].includes(sv.sWall)) bad('slab.wall must be other or masonry.');
      if (Array.isArray(s.parts)) sv.parts = s.parts.map((p, i) => ({ name: p.name || 'Part ' + (i + 1), len: num(p.length_m, 'parts[' + i + '].length_m'), sE: p.edge_insulation || 'none', sWall: p.wall || 'other' }));
      if (s.vm1_r != null) { sv.vm1 = true; sv.vmR = num(s.vm1_r, 'slab.vm1_r'); sv.vmSrc = s.vm1_source || ''; }
    } else if (t.manual) {
      const R = num(body.r_value, 'r_value'); if (!(R > 0)) bad('This type takes the R-value itself: give "r_value".');
      c.manualR = R;
    } else {
      for (const [id, val] of Object.entries(lay)) {
        const s = t.slots.find(x => x.id === id);
        if (!s) bad('layer "' + id + '" is not in ' + c.el + '/' + c.kind + '. Layers: ' + t.slots.map(x => x.id).join(', ') + '.');
        const v = c.v[id] = c.v[id] || {};
        if (s.k === 'mat') {
          if (val && typeof val === 'object') { if (val.id || val.name) v.m = pick(s.lib, val.id || val.name, id); if (val.r != null) v.r = num(val.r, id + '.r'); }
          else { v.m = pick(s.lib, val, id); delete v.r; }
        } else if (s.k === 'frame') {
          const f = val || {}, set = (k, x, l) => { const n = num(x, id + '.' + l); if (n != null) v[k] = n; };
          set('d', f.depth_mm, 'depth_mm'); set('w', f.width_mm, 'width_mm'); set('s', f.centres_mm, 'centres_mm'); set('dw', f.dwangs_mm, 'dwangs_mm');
          set('insR', f.insulation_r, 'insulation_r'); set('insT', f.insulation_mm, 'insulation_mm');
          if (f.framing_fraction != null) { const p = num(f.framing_fraction, id + '.framing_fraction'); v.mode = s.member === 'stud' ? 'dem' : 'pct'; v.pct = p > 1 ? p : p * 100; }   /* a wall fraction below 38% needs evidence (2.1.3.1 a) i)) */
          if (f.covers_chords != null) v.cover = !!f.covers_chords;
          if (f.insulation_r != null && f.product) v.prod = String(f.product);
          if (id === 'st') delete v.s450;
        } else if (s.k === 'ins') {
          if (val == null || val === false) { v.on = false; }
          else { v.on = true; v.r = num(val.r, id + '.r') ?? bad(id + '.r is required.'); v.t = num(val.mm, id + '.mm') ?? v.t; }
        } else bad('layer "' + id + '" is fixed and takes no input.');
      }
    }
  }
  if (body.name) c.name = String(body.name).slice(0, 120);
  const res = M.calc(c), t = M.tpl(c);
  if (!(res.total > 0)) {
    const L = c.el === 'floor' && c.kind === 'slab' ? (res.slab || {}) : {};
    bad(L.why || (res.notes || []).join(' ') || 'This construction has no R-value — check the inputs.');
  }
  const min = { roof: 2.6, wall: 1.0, floor: c.kind === 'slab' ? null : 1.3 }[c.el];
  return {
    element: c.el, kind: c.kind, name: c.name || t.name, type: t.name,
    r_value: r2(res.total), r_exact: r3(res.total),
    minimum_r: min, meets_minimum: min == null ? null : res.total >= min - 1e-9,
    layers: (res.rows || []).map(r => {
      const o = { name: r.name, r: r3(+r.r || 0) };
      if (r.half) o.counted_at_half = true;
      if (r.regions) o.paths = r.regions.map(g => ({ name: g.name, fraction: r3(g.f), r: r3(g.r) }));
      return o;
    }),
    notes: res.notes || [],
    method: 'NZS 4214:2006 isothermal planes as modified by H1/AS1 6th edition 2.1.3.2; slab-on-ground by H1/AS1 Appendix E',
    construction: c
  };
}

/* ---------- H1/AS1 Calculation Method check (the BRANZ tool's sums) ---------- */
const SHEETS = { roof: 'Roof', wall: 'Walls', slab: 'Slab Floors', floor: 'Other Floors', skylight: 'Skylights', glazing: 'Glazing (walls & doors)', door: 'Doors (opaque)' };
function h1Check(body = {}) {
  const z = num(body.climate_zone ?? body.zone, 'climate_zone');
  if (!(z >= 1 && z <= 6) || z % 1) bad('climate_zone must be 1–6 (H1/AS1 Appendix C).');
  const els = body.elements; if (!Array.isArray(els) || !els.length) bad('elements must be a list of {type, area_m2, r_value}.');
  const T = H.REFR(z), HR = H.HEATR(z), rd = x => Math.round(x * 100) / 100, sum = {}, rows = [], errors = [];
  let hp = 0;
  els.forEach((e, i) => {
    const type = e.type, sh = SHEETS[type];
    if (!sh) bad('elements[' + i + '].type must be one of ' + Object.keys(SHEETS).join(', ') + '.');
    const A = rd(num(e.area_m2, 'elements[' + i + '].area_m2') ?? bad('elements[' + i + '].area_m2 is required.'));
    const R = rd(num(e.r_value, 'elements[' + i + '].r_value') ?? bad('elements[' + i + '].r_value is required.'));
    if (!(A >= 0) || !(R > 0)) bad('elements[' + i + ']: area_m2 must be ≥ 0 and r_value > 0.');
    sum[sh] = (sum[sh] || 0) + A; hp += A / R;
    const heated = !!e.heated, per = !!e.ceiling_perimeter, name = e.name || sh;
    let need = null;
    if (type === 'roof') need = per ? (heated ? 3.3 : 2.6) : (heated ? 6.6 : 2.6);
    else if (type === 'wall') need = heated ? 2.9 : 1.0;
    else if (type === 'floor') need = heated ? HR.susp : 1.3;
    else if (type === 'slab' && heated) need = HR.slab;
    const ok = need == null || R >= need - 1e-9;
    if (!ok) errors.push(name + ' R' + R.toFixed(2) + ' is under its minimum R' + need.toFixed(1) + (heated ? ' (heated, Table 2.1.2.12)' : ' (2.1.2.11)'));
    rows.push({ name, sheet: sh, area_m2: A, r_value: R, heat_loss_w_k: r2(A / R), minimum_r: need, ok });
  });
  const g = k => sum[k] || 0, gross = g('Walls') + g('Glazing (walls & doors)') + g('Doors (opaque)');
  const pct = gross ? g('Glazing (walls & doors)') / gross * 100 : 0;
  if (pct > 40 + 1e-9) errors.push('Glazing is ' + pct.toFixed(1) + '% of the gross wall — over the 40% limit of the Calculation Method (2.1.2.5).');
  const hr = (g('Roof') + g('Skylights')) / T.roof + gross * .7 / T.wall + gross * .3 / T.glz + g('Slab Floors') / T.slab + g('Other Floors') / T.susp;
  return {
    result: hp <= hr + 1e-9 && !errors.length ? 'PASS' : 'FAIL',
    climate_zone: z,
    heat_loss_proposed_w_k: r2(hp), heat_loss_reference_w_k: r2(hr), margin_w_k: r2(hr - hp),
    glazing_percent_of_gross_wall: r2(pct), errors, rows,
    reference_building: { roof_r: T.roof, wall_r: T.wall, glazing_r: T.glz, slab_r: T.slab, other_floor_r: T.susp, wall_share: 0.7, glazing_share: 0.3 },
    method: 'H1/AS1 6th edition Calculation Method, Equation 2.1 (as the BRANZ H1/AS1 calculation tool works it: area ÷ R as typed, 2 decimals). The BRANZ tool’s own result is the one for the consent.'
  };
}

module.exports = { VERSION, types, describe, construction, h1Check, InputError };
