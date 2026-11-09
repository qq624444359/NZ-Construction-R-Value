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
/* text items → lines: items on one baseline, left to right (rotated title-block text by its own axis) */
function toLines(items) {
  var groups = {};
  items.forEach(function (it) {
    if (!it.str || !it.str.trim()) return;
    var t = it.transform, rot = Math.abs(t[1]) > Math.abs(t[0]), key = Math.round((rot ? t[4] : t[5]) / 2), along = rot ? t[5] : t[4];
    (groups[(rot ? 'r' : 'h') + key] = groups[(rot ? 'r' : 'h') + key] || []).push({ s: it.str, a: rot ? -along : along, w: it.width || 0 });
  });
  return Object.keys(groups).map(function (k) {
    var L = groups[k].sort(function (a, b) { return a.a - b.a; }), out = '', end = null;
    L.forEach(function (x) { if (end != null && x.a - end > 1.5) out += ' '; out += x.s; end = x.a + x.w; });
    return out.replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}
var SUF = 'Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Place|Pl|Way|Crescent|Cres|Lane|Ln|Terrace|Tce|Grove|Close|Court|Ct|Parade|Pde|Highway|Hwy|Rise|Heights|Hts|Boulevard|Blvd|Esplanade|Mews|Square|Sq|Glade|View|Loop|Quay|Row|Green|Track|Walk|Key';
var RE = {
  addr: new RegExp('\\b(\\d{1,5}[A-Za-z]?(?:\\s*[-/]\\s*\\d{1,5}[A-Za-z]?)?\\s+(?:[A-Za-z\'’\\-]+\\s+){0,3}(?:' + SUF + ')\\b\\.?(?:,?\\s+(?!LOT\\b|DP\\b)[A-Za-z\'’\\-]{3,}){0,3})', 'i'),
  legal: /\bLOT\s*(\d+[A-Z]?)\s*(?:ON\s*)?(DPS|DP|LT|SO)\s*(\d{3,7})\b/i,
  client: /\b(?:CLIENT|OWNER)S?\b\s*(?:NAME)?\s*[:\-–]?\s*(.{3,60})$/i,
  designer: /\b(?:DESIGNER|DESIGNED\s+BY)\b\s*[:\-–]?\s*(.{3,60})$/i,
  code: /\b(EXW|EW|WIN|W|EXD|ED|FD|GD|SD|DR|D|SKY|SK)\s?-?\s?(\d{1,3}[A-Z]?)\b/g,
  dims: /(\d{3,4})\s*(?:mm)?\s*(W|H|WIDE|HIGH)?\s*[x×X]\s*(\d{3,4})\s*(?:mm)?\s*(W|H|WIDE|HIGH)?/,
  area: /\b(?:(?:GROSS|TOTAL|GROUND)\s+)?(?:FLOOR|BUILDING)\s+AREA\b[^0-9]{0,24}(\d{1,4}(?:\.\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s?m)(?![A-Za-z0-9])/i,
  perim: /\bPERIMETER\b[^0-9]{0,24}(\d{1,4}(?:\.\d{1,2})?)\s*m(?![A-Za-z0-9²])/i
};
function most(map) { var best = null; Object.keys(map).forEach(function (k) { if (!best || map[k].n > best.n) best = map[k]; }); return best; }
function tally(map, key, val, src) { var k = key.toUpperCase(); if (!map[k]) map[k] = { v: val, n: 0, src: src }; map[k].n++; }
function title(s) { return /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }).replace(/\bDp\b/g, 'DP'); }
function parse(pages) {
  var A = {}, Lg = {}, Cl = {}, Ds = {}, ops = {}, areas = [], perims = [];
  pages.forEach(function (lines, pi) {
    lines.forEach(function (ln) {
      var src = 'p.' + (pi + 1) + ': “' + ln.slice(0, 90) + '”', m;
      if ((m = RE.legal.exec(ln))) tally(Lg, m[1] + m[2] + m[3], 'Lot ' + m[1] + ' ' + m[2].toUpperCase() + ' ' + m[3], src);
      if ((m = RE.addr.exec(ln))) { var a = m[1].replace(/\s+/g, ' ').replace(/[,\s]+$/, ''); tally(A, a, title(a), src); }
      if ((m = RE.client.exec(ln))) tally(Cl, m[1].trim(), m[1].trim(), src);
      if ((m = RE.designer.exec(ln))) tally(Ds, m[1].trim(), m[1].trim(), src);
      if ((m = RE.area.exec(ln))) areas.push({ v: +m[1], src: src });
      if ((m = RE.perim.exec(ln))) perims.push({ v: +m[1], src: src });
      /* an opening: its code, then the first size after it on the same line */
      var re = new RegExp(RE.code.source, 'g'), c;
      while ((c = re.exec(ln))) {
        var rest = ln.slice(c.index + c[0].length), d = RE.dims.exec(rest);
        if (!d || d.index > 60) continue;
        var a1 = +d[1], a2 = +d[3]; if (a1 < 300 || a2 < 300 || a1 > 6000 || a2 > 6000) continue;
        var hFirst = /^H/i.test(d[2] || '') || /^W/i.test(d[4] || ''), w = hFirst ? a2 : a1, h = hFirst ? a1 : a2;
        var pre = c[1].toUpperCase(), code = pre + c[2].toUpperCase(), type = /^SK/.test(pre) ? 'skylight' : 'glazing';
        if (!ops[code]) ops[code] = { type: type, name: code, width_mm: w, height_mm: h, qty: 1, src: src };
      }
    });
  });
  var pick = function (map) { var b = most(map); return b ? { v: b.v, src: b.src } : null; };
  var bigA = areas.sort(function (a, b) { return b.v - a.v; })[0] || null;
  return {
    address: pick(A), legal: pick(Lg), client: pick(Cl), designer: pick(Ds),
    area: bigA, perimeter: perims[0] || null,
    openings: Object.keys(ops).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); }).map(function (k) { return ops[k]; })
  };
}
async function readDrawings(file) {
  var lib = await loadPdfJs(), data = new Uint8Array(await file.arrayBuffer());
  var doc = await lib.getDocument({ data: data }).promise, pages = [], chars = 0;
  for (var i = 1; i <= Math.min(doc.numPages, 120); i++) {
    var tc = await (await doc.getPage(i)).getTextContent(), L = toLines(tc.items);
    chars += L.join('').length; pages.push(L);
  }
  if (chars < 40) throw new Error('No text found in this PDF — it looks scanned. Export the drawings from Revit, ArchiCAD or AutoCAD as a PDF with text.');
  return { found: parse(pages), pages: doc.numPages };
}

