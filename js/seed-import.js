/* Filling the calculator from outside: a Revit link and a PDF drawing set — all in the browser, nothing uploaded.
   Both produce one "seed" that rvc-v6.js turns into a project:
   { format:"ezbuild-h1-seed", version:1, source:"Revit"|"PDF",
     proj:{ address, client, designer, legal, date },  climate_zone,
     elements:[{ type:"wall"|"roof"|"floor"|"slab", name, area_m2, r_value, perimeter_m, heated }],
     openings:[{ type:"glazing"|"door"|"skylight", name, width_mm, height_mm, qty, r_value }] }
   A Revit link carries the seed in the address after #h1= : "z." + base64url(zlib(JSON)), or "j." + base64url(JSON).
   Loaded before rvc-v6.js. */
(function (g) {
'use strict';
var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

/* ---------- the page is locked while a seed is read: an overlay, and the calculator made inert ---------- */
function busy(on, msg) {
  var el = document.getElementById('ezbusy'), app = document.querySelector('.wrap3');
  if (!on || on === 'lock') { if (el) el.remove(); if (app) app.inert = on === 'lock'; return; }   /* 'lock': no overlay, page still locked (a dialog is open) */
  if (!el) { el = document.createElement('div'); el.id = 'ezbusy'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.innerHTML = '<div class="ezb-box"><span class="ezb-spin" aria-hidden="true"></span><b>' + esc(msg || 'Calculating…') + '</b><span>The inputs are locked until it is filled in.</span></div>';
  if (app) app.inert = true;
}

/* ---------- Revit link: #h1=… ---------- */
function b64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function inflate(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open the link — use a current Chrome, Edge, Firefox or Safari.');
  var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter(); w.write(u8); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
function hashSeed() { var m = /[#&]h1=([^&]+)/.exec(location.hash || ''); return m ? m[1] : null; }
async function fromHash() {
  var raw = hashSeed(); if (!raw) return null;
  var kind = raw.slice(0, 2), body = b64u(raw.slice(2));
  var txt = new TextDecoder().decode(kind === 'z.' ? await inflate(body) : body);
  var d = JSON.parse(txt);
  if (!d || d.format !== 'ezbuild-h1-seed') throw new Error('This link does not carry an H1 project.');
  return d;
}
function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; } }

/* ---------- PDF drawings: the text layer only (Revit, ArchiCAD, AutoCAD exports). Scanned sheets have none ---------- */
function loadPdfJs() {
  if (g.pdfjsLib) return Promise.resolve(g.pdfjsLib);
  return new Promise(function (ok, bad) {
    var s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
    s.onload = function () { g.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(g.pdfjsLib); };
    s.onerror = function () { bad(new Error('The PDF reader could not be loaded — check the internet connection.')); };
    document.head.appendChild(s);
  });
}
/* pdf.js text items → { s, x, y (page), a (along the text), b (its baseline, smaller = further down the text's own page), fs, w, d (direction) }.
   Sheets are often rotated: text runs up the page or upside down, so everything is measured along the text's own direction */
function norm(it) {
  var t = it.transform, fs = Math.hypot(t[0], t[1]) || 1, dx = t[0] / fs, dy = t[1] / fs;
  return { s: String(it.str || '').trim(), x: t[4], y: t[5], a: t[4] * dx + t[5] * dy, b: -t[4] * dy + t[5] * dx, fs: fs, w: +it.width || 0, d: Math.round(Math.atan2(dy, dx) * 2 / Math.PI) };
}
/* items on one baseline, in reading order → a line of text */
function toLines(items) {
  var groups = {};
  items.forEach(function (it) {
    var n = it.fs ? it : norm(it); if (!n.s) return;
    var k = n.d + ':' + Math.round(n.b / 2); (groups[k] = groups[k] || []).push(n);
  });
  return Object.keys(groups).map(function (k) {
    var L = groups[k].sort(function (p, q) { return p.a - q.a; }), out = '', end = null;
    L.forEach(function (x) { if (end != null && x.a - end > 1.5) out += ' '; out += x.s; end = x.a + x.w; });
    return out.replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}
var SUF = 'Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Place|Pl|Way|Crescent|Cres|Lane|Ln|Terrace|Tce|Grove|Close|Court|Ct|Parade|Pde|Highway|Hwy|Rise|Heights|Hts|Boulevard|Blvd|Esplanade|Mews|Square|Sq|Glade|View|Loop|Quay|Row|Green|Track|Walk|Key';
var RE = {
  addr: new RegExp('\\b(\\d{1,5}[A-Za-z]?(?:\\s*[-/]\\s*\\d{1,5}[A-Za-z]?)?\\s+(?:[A-Za-z\'’\\-]+\\s+){0,3}(?:' + SUF + ')\\b\\.?(?:,?\\s+(?!LOT\\b|DP\\b)[A-Za-z\'’\\-]{3,}){0,3})', 'i'),
  legal: /\bLOT\s*(\d+[A-Z]?)\s*(?:ON\s*)?(DPS|DP|LT|SO)\s*(\d{3,7})\b/i,
  client: /\b(?:CLIENT|OWNER)S?\b\s*(?:NAME)?\s*[:\-–]\s*(.{3,60})$/i,
  designer: /\b(?:DESIGNER|DESIGNED\s+BY)\b\s*[:\-–]\s*(.{3,60})$/i,
  tag: /^(EXW|EW|WIN|W|EXD|ED|FD|GD|SD|DR|D|SKY|SK|IN)\s?-?\s?(\d{1,3}[A-Z]?)$/i,
  code: /\b(EXW|EW|WIN|W|EXD|ED|FD|GD|SD|DR|D|SKY|SK)\s?-?\s?(\d{1,3}[A-Z]?)\b(?![\/.]\w)/g,   /* not a code clause like D1/AS1 */
  dims: /(\d{3,4})\s*(?:mm)?\s*(W|H|WIDE|HIGH)?\s*[x×X]\s*(\d{3,4})\s*(?:mm)?\s*(W|H|WIDE|HIGH)?/,
  wonly: /^(\d{3,4})\s*W$/i,
  rlab: /^R\s?(\d\.\d{1,2})$/i,
  area: /\b(?:(?:GROSS|TOTAL|GROUND)\s+)?(?:FLOOR|BUILDING)\s+AREA\b[^0-9]{0,24}(\d{1,4}(?:\.\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s?m)(?![A-Za-z0-9])/i,
  perim: /\bPERIMETER\b[^0-9]{0,24}(\d{1,4}(?:\.\d{1,2})?)\s*m(?![A-Za-z0-9²])/i,
  headIn: /(\d{4})\s*mm\s+internal\s+door\s+head\s+height/i,
  headEx: /(\d{4})\s*mm\s+head\s+height\s+to\s+exterior/i,
  /* an insulation summary cell: "Truss Roof: Pink Batts R3.6+3.6", "Wall: Pink Batts R2.8", "Slab Floor: N/A" — anywhere in a line, since table rows run into the text beside them */
  insRow: /\b(Truss Roof|Skillion Roof|Flat Roof|Roof|Ceiling|External Walls?|Walls?|Slab Floor|Timber Floor|Suspended Floor)\s*:\s*((?:[A-Za-z®]+\s){0,3}?(?:R\s?\d{1,2}\.\d(?:\s*\+\s*R?\s?\d{1,2}\.\d)?|N\/A|none)\b)/gi
};
function most(map) { var best = null; Object.keys(map).forEach(function (k) { if (!best || map[k].n > best.n) best = map[k]; }); return best; }
function tally(map, key, val, src) { var k = key.toUpperCase(); if (!map[k]) map[k] = { v: val, n: 0, src: src }; map[k].n++; }
function title(s) { return /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }).replace(/\bDp\b/g, 'DP'); }
function wh(d) { var a1 = +d[1], a2 = +d[3], hFirst = /^H/i.test(d[2] || '') || /^W/i.test(d[4] || ''); return hFirst ? [a2, a1] : [a1, a2]; }
/* pages: arrays of pdf.js items (or of lines, for text already split into lines) */
function parse(pages) {
  var A = {}, Lg = {}, Cl = {}, Ds = {}, ops = {}, areas = [], perims = [], ins = {}, lines = [], headIn = 0, headEx = 0, rs = [], winR = 0;
  pages.forEach(function (P, pi) {
    var N = typeof P[0] === 'string' ? null : P.map(function (it) { return it.fs ? it : norm(it); }).filter(function (n) { return n.s; });
    var L = N ? toLines(N) : P;
    L.forEach(function (ln) {
      var src = 'p.' + (pi + 1) + ': “' + ln.slice(0, 90) + '”', m;
      lines.push({ t: ln, src: src, pg: pi });
      if ((m = RE.legal.exec(ln))) tally(Lg, m[1] + m[2] + m[3], 'Lot ' + m[1] + ' ' + m[2].toUpperCase() + ' ' + m[3], src);
      if ((m = RE.addr.exec(ln))) { var a = m[1].replace(/\s+/g, ' ').replace(/[,\s]+$/, ''); tally(A, a, title(a), src); }
      if ((m = RE.client.exec(ln))) tally(Cl, m[1].trim(), m[1].trim(), src);
      if ((m = RE.designer.exec(ln))) tally(Ds, m[1].trim(), m[1].trim(), src);
      if ((m = RE.area.exec(ln))) areas.push({ v: +m[1], src: src, total: /TOTAL|GROSS/i.test(ln) });
      if ((m = RE.perim.exec(ln))) perims.push({ v: +m[1], src: src });
      if ((m = RE.headIn.exec(ln))) headIn = +m[1];
      if ((m = RE.headEx.exec(ln))) headEx = +m[1];
      var ir = new RegExp(RE.insRow.source, 'gi');
      while ((m = ir.exec(ln))) {
        var k = m[1].toLowerCase().replace(/s$/, '').replace(/^external /, ''), v = m[2].trim(), R = v.match(/R\s?(\d{1,2}\.\d)(?:\s*\+\s*R?\s?(\d{1,2}\.\d))?/i);
        if (!ins[k]) ins[k] = { v: v, r: R ? +R[1] : 0, r2: R && R[2] ? +R[2] : 0, none: !R, src: src };
      }
      if (/window|glazing/i.test(ln) && /alumin|frame|joinery/i.test(ln) && (m = /\b(0\.\d{2})\b/.exec(ln)) && !winR) winR = +m[1];
      /* an opening and its size on one line ("EXW01 1800 x 2100") */
      var re = new RegExp(RE.code.source, 'g'), c;
      while ((c = re.exec(ln))) {
        var rest = ln.slice(c.index + c[0].length), d = RE.dims.exec(rest);
        if (!d || d.index > 60) continue;
        var s2 = wh(d); if (s2[0] < 300 || s2[1] < 300 || s2[0] > 6000 || s2[1] > 6000) continue;
        var code = c[1].toUpperCase() + c[2].toUpperCase();
        if (!ops[code]) ops[code] = { pre: c[1].toUpperCase(), name: code, width_mm: s2[0], height_mm: s2[1], src: src };
      }
    });
    if (!N) return;
    /* a tag ("EXW 107") and the size written under it ("3000Wx1500H", or "760W" for a door) — paired by where they sit on the sheet */
    var dims = N.filter(function (n) { return RE.dims.test(n.s) && RE.dims.exec(n.s).index === 0 || RE.wonly.test(n.s); });
    N.forEach(function (T) {
      var m = RE.tag.exec(T.s); if (!m) return;
      var code = m[1].toUpperCase() + m[2].toUpperCase(), best = null, bs = 1e9;
      dims.forEach(function (D) {
        if (D.d !== T.d) return;
        var db = T.b - D.b, da = Math.abs(D.a - T.a), s;
        if (db > 0.2 * T.fs && db < 3.2 * T.fs && da < 3 * T.fs) s = da + db;
        else if (Math.abs(db) < 0.3 * T.fs && D.a > T.a + T.w - 1 && D.a - (T.a + T.w) < 4 * T.fs) s = D.a - (T.a + T.w);
        else return;
        if (s < bs) { bs = s; best = D; }
      });
      if (!best || ops[code]) return;
      var dd = RE.dims.exec(best.s), w, h;
      if (dd && dd.index === 0) { var s2 = wh(dd); w = s2[0]; h = s2[1]; } else { w = +RE.wonly.exec(best.s)[1]; h = 0; }
      ops[code] = { pre: m[1].toUpperCase(), name: code, width_mm: w, height_mm: h, x: T.x, y: T.y, pg: pi, td: T.d, cx: T.x + Math.cos(T.d * Math.PI / 2) * T.w / 2 - Math.sin(T.d * Math.PI / 2) * T.fs * 0.35, cy: T.y + Math.sin(T.d * Math.PI / 2) * T.w / 2 + Math.cos(T.d * Math.PI / 2) * T.fs * 0.35, src: 'p.' + (pi + 1) + ': “' + T.s + ' — ' + best.s + '”' };
    });
    /* an R-value written beside a window ("R0.46") belongs to the nearest tag */
    N.forEach(function (R) { var m = RE.rlab.exec(R.s); if (m) rs.push({ r: +m[1], x: R.x, y: R.y, pg: pi }); });
  });
  rs.forEach(function (R) {
    var best = null, bd = 60;
    Object.keys(ops).forEach(function (k) { var o = ops[k]; if (o.pg !== R.pg || o.x == null) return; var dd = Math.hypot(o.x - R.x, o.y - R.y); if (dd < bd) { bd = dd; best = o; } });
    if (best) best.r_value = R.r;
  });
  var list = Object.keys(ops).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); }).map(function (k) {
    var o = ops[k], inr = o.pre === 'IN';
    if (!o.height_mm) o.height_mm = inr ? headIn || 2200 : headEx || 2400;
    o.type = /^SK/.test(o.pre) ? 'skylight' : inr || (/D/.test(o.pre) && o.width_mm < 1100) ? 'door' : 'glazing';
    /* internal doors only count when they are in the envelope (e.g. into the garage); a door 4 m wide or more is a garage door */
    o.inc = !inr && o.width_mm < 4000;
    o.note = inr ? 'internal door — tick it if it is in the envelope (e.g. to the garage)' : o.width_mm >= 4000 ? 'garage door?' : '';
    if (!o.r_value && winR && o.type !== 'door') o.r_value = winR;
    o.qty = 1; Object.defineProperty(o, 'at', { value: { x: o.x, y: o.y, cx: o.cx, cy: o.cy, td: o.td, pg: o.pg, pre: o.pre }, enumerable: false }); delete o.x; delete o.y; delete o.cx; delete o.cy; delete o.td; delete o.pg; delete o.pre; return o;
  });
  var pick = function (map) { var b = most(map); return b ? { v: b.v, src: b.src } : null; };
  /* the floors the set draws: "Ground Floor Plan", "First Floor Plan", "Level 2 Plan" in the sheet list and the titles */
  var lv = {}; lines.forEach(function (l) { var re = /\b(BASEMENT|LOWER GROUND|GROUND|FIRST|SECOND|THIRD|UPPER|LOWER|LEVEL\s?\d)\s+(?:FLOOR\s+)?(?:[A-Z&]+\s+){0,3}?PLAN\b/gi, m; while ((m = re.exec(l.t))) { var k = m[1].toUpperCase().replace(/\s+/g, ' '); if (!lv[k]) lv[k] = l.src; } });
  /* the roof pitch: the angle written most often on the sheets that say "roof pitch" or are the roof plan */
  var pc = {}, psrc = {}; pages.forEach(function (P, pi) {
    var L = lines.filter(function (l) { return l.pg === pi; }); if (!L.some(function (l) { return /ROOF\s+PITCH|\bROOF\s+PLAN\b/i.test(l.t); })) return;
    L.forEach(function (l) { var re = /(?:^|[^\d.])(\d{1,2}(?:\.\d)?)\s?°/g, m; while ((m = re.exec(l.t))) { var v = +m[1]; if (v < 8 || v > 60) continue; pc[v] = (pc[v] || 0) + 1; if (!psrc[v]) psrc[v] = l.src; } });
  });
  var pv = Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; })[0];
  /* the council: the territorial authority named most often on the sheet the address is on ("AUCKLAND 2679" under the street) */
  var ta = null, adr = most(A), TA = (g.H1 && g.H1.TA) || [];
  if (adr) { var apg = +(/^p\.(\d+)/.exec(adr.src) || [0, 1])[1] - 1, tc = {}; lines.forEach(function (l) { if (l.pg !== apg) return; TA.forEach(function (t) { if (new RegExp('\\b' + t[0].replace(/[-\s]+/g, '[-\\s]+') + '\\b', 'i').test(l.t)) { tc[t[0]] = tc[t[0]] || { n: 0, src: l.src }; tc[t[0]].n++; } }); });
    var tk = Object.keys(tc).sort(function (a, b) { return tc[b].n - tc[a].n; })[0]; if (tk) ta = { v: tk, src: tc[tk].src }; }
  var ar = areas.sort(function (a, b) { return (b.total - a.total) || (b.v - a.v); })[0] || null;
  return {
    address: pick(A), legal: pick(Lg), client: pick(Cl), designer: pick(Ds),
    area: ar, perimeter: perims[0] || null, openings: list, winR: winR, ins: ins, lines: lines,
    ta: ta, levels: Object.keys(lv).map(function (k) { return { name: k, src: lv[k] }; }), pitch: pv ? { v: +pv, n: pc[pv], src: psrc[pv] } : null
  };
}
async function readDrawings(file, opts) {
  var lib = await loadPdfJs(), data = new Uint8Array(await file.arrayBuffer());
  var doc = await lib.getDocument({ data: data }).promise, pages = [], chars = 0;
  for (var i = 1; i <= Math.min(doc.numPages, 120); i++) {
    var tc = await (await doc.getPage(i)).getTextContent(), N = tc.items.map(norm).filter(function (n) { return n.s; });
    chars += N.reduce(function (s, n) { return s + n.s.length; }, 0); pages.push(N);
  }
  if (chars < 40) throw new Error('No text found in this PDF — it looks scanned. Export the drawings from Revit, ArchiCAD or AutoCAD as a PDF with text.');
  readDrawings.last = { lib: lib, doc: doc, pages: pages };
  return { found: await measure(opts), pages: doc.numPages };
}
/* the text and the plan's walls again — opts.indoor: enclosed spaces named as outdoor (YARD, COURTYARD) that are inside the envelope after all */
async function measure(opts) {
  var L = readDrawings.last, lib = L.lib, doc = L.doc, pages = L.pages, F = parse(pages);
  F.stud = studHeight(pages);
  /* the plan's walls: area and perimeter of the heated floor, and which side of the envelope each opening is on */
  var pgs = {}; F.openings.forEach(function (o) { if (o.at && o.at.pg != null) pgs[o.at.pg] = (pgs[o.at.pg] || 0) + 1; });
  var plan = Object.keys(pgs).sort(function (a, b) { return pgs[b] - pgs[a]; })[0];
  if (plan != null) { try { var page = await doc.getPage(+plan + 1); var G = await planGeom(lib, page, pages[+plan], opts); readDrawings.plan = G; applyGeom(F, G, +plan); if (F.garWall) F.garWall.h = F.stud; } catch (e) { console.warn('plan walls not read:', e); } }
  return F;
}

