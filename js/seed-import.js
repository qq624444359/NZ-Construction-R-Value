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
      ops[code] = { pre: m[1].toUpperCase(), name: code, width_mm: w, height_mm: h, x: T.x, y: T.y, pg: pi, src: 'p.' + (pi + 1) + ': “' + T.s + ' — ' + best.s + '”' };
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
    o.qty = 1; delete o.x; delete o.y; delete o.pg; delete o.pre; return o;
  });
  var pick = function (map) { var b = most(map); return b ? { v: b.v, src: b.src } : null; };
  var ar = areas.sort(function (a, b) { return (b.total - a.total) || (b.v - a.v); })[0] || null;
  return {
    address: pick(A), legal: pick(Lg), client: pick(Cl), designer: pick(Ds),
    area: ar, perimeter: perims[0] || null, openings: list, winR: winR, ins: ins, lines: lines
  };
}
async function readDrawings(file) {
  var lib = await loadPdfJs(), data = new Uint8Array(await file.arrayBuffer());
  var doc = await lib.getDocument({ data: data }).promise, pages = [], chars = 0;
  for (var i = 1; i <= Math.min(doc.numPages, 120); i++) {
    var tc = await (await doc.getPage(i)).getTextContent(), N = tc.items.map(norm).filter(function (n) { return n.s; });
    chars += N.reduce(function (s, n) { return s + n.s.length; }, 0); pages.push(N);
  }
  if (chars < 40) throw new Error('No text found in this PDF — it looks scanned. Export the drawings from Revit, ArchiCAD or AutoCAD as a PDF with text.');
  return { found: parse(pages), pages: doc.numPages };
}

/* ---------- what was found, to tick before it is filled in ---------- */
function review(F, file, onApply, onCancel, cons) {
  cons = cons || [];
  var el = document.getElementById('ezrev'); if (!el) { el = document.createElement('div'); el.id = 'ezrev'; document.body.appendChild(el); }
  var row = function (k, label, v, src) {
    return v == null ? '' : '<label class="ezr-r"><input type="checkbox" data-k="' + k + '" checked><span class="ezr-l">' + esc(label) + '</span><input class="ezr-v" data-v="' + k + '" value="' + esc(v) + '"><em>' + esc(src || '') + '</em></label>';
  };
  var ops = F.openings.map(function (o, i) {
    return '<tr><td><input type="checkbox" data-op="' + i + '"' + (o.inc === false ? '' : ' checked') + '></td><td>' + esc(o.name) + (o.note ? '<small>' + esc(o.note) + '</small>' : '') + '</td><td>' + o.width_mm + ' × ' + o.height_mm + '</td><td>' + (o.r_value ? 'R' + o.r_value : '') + '</td><td><select data-ot="' + i + '"><option value="glazing"' + (o.type === 'glazing' ? ' selected' : '') + '>Glazing</option><option value="door"' + (o.type === 'door' ? ' selected' : '') + '>Opaque door</option><option value="skylight"' + (o.type === 'skylight' ? ' selected' : '') + '>Skylight</option></select></td></tr>';
  }).join('');
  var cs = cons.map(function (c, i) { return '<label class="ezr-r ezr-c"><input type="checkbox" data-cn="' + i + '" checked><span class="ezr-l">' + esc(c.label) + '</span><em>' + esc(c.src || '') + '</em></label>'; }).join('');
  var any = F.address || F.legal || F.client || F.designer || F.area || F.perimeter || F.openings.length || cons.length;
  el.innerHTML = '<div class="np-bg"></div><div class="np-box ezr-box" role="dialog" aria-modal="true" aria-labelledby="ezr-t"><h3 id="ezr-t">Found in ' + esc(file) + '</h3>' +
    (any ? '<p>Tick what to fill in. Read from the PDF’s text — check each value against the drawings.</p>' +
      row('address', 'Address', F.address && F.address.v, F.address && F.address.src) + row('legal', 'DP / Lot', F.legal && F.legal.v, F.legal && F.legal.src) +
      row('client', 'Client / owner', F.client && F.client.v, F.client && F.client.src) + row('designer', 'Designer', F.designer && F.designer.v, F.designer && F.designer.src) +
      row('area', 'Slab floor area m² (the drawings’ figure — leave out the garage)', F.area && F.area.v, F.area && F.area.src) + row('perimeter', 'Slab perimeter m', F.perimeter && F.perimeter.v, F.perimeter && F.perimeter.src) +
      (cons.length ? '<p class="ezr-sub"><b>Constructions</b> — from the cladding notes and the insulation summary. Areas are not on the drawings: enter them on the Project page.</p>' + cs +
        '<label class="ezr-r ezr-c ezr-rep"><input type="checkbox" data-repl checked><span class="ezr-l">Replace this project’s walls, roofs and floors with these</span><em>Untick to add them beside the ones already here.</em></label>' : '') +
      (F.openings.length ? '<p class="ezr-sub"><b>' + F.openings.length + ' windows and doors</b> — the ticked ones replace the rows on the Windows &amp; doors page. Leave out the garage’s.</p><div class="ezr-tw"><table class="ezr-t"><thead><tr><th></th><th>ID</th><th>W × H mm</th><th>R</th><th>BRANZ sheet</th></tr></thead><tbody>' + ops + '</tbody></table></div>' : '')
      : '<p>Nothing recognisable was found — no address, Lot / DP, window schedule or areas in the PDF’s text.</p>') +
    '<div class="np-act">' + (any ? '<button class="v6pdfb" data-ezr="ok">Fill in</button>' : '') + '<button class="v6btn" data-ezr="x">' + (any ? 'Cancel' : 'Close') + '</button></div></div>';
  el.onclick = function (e) {
    var b = e.target.closest('[data-ezr]'); if (!b) return;
    if (b.dataset.ezr === 'ok') {
      var pick = {}; el.querySelectorAll('[data-k]').forEach(function (c) { if (c.checked) pick[c.dataset.k] = el.querySelector('[data-v="' + c.dataset.k + '"]').value.trim(); });
      var op = F.openings.map(function (o, i) { var c = el.querySelector('[data-op="' + i + '"]'); return c && c.checked ? Object.assign({}, o, { type: el.querySelector('[data-ot="' + i + '"]').value }) : null; }).filter(Boolean);
      var ci = []; el.querySelectorAll('[data-cn]').forEach(function (c) { if (c.checked) ci.push(+c.dataset.cn); });
      var rp = el.querySelector('[data-repl]');
      el.remove(); onApply(pick, op, ci, !!(rp && rp.checked));
    } else { el.remove(); if (onCancel) onCancel(); }
  };
}

g.EZSeed = { busy: busy, fromHash: fromHash, hashSeed: hashSeed, clearHash: clearHash, readDrawings: readDrawings, review: review, parse: parse, toLines: toLines };
})(window);