/* ---------- what was found, to tick before it is filled in ---------- */
function review(F, file, onApply, onCancel) {
  var el = document.getElementById('ezrev'); if (!el) { el = document.createElement('div'); el.id = 'ezrev'; document.body.appendChild(el); }
  var row = function (k, label, v, src) {
    return v == null ? '' : '<label class="ezr-r"><input type="checkbox" data-k="' + k + '" checked><span class="ezr-l">' + esc(label) + '</span><input class="ezr-v" data-v="' + k + '" value="' + esc(v) + '"><em>' + esc(src || '') + '</em></label>';
  };
  var ops = F.openings.map(function (o, i) {
    return '<tr><td><input type="checkbox" data-op="' + i + '" checked></td><td>' + esc(o.name) + '</td><td>' + o.width_mm + ' × ' + o.height_mm + '</td><td><select data-ot="' + i + '"><option value="glazing"' + (o.type === 'glazing' ? ' selected' : '') + '>Glazing</option><option value="door">Opaque door</option><option value="skylight"' + (o.type === 'skylight' ? ' selected' : '') + '>Skylight</option></select></td></tr>';
  }).join('');
  var any = F.address || F.legal || F.client || F.designer || F.area || F.perimeter || F.openings.length;
  el.innerHTML = '<div class="np-bg"></div><div class="np-box ezr-box" role="dialog" aria-modal="true" aria-labelledby="ezr-t"><h3 id="ezr-t">Found in ' + esc(file) + '</h3>' +
    (any ? '<p>Tick what to fill in. Read from the PDF’s text — check each value against the drawings.</p>' +
      row('address', 'Address', F.address && F.address.v, F.address && F.address.src) + row('legal', 'DP / Lot', F.legal && F.legal.v, F.legal && F.legal.src) +
      row('client', 'Client / owner', F.client && F.client.v, F.client && F.client.src) + row('designer', 'Designer', F.designer && F.designer.v, F.designer && F.designer.src) +
      row('area', 'Slab floor area m²', F.area && F.area.v, F.area && F.area.src) + row('perimeter', 'Slab perimeter m', F.perimeter && F.perimeter.v, F.perimeter && F.perimeter.src) +
      (F.openings.length ? '<p class="ezr-sub"><b>' + F.openings.length + ' windows and doors</b> — they replace the rows on the Windows &amp; doors page.</p><div class="ezr-tw"><table class="ezr-t"><thead><tr><th></th><th>ID</th><th>W × H mm</th><th>BRANZ sheet</th></tr></thead><tbody>' + ops + '</tbody></table></div>' : '')
      : '<p>Nothing recognisable was found — no address, Lot / DP, window schedule or areas in the PDF’s text.</p>') +
    '<div class="np-act">' + (any ? '<button class="v6pdfb" data-ezr="ok">Fill in</button>' : '') + '<button class="v6btn" data-ezr="x">' + (any ? 'Cancel' : 'Close') + '</button></div></div>';
  el.onclick = function (e) {
    var b = e.target.closest('[data-ezr]'); if (!b) return;
    if (b.dataset.ezr === 'ok') {
      var pick = {}; el.querySelectorAll('[data-k]').forEach(function (c) { if (c.checked) pick[c.dataset.k] = el.querySelector('[data-v="' + c.dataset.k + '"]').value.trim(); });
      var op = F.openings.map(function (o, i) { var c = el.querySelector('[data-op="' + i + '"]'); return c && c.checked ? Object.assign({}, o, { type: el.querySelector('[data-ot="' + i + '"]').value }) : null; }).filter(Boolean);
      el.remove(); onApply(pick, op);
    } else { el.remove(); if (onCancel) onCancel(); }
  };
}

g.EZSeed = { busy: busy, fromHash: fromHash, hashSeed: hashSeed, clearHash: clearHash, readDrawings: readDrawings, review: review, parse: parse, toLines: toLines };
})(window);