/* ---------- the stud height: a level on the sections that is FFL + a dimension also written on the drawings (FFL 18300, 21020 → 2720) ---------- */
function studHeight(pages) {
  var cnt = {}, ffl = {}, pgOf = {};
  pages.forEach(function (items, pi) { toLines(items).forEach(function (s) {
    var m, re = /FFL\s*[=:]?\s*(\d{4,6})\b/gi; while ((m = re.exec(s))) ffl[m[1]] = (ffl[m[1]] || 0) + 1;
    (s.match(/\b\d{4,6}\b/g) || []).forEach(function (n) { cnt[n] = (cnt[n] || 0) + 1; if (pgOf[n] == null) pgOf[n] = pi; });
  }); });
  var f = Object.keys(ffl).sort(function (a, b) { return ffl[b] - ffl[a]; })[0]; if (!f) return null;
  var best = null;
  Object.keys(cnt).forEach(function (L) { if (L.length !== f.length) return; var d = +L - +f; if (d < 2100 || d > 3600 || !cnt[d]) return; if (!best || cnt[d] > best.n) best = { d: d, L: L, n: cnt[d] }; });
  return best ? { v: best.d / 1000, src: 'p.' + (pgOf[best.L] + 1) + ': level ' + best.L + ' − FFL ' + f + ' = ' + best.d + ' mm' } : null;
}
/* ---------- the plan's walls ----------
   Revit and most CAD exports draw each wall's cut as a filled band (often one grey). Those bands are found from the page's drawing operations
   (the fill colour whose shapes are mostly long thin rectangles 60–400 mm wide), laid on a 10 mm grid and flood-filled: each closed space between
   walls is a room, named by the room label in it. The heated floor is every room except the garage (GARAGE, CARPORT) and the outdoor spaces
   (YARD, COURTYARD, DECK…), plus the walls around them, to the outer face of the framing — the slab's external dimensions. */
var GAR = /^(GARAGE|CARPORT)$/i, OUTD = /^(YARD|COURTYARD|DECK|PATIO|PORCH|VERANDAH|ALFRESCO|OUTLOOK)$/i;
async function planGeom(lib, page, items, opts) {
  var indoor = ((opts || {}).indoor || []).map(function (s) { return String(s).toUpperCase(); });
  var OPS = lib.OPS, U = lib.Util, ol = await page.getOperatorList(), fn = ol.fnArray, ar = ol.argsArray;
  var ctm = [1, 0, 0, 1, 0, 0], fill = '#000000', st = [], cur = [], shapes = [], clip = null, pclip = false;
  var hex = function (a) { if (typeof a[0] === 'string') return a[0].toLowerCase(); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(+a[i] || 0).toString(16)).slice(-2); }).join(''); };
  var addPath = function (ops, xs) {
    var k = 0, sub = [];
    var flush = function () { if (sub.length >= 3) cur.push(sub); sub = []; };
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i];
      if (o === OPS.rectangle) { flush(); var x = xs[k++], y = xs[k++], w = xs[k++], h = xs[k++]; cur.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(function (p) { return U.applyTransform(p, ctm); })); }
      else if (o === OPS.moveTo) { flush(); sub.push(U.applyTransform([xs[k++], xs[k++]], ctm)); }
      else if (o === OPS.lineTo) sub.push(U.applyTransform([xs[k++], xs[k++]], ctm));
      else if (o === OPS.curveTo) { k += 4; sub.push(U.applyTransform([xs[k++], xs[k++]], ctm)); }
      else if (o === OPS.curveTo2 || o === OPS.curveTo3) { k += 2; sub.push(U.applyTransform([xs[k++], xs[k++]], ctm)); }
      else if (o === OPS.closePath) flush();
    }
    flush();
  };
  for (var i = 0; i < fn.length; i++) {
    var f = fn[i], a = ar[i];
    if (f === OPS.save) st.push([ctm, fill, clip]);
    else if (f === OPS.restore) { var s = st.pop(); if (s) { ctm = s[0]; fill = s[1]; clip = s[2]; } }
    else if (f === OPS.clip || f === OPS.eoClip) pclip = true;
    else if (f === OPS.transform) ctm = U.transform(ctm, a);
    else if (f === OPS.setFillRGBColor) fill = hex(a);
    else if (f === OPS.setFillGray) fill = hex([a[0] * 255, a[0] * 255, a[0] * 255]);
    else if (f === OPS.constructPath) addPath(a[0], a[1]);
    else if (f === OPS.fill || f === OPS.eoFill || f === OPS.fillStroke || f === OPS.eoFillStroke || f === OPS.closeFillStroke || f === OPS.closeEOFillStroke) { cur.forEach(function (p) { shapes.push({ c: fill, p: p, k: clip }); }); cur = []; }
    else if (f === OPS.stroke || f === OPS.closeStroke || f === OPS.endPath) {
      /* a wall with openings in it is often one band drawn through a clip made of its solid pieces: the gaps between the pieces are the openings */
      if (pclip) { clip = cur.map(function (p) { var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; }); return [Math.min.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, xs), Math.max.apply(0, ys)]; }); pclip = false; }
      cur = [];
    }
  }
  /* the scale: "1 : 100" written on the sheet (the most common one), else 1:100 */
  var sc = {}; toLines(items).forEach(function (l) { var m = l.match(/\b1\s*:\s*(20|25|50|75|100|200|250|500)\b/g); (m || []).forEach(function (x) { var v = +x.split(':')[1]; sc[v] = (sc[v] || 0) + 1; }); });
  var scale = +(Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; })[0] || 100), mmU = 25.4 / 72 * scale;
  /* axis-aligned rectangles, grouped by colour; the walls' colour is the one with the most length of 60–400 mm bands */
  var rects = {}; shapes.forEach(function (s) {
    var xs = s.p.map(function (p) { return p[0]; }), ys = s.p.map(function (p) { return p[1]; }), x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var ok = s.p.every(function (p) { return (Math.abs(p[0] - x0) < 0.2 || Math.abs(p[0] - x1) < 0.2) && (Math.abs(p[1] - y0) < 0.2 || Math.abs(p[1] - y1) < 0.2); });
    if (!ok || s.c === '#ffffff') return; var w = Math.min(x1 - x0, y1 - y0) * mmU, l = Math.max(x1 - x0, y1 - y0) * mmU;
    if (w >= 60 && w <= 400 && l >= 3 * w) (rects[s.c] = rects[s.c] || { L: 0, r: [] }).L += l;
    if (w >= 60 && w <= 400) (rects[s.c] = rects[s.c] || { L: 0, r: [] }).r.push([x0, y0, x1, y1, s.k]);
  });
  var col = Object.keys(rects).sort(function (a, b) { return rects[b].L - rects[a].L; })[0];
  if (!col || rects[col].r.length < 8 || rects[col].L < 20000) return null;
  var R = rects[col].r, cell = 10 / mmU;   /* 10 mm cells, in page units */
  var gaps = [], tol = 1;
  R.forEach(function (r) {
    if (!r[4] || r[4].length < 2) return; var hor = r[2] - r[0] > r[3] - r[1], A = hor ? 0 : 1, B = 1 - A;
    var pc = r[4].filter(function (c) { return c[A] >= r[A] - tol && c[A + 2] <= r[A + 2] + tol && c[B] <= r[B] + tol && c[B + 2] >= r[B + 2] - tol; }).sort(function (a, b) { return a[A] - b[A]; });
    for (var j = 1; j < pc.length; j++) { var g0 = pc[j - 1][A + 2], g1 = pc[j][A]; if ((g1 - g0) * mmU > 200) { var m = (g0 + g1) / 2, mid = (r[B] + r[B + 2]) / 2; gaps.push({ r: r, hor: hor, len: (g1 - g0) * mmU, x: hor ? m : mid, y: hor ? mid : m }); } }
  });
  /* …or two pieces of the same wall, end to end with the opening between them */
  R.forEach(function (r) {
    var hor = r[2] - r[0] > r[3] - r[1], A = hor ? 0 : 1, B = 1 - A, nx = null;
    R.forEach(function (q) { if (q === r || Math.abs(q[B] - r[B]) > tol || Math.abs(q[B + 2] - r[B + 2]) > tol || q[A] < r[A + 2] - tol) return; if (!nx || q[A] < nx[A]) nx = q; });
    if (!nx) return; var len = (nx[A] - r[A + 2]) * mmU; if (len < 200 || len > 6500) return;
    var m = (nx[A] + r[A + 2]) / 2, mid = (r[B] + r[B + 2]) / 2;
    if (R.some(function (q) { return q !== r && q !== nx && q[A] <= m && q[A + 2] >= m && q[B] <= mid && q[B + 2] >= mid; })) return;
    gaps.push({ r: r, hor: hor, len: len, x: hor ? m : mid, y: hor ? mid : m });
  });
  var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  R.forEach(function (r) { bx0 = Math.min(bx0, r[0]); by0 = Math.min(by0, r[1]); bx1 = Math.max(bx1, r[2]); by1 = Math.max(by1, r[3]); });
  bx0 -= 60 * cell; by0 -= 60 * cell; bx1 += 60 * cell; by1 += 60 * cell;
  var W = Math.ceil((bx1 - bx0) / cell), H = Math.ceil((by1 - by0) / cell);
  if (W * H > 16e6) return null;
  var g = new Uint8Array(W * H), cx = function (x) { return Math.round((x - bx0) / cell); }, cy = function (y) { return Math.round((y - by0) / cell); };
  R.forEach(function (r) { for (var y = cy(r[1]); y < cy(r[3]); y++) for (var x = cx(r[0]); x < cx(r[2]); x++) g[y * W + x] = 1; });
  /* the spaces between the walls */
  var lab = new Int32Array(W * H), n = 0, q = new Int32Array(W * H);
  for (var s0 = 0; s0 < W * H; s0++) {
    if (g[s0] || lab[s0]) continue; n++; var h = 0, tl = 0; q[tl++] = s0; lab[s0] = n;
    while (h < tl) { var c = q[h++], x = c % W, y = (c - x) / W;
      if (x > 0 && !g[c - 1] && !lab[c - 1]) { lab[c - 1] = n; q[tl++] = c - 1; } if (x < W - 1 && !g[c + 1] && !lab[c + 1]) { lab[c + 1] = n; q[tl++] = c + 1; }
      if (y > 0 && !g[c - W] && !lab[c - W]) { lab[c - W] = n; q[tl++] = c - W; } if (y < H - 1 && !g[c + W] && !lab[c + W]) { lab[c + W] = n; q[tl++] = c + W; } }
  }
  var out = lab[0], kind = {}, names = {};
  items.forEach(function (it) {
    var s = it.s; if (!/^[A-Z][A-Z0-9 ]{1,20}$/.test(s)) return;
    var x = cx(it.x + (it.w / 2) * (it.d === 0 ? 1 : 0)), y = cy(it.y); if (x < 0 || y < 0 || x >= W || y >= H) return;
    var r = lab[y * W + x]; if (!r || r === out) return;
    (names[r] = names[r] || []).push(s);
    if (GAR.test(s)) kind[r] = 'garage'; else if (OUTD.test(s) && kind[r] !== 'garage' && indoor.indexOf(s.toUpperCase()) < 0) kind[r] = 'outdoor';
  });
  var type = function (r) { return !r ? 'wall' : r === out ? 'outside' : kind[r] || 'house'; };
  /* the heated floor: the house's spaces and the wall cells within one wall thickness of them */
  var tw = Math.max.apply(0, R.map(function (r) { return Math.min(r[2] - r[0], r[3] - r[1]); })), k = Math.ceil(tw / cell) + 1;
  var heat = new Uint8Array(W * H), hs = new Uint8Array(W * H);
  for (var i2 = 0; i2 < W * H; i2++) if (lab[i2] && type(lab[i2]) === 'house') hs[i2] = heat[i2] = 1;
  /* grow into walls only: a square of k cells, done as k passes of one cell */
  var grow = hs;
  for (var it2 = 0; it2 < k; it2++) {
    var nx = grow.slice();
    for (var y2 = 1; y2 < H - 1; y2++) for (var x2 = 1; x2 < W - 1; x2++) { var c2 = y2 * W + x2; if (grow[c2] || !g[c2]) continue; if (grow[c2 - 1] || grow[c2 + 1] || grow[c2 - W] || grow[c2 + W] || grow[c2 - W - 1] || grow[c2 - W + 1] || grow[c2 + W - 1] || grow[c2 + W + 1]) nx[c2] = 1; }
    grow = nx;
  }
  heat = grow;
  /* fill small holes (a duct, a column), then measure: cells × 0.0001 m², and the outline by its cell edges */
  var ext = new Uint8Array(W * H), hh = 0, tt = 0; q[tt++] = 0; ext[0] = 1;
  while (hh < tt) { var c3 = q[hh++], x3 = c3 % W, y3 = (c3 - x3) / W;
    [[x3 > 0, c3 - 1], [x3 < W - 1, c3 + 1], [y3 > 0, c3 - W], [y3 < H - 1, c3 + W]].forEach(function (z) { if (z[0] && !heat[z[1]] && !ext[z[1]]) { ext[z[1]] = 1; q[tt++] = z[1]; } }); }
  var area = 0, edges = 0;
  for (var y4 = 0; y4 < H; y4++) for (var x4 = 0; x4 < W; x4++) { var c4 = y4 * W + x4, v = !ext[c4]; if (v) area++; if (x4 < W - 1 && v !== !ext[c4 + 1]) edges++; if (y4 < H - 1 && v !== !ext[c4 + W]) edges++; }
  /* which spaces an opening's wall has on its two sides */
  /* an opening's tag sits beside it, written along its wall: the nearest wall running the same way as the tag's text */
  var sides = function (px, py, td, wmm) {
    var at = function (x, y) { var X = cx(x), Y = cy(y); return X < 0 || Y < 0 || X >= W || Y >= H ? 'outside' : type(lab[Y * W + X]); };
    /* the nearest gap of the opening's width, if the walls have them */
    var gp = null, gd = Infinity;
    gaps.forEach(function (o) { if (wmm && (o.len < wmm - 60 || o.len > wmm + Math.max(120, 0.1 * wmm))) return; var dd = Math.hypot(o.x - px, o.y - py) * mmU; if (dd < gd) { gd = dd; gp = o; } });
    sides.last = gp && gd < 2500 ? Math.round(gp.len) + 'mm gap, ' + Math.round(gd) + 'mm away' : 'no gap';
    if (gp && gd < 2500) { var hw = (gp.hor ? gp.r[3] - gp.r[1] : gp.r[2] - gp.r[0]) / 2 + 250 / mmU; return gp.hor ? [at(gp.x, gp.y - hw), at(gp.x, gp.y + hw)] : [at(gp.x - hw, gp.y), at(gp.x + hw, gp.y)]; }
    var best = null, bd = Infinity, along = td == null ? null : td % 2 === 0;
    R.forEach(function (r) { if (along != null && (r[2] - r[0] > r[3] - r[1]) !== along) return; var dx = Math.max(r[0] - px, 0, px - r[2]), dy = Math.max(r[1] - py, 0, py - r[3]), dd = Math.hypot(dx, dy); if (dd < bd) { bd = dd; best = r; } });
    if (!best || bd * mmU > 1500) return null;
    var hor = best[2] - best[0] > best[3] - best[1], off = 250 / mmU, mx = Math.min(Math.max(px, best[0]), best[2]), my = Math.min(Math.max(py, best[1]), best[3]);
    return hor ? [at(mx, best[1] - off), at(mx, best[3] + off)] : [at(best[0] - off, my), at(best[2] + off, my)];
  };
  /* the wall between the house and the garage: walked along each wall band in 20 mm steps, looking just past both faces */
  var garLen = 0, step = 20 / mmU;
  R.forEach(function (r) {
    var hor = r[2] - r[0] > r[3] - r[1], A = hor ? 0 : 1, B = 1 - A, off = 60 / mmU;
    for (var s = r[A] + step / 2; s < r[A + 2]; s += step) {
      var p0 = [], p1 = []; p0[A] = p1[A] = s; p0[B] = r[B] - off; p1[B] = r[B + 2] + off;
      var k0 = type(lab[cy(p0[1]) * W + cx(p0[0])]), k1 = type(lab[cy(p1[1]) * W + cx(p1[0])]);
      if ((k0 === 'house' && k1 === 'garage') || (k0 === 'garage' && k1 === 'house')) garLen += step * mmU / 1000;
    }
  });
  var cells = {}; for (var i5 = 0; i5 < W * H; i5++) if (lab[i5]) cells[lab[i5]] = (cells[lab[i5]] || 0) + 1;
  var rooms = Object.keys(names).map(function (r) { return { names: names[r], kind: type(+r), area: (cells[r] || 0) * 1e-4 }; });
  /* a space named as outdoor that the walls close off all round (a courtyard inside the house): it is its own space here, so it may be roofed and inside the envelope — a question for the reader.
     With opts.indoor it has been counted as a room of the house */
  var enclosed = [];
  Object.keys(names).forEach(function (r) { var nm = names[r].filter(function (s) { return OUTD.test(s); })[0]; if (!nm || kind[r] === 'garage') return; enclosed.push({ name: nm, area: +((cells[r] || 0) * 1e-4).toFixed(1), inside: type(+r) === 'house' }); });
  return { scale: scale, area: area * 1e-4, perimeter: edges * 0.01, sides: sides, rooms: rooms, walls: R.length, gaps: gaps.length, garLen: garLen, enclosed: enclosed };
}
function applyGeom(F, G, pg) {
  if (!G) return;
  var src = 'p.' + (pg + 1) + ': the plan’s walls (1:' + G.scale + ') — heated floor to the outer face of the framing, ' + (G.rooms.some(function (r) { return r.kind === 'garage'; }) ? 'garage' : '') + (G.rooms.some(function (r) { return r.kind === 'outdoor'; }) ? ' and ' + G.rooms.filter(function (r) { return r.kind === 'outdoor'; }).map(function (r) { return r.names.filter(function (s) { return OUTD.test(s); })[0]; }).join(', ') : '') + ' left out';
  if (G.area > 10) { F.area = { v: +G.area.toFixed(1), src: src }; F.perimeter = { v: +G.perimeter.toFixed(2), src: src }; }
  F.enclosed = G.enclosed || [];
  /* the external walls: the heated floor's outline less the wall to the garage */
  if (G.area > 10) F.extWall = { len: +(G.perimeter - (G.garLen > 1 ? G.garLen : 0)).toFixed(2), src: 'p.' + (pg + 1) + ': the plan’s walls (1:' + G.scale + ') — the heated floor’s outline ' + G.perimeter.toFixed(2) + ' m' + (G.garLen > 1 ? ' less the ' + G.garLen.toFixed(2) + ' m to the garage' : '') };
  if (G.garLen > 1) F.garWall = { len: +G.garLen.toFixed(2), src: 'p.' + (pg + 1) + ': the plan’s walls (1:' + G.scale + ') — wall between the house and the garage, ' + G.garLen.toFixed(2) + ' m long' };
  F.openings.forEach(function (o) {
    var a = o.at; if (!a || a.pg !== pg || a.x == null) return; var s = G.sides(a.cx != null ? a.cx : a.x, a.cy != null ? a.cy : a.y, a.td, o.width_mm); if (!s) return;
    var h = s.indexOf('house') >= 0, oth = s[0] === 'house' ? s[1] : s[0];
    if (h && oth !== 'house' && oth !== 'wall') { o.inc = true; if (oth === 'garage') { o.note = 'to the garage'; o.gar = true; if (a.pre === 'IN') o.type = 'door'; } else o.note = oth === 'outdoor' ? 'to an outdoor space left out of the floor — an external opening' : ''; }
    else if (h && oth === 'house') { o.inc = false; o.note = 'inside the house'; }
    else if (!h && s.indexOf('wall') < 0) { o.inc = false; o.note = s.indexOf('garage') >= 0 ? 'garage — outside the envelope' : 'outside the envelope'; }
  });
}
/* ---------- what was found, to tick before it is filled in ---------- */
function review(F, file, onApply, onCancel, cons) {
  cons = cons || [];
  var el = document.getElementById('ezrev'); if (!el) { el = document.createElement('div'); el.id = 'ezrev'; document.body.appendChild(el); }
  var row = function (k, label, v, src) {
    return v == null ? '' : '<label class="ezr-r"><input type="checkbox" data-k="' + k + '" checked><span class="ezr-l">' + esc(label) + '</span><input class="ezr-v" data-v="' + k + '" value="' + esc(v) + '"><em>' + esc(src || '') + '</em></label>';
  };
  var ops = F.openings.map(function (o, i) {
    return '<tr><td><input type="checkbox" data-op="' + i + '"' + (o.inc === false ? '' : ' checked') + '></td><td><b>' + esc(o.name) + '</b>' + (o.note ? '<small>' + esc(o.note) + '</small>' : '') + '</td><td>' + o.width_mm + ' × ' + o.height_mm + '</td><td>' + (o.r_value ? 'R' + o.r_value : '—') + '</td><td><select data-ot="' + i + '"><option value="glazing"' + (o.type === 'glazing' ? ' selected' : '') + '>Glazing</option><option value="door"' + (o.type === 'door' ? ' selected' : '') + '>Opaque door</option><option value="skylight"' + (o.type === 'skylight' ? ' selected' : '') + '>Skylight</option></select></td></tr>';
  }).join('');
  /* the wall to the garage: its length from the plan × the stud height, less the doors into the garage that are ticked */
  var gw = F.garWall, gh = gw && gw.h ? gw.h.v : 2.4;
  var cs = cons.map(function (c, i) {
    var r = '<label class="ezr-r ezr-c"><input type="checkbox" data-cn="' + i + '" checked><span class="ezr-l">' + esc(c.label) + '</span><em>' + esc(c.src || '') + '</em></label>';
    if (c.gar) r += '<div class="ezr-gw"><input class="ezr-v" data-gl value="' + c.gar.len + '"> m long × <input class="ezr-v" data-gh value="' + gh + '"> m stud height − <span data-gd></span> m² doors = <b data-ga></b> m²' +
      '<em>' + esc(gw && gw.h ? 'Stud height ' + gw.h.src : 'Stud height not found on the sections — 2.4 m assumed, check it') + '. Doors: the ticked openings into the garage below.</em></div>';
    return r;
  }).join('');
  var sec = function (t, sub) { return '<h4 class="ezr-h">' + t + (sub ? '<span>' + sub + '</span>' : '') + '</h4>'; };
  var proj = row('address', 'Address', F.address && F.address.v, F.address && F.address.src) + row('legal', 'DP / Lot', F.legal && F.legal.v, F.legal && F.legal.src) +
    row('client', 'Client / owner', F.client && F.client.v, F.client && F.client.src) + row('designer', 'Designer', F.designer && F.designer.v, F.designer && F.designer.src);
  var slab = row('area', 'Floor area m²', F.area && F.area.v, F.area && F.area.src) + row('perimeter', 'Perimeter m', F.perimeter && F.perimeter.v, F.perimeter && F.perimeter.src);
  var any = proj || slab || F.openings.length || cons.length;
  el.innerHTML = '<div class="np-bg"></div><div class="np-box ezr-box" role="dialog" aria-modal="true" aria-labelledby="ezr-t">' +
    '<div class="ezr-hd"><h3 id="ezr-t">Found in ' + esc(file) + '</h3><p>' + (any ? 'Tick what to fill in, and check each value against the drawings.' : 'Nothing recognisable was found — no address, Lot / DP, window schedule or areas in the PDF’s text.') + '</p></div>' +
    (any ? '<div class="ezr-bd">' +
      (proj ? sec('Project') + proj : '') +
      (slab ? sec('Slab on ground', 'garage and outdoor spaces left out') + slab : '') +
      (cons.length ? sec('Constructions', 'from the cladding notes and the insulation summary — the other walls’ and the roof’s areas go on the Project page') + cs +
        '<label class="ezr-r ezr-c ezr-rep"><input type="checkbox" data-repl checked><span class="ezr-l">Replace this project’s walls, roofs and floors with these</span><em>Untick to add them beside the ones already here.</em></label>' : '') +
      (F.openings.length ? sec('Windows &amp; doors', F.openings.length + ' found — the ticked ones replace the Windows &amp; doors page. Where the plan’s walls could be read, the ones into the garage or between rooms are already unticked.') +
        '<table class="ezr-t"><thead><tr><th></th><th>ID</th><th>W × H mm</th><th>R</th><th>BRANZ sheet</th></tr></thead><tbody>' + ops + '</tbody></table>' : '') +
      '</div>' : '') +
    '<div class="np-act"><button class="v6btn" data-ezr="x">' + (any ? 'Cancel' : 'Close') + '</button>' + (any ? '<button class="v6pdfb" data-ezr="ok">Fill in</button>' : '') + '</div></div>';
  var garA = function () {
    var L = +(el.querySelector('[data-gl]') || {}).value || 0, H = +(el.querySelector('[data-gh]') || {}).value || 0, d = 0;
    F.openings.forEach(function (o, i) { var c = el.querySelector('[data-op="' + i + '"]'); if (o.gar && c && c.checked) d += o.width_mm * o.height_mm / 1e6; });
    return { d: d, a: Math.max(0, L * H - d) };
  };
  var upd = function () { var g = garA(), a = el.querySelector('[data-ga]'), d = el.querySelector('[data-gd]'); if (a) a.textContent = g.a.toFixed(1); if (d) d.textContent = g.d.toFixed(2); };
  el.oninput = upd; el.onchange = upd; upd();
  el.onclick = function (e) {
    var b = e.target.closest('[data-ezr]'); if (!b) return;
    if (b.dataset.ezr === 'ok') {
      var pick = {}; el.querySelectorAll('[data-k]').forEach(function (c) { if (c.checked) pick[c.dataset.k] = el.querySelector('[data-v="' + c.dataset.k + '"]').value.trim(); });
      var op = F.openings.map(function (o, i) { var c = el.querySelector('[data-op="' + i + '"]'); return c && c.checked ? Object.assign({}, o, { type: el.querySelector('[data-ot="' + i + '"]').value }) : null; }).filter(Boolean);
      var ci = []; el.querySelectorAll('[data-cn]').forEach(function (c) { if (c.checked) ci.push(+c.dataset.cn); });
      cons.forEach(function (c) { if (c.gar) c.area = +garA().a.toFixed(1); });
      var rp = el.querySelector('[data-repl]');
      el.remove(); onApply(pick, op, ci, !!(rp && rp.checked));
    } else { el.remove(); if (onCancel) onCancel(); }
  };
}

g.EZSeed = { busy: busy, fromHash: fromHash, hashSeed: hashSeed, clearHash: clearHash, readDrawings: readDrawings, measure: measure, review: review, parse: parse, toLines: toLines };
})(window);
