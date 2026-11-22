/* Simple mode: the front door of the calculator. One drawing set (PDF) in, the H1/AS1 comparison out.
   It owns no numbers: the PDF is read by seed-import.js, the project is filled by rvc-v6.js (RVC.simple) and the
   comparison is the Project page's own (RVP.current). "Expert mode" shows the full calculator, which is unchanged.
   Loaded after rvc-v6.js. */
(function () {
'use strict';
var KEY = 'ezbuild-rvc-mode', R = window.RVC, XP = window.RVP;
if (!R || !R.simple || !XP) return;
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var f1 = function (x) { return (+x || 0).toFixed(1); }, f2 = function (x) { return (+x || 0).toFixed(2); };
var q = new URLSearchParams(location.search);
var root = document.getElementById('ezs'), ST = { view: 'drop', err: '', sug: null, pend: null };

/* ---------- which mode: a link that carries a project or a test set-up opens the full calculator; otherwise the last choice, simple the first time ---------- */
function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function mode() { return document.body.dataset.mode; }
function setMode(m, keep) {
  document.body.dataset.mode = m;
  if (keep !== false) { try { localStorage.setItem(KEY, m); } catch (e) {} }
  if (m === 'simple') { ST.view = R.simple.hasProject() ? 'result' : 'drop'; draw(); window.scrollTo(0, 0); }
}
var forced = q.get('c') != null || q.get('pdf') || q.get('sheet') || /[#&]h1=/.test(location.hash || '');
window.addEventListener('hashchange', function () { if (/[#&]h1=/.test(location.hash || '')) setMode('expert', false); });

/* ---------- drawing the page ---------- */
var ICON = { ok: 'check_circle', check: 'checklist', miss: 'error', warn: 'warning' };
function dropHTML() {
  var has = R.simple.hasProject(), pr = (R.S.pdf || {}).proj || {};
  return '<div class="ezs-hero"><p class="kicker">NZBC H1/AS1 6th Edition · Calculation Method</p><h1>Check H1 from your drawings</h1>' +
    '<p class="lede">Drop in a drawing set. The calculator reads the address, the plan’s walls, the window and door tags and the insulation notes, works out each construction R-value and compares the house with the H1/AS1 reference building.</p></div>' +
    '<label class="ezs-drop" id="ezs-drop" tabindex="0"><input type="file" id="ezs-file" accept=".pdf,application/pdf" hidden>' +
    '<span class="ms ezs-up">upload_file</span><b>Drop the drawings PDF here</b><span>or <u>choose a file</u></span>' +
    '<em>Read in your browser — nothing is uploaded. Needs a PDF exported from Revit, ArchiCAD or AutoCAD (with text, not a scan).</em></label>' +
    (ST.err ? '<div class="ezs-err"><span class="ms s18">error</span><span>' + esc(ST.err) + '</span></div>' : '') +
    '<div class="ezs-alt">' + (has ? '<button class="ezs-link" data-z="result"><span class="ms s18">arrow_back</span>Back to ' + esc(pr.address) + '</button>' : '') +
    '<button class="ezs-link" data-z="expert"><span class="ms s18">tune</span>Expert mode — build each wall, roof and floor layer by layer</button></div>';
}
function rowHTML(r) {
  var kind = r.el === 'roof' ? 'Roof' : r.el === 'wall' ? 'Wall' : r.slab ? 'Slab on ground' : 'Floor';
  var rv = r.r ? 'R' + f2(r.r) + (r.rp != null ? '<small>R' + f2(r.rp) + ' at the ceiling edge</small>' : '') : '—';
  return '<tr><td><span class="ezs-k">' + kind + '</span><button class="ezs-nm" data-z="open" data-v="' + esc(r.id) + '" title="Open this construction in expert mode">' + esc(r.name) + '</button></td>' +
    '<td class="n"><input class="ezs-in" inputmode="decimal" data-ar="' + esc(r.id) + '" value="' + (r.area ? +(+r.area).toFixed(1) : '') + '" placeholder="m²" aria-label="Area of ' + esc(r.name) + ' in square metres"></td><td class="n">' + rv + '</td></tr>';
}
function verdictHTML(s) {
  if (s.state === 'need') return '<div class="ezs-v need"><span class="ms">hourglass_top</span><div><b>A few numbers are missing</b><p>' + esc((s.miss.concat(s.bad.map(function (n) { return '“' + n + '” needs fixing'; }))).join(' · ')) + '. Enter the areas below, or open expert mode.</p></div></div>';
  var d = s.hr - s.hp, pct = s.hr ? Math.abs(d) / s.hr * 100 : 0, pass = s.state === 'pass';
  return '<div class="ezs-v ' + (pass ? 'pass' : 'fail') + '"><span class="ms">' + (pass ? 'check_circle' : 'error') + '</span><div><b>' + (pass ? 'Passes' : 'Does not pass') + ' the H1/AS1 calculation method</b>' +
    '<p>Heat loss of the house ' + f1(s.hp) + ' W/K ' + (pass ? '≤' : '>') + ' reference building ' + f1(s.hr) + ' W/K — ' + f1(pct) + '% ' + (pass ? 'under' : 'over') + '.</p></div></div>';
}
function sugHTML(s) {
  if (s.state !== 'fail') return '';
  var g = ST.sug;
  if (!g) return '<div class="ezs-sug"><span class="ms s18">lightbulb</span><span>The calculator can look for the cheapest insulation combination that passes.</span><button class="v6btn" data-z="solve">Find it</button></div>';
  if (g.state === 'ok') {
    var L = R.S.list.filter(function (c) { return g.by[c.id]; }).map(function (c) { return '<li><b>' + esc(c.name) + '</b> → ' + esc(g.by[c.id].label) + '</li>'; }).join('');
    return '<div class="ezs-sug col"><div><span class="ms s18">lightbulb</span><span>The lowest-cost combination that passes (' + g.nOK + ' of ' + g.N + ' combinations pass):</span></div><ul>' + L + '</ul><button class="v6pdfb" data-z="apply">Use these</button></div>';
  }
  if (g.state === 'none') return '<div class="ezs-sug"><span class="ms s18">lightbulb</span><span>No insulation combination in the list passes on its own' + (g.glzUp ? ' — it passes with the glazing upgraded to R' + f2(g.glzUp) + '. Change the window R-values in expert mode.' : '. Reduce the glazing area or raise its R-value in expert mode.') + '</span></div>';
  return '<div class="ezs-sug"><span class="ms s18">lightbulb</span><span>Not enough information to search yet: ' + esc((g.miss || []).join('; ')) + '.</span></div>';
}
function resultHTML() {
  var s = R.simple.state(), pr = s.proj || {}, info = s.info;
  var meta = [pr.legal, s.ta ? s.ta + (s.zone ? ' · climate zone ' + s.zone : '') : '', pr.client ? 'Client: ' + pr.client : ''].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  var ord = { roof: 0, wall: 1, floor: 2 }, rows = s.rows.slice().sort(function (a, b) { return ord[a.el] - ord[b.el]; });
  var glz = '<tr><td><span class="ezs-k">Glazing</span><button class="ezs-nm" data-z="open" data-v="openings">Windows and glazed doors' + (s.glzN ? ' (' + s.glzN + ')' : '') + '</button></td><td class="n">' + (s.glzA ? f1(s.glzA) : '—') + '</td><td class="n">' + (s.glzR.length ? s.glzR.map(function (r) { return 'R' + f2(r); }).join(' / ') : '—') + '</td></tr>' +
    (s.doorA ? '<tr><td><span class="ezs-k">Doors</span><button class="ezs-nm" data-z="open" data-v="openings">Opaque doors (' + s.doorN + ')</button></td><td class="n">' + f1(s.doorA) + '</td><td class="n"></td></tr>' : '');
  var notes = info ? '<section class="ezs-card"><h2>What was read from ' + esc(info.file) + '</h2><p class="ezs-sub">Ticked lines were written on the drawings. Lines marked “check” are worked out from them — compare each with your own figures before a consent.</p><ul class="ezs-notes">' +
    info.notes.slice().sort(function (a, b) { var o = { warn: 0, miss: 1, check: 2, ok: 3 }; return o[a.k] - o[b.k]; }).map(function (n) {
      return '<li class="' + n.k + '"><span class="ms s18">' + ICON[n.k] + '</span><div><span>' + esc(n.t) + '</span>' + (n.src ? '<em>' + esc(n.src) + '</em>' : '') + '</div>' + (n.k === 'check' || n.k === 'miss' ? '<i>' + (n.k === 'miss' ? 'missing' : 'check') + '</i>' : '') + '</li>';
    }).join('') + '</ul></section>' : '';
  return '<div class="ezs-top"><div><p class="kicker">H1/AS1 6th Edition · Calculation Method</p><h1>' + esc(pr.address || 'Project') + '</h1>' + (meta ? '<p class="ezs-meta">' + meta + '</p>' : '') + '</div>' +
    '<div class="ezs-act"><button class="v6btn" data-z="again"><span class="ms s18">upload_file</span>Read another PDF</button><button class="v6btn" data-z="expert"><span class="ms s18">tune</span>Expert mode</button></div></div>' +
    verdictHTML(s) + sugHTML(s) +
    '<section class="ezs-card"><h2>The house</h2><p class="ezs-sub">Change an area here; open a row to change its build-up in expert mode.</p>' +
    '<table class="ezs-t"><thead><tr><th>Element</th><th class="n">Area m²</th><th class="n">Construction R-value</th></tr></thead><tbody>' + rows.map(rowHTML).join('') + glz + '</tbody></table></section>' +
    notes +
    '<div class="ezs-foot"><button class="v6pdfb" data-z="pdf"><span class="ms s18">picture_as_pdf</span>Report PDF</button><button class="v6btn" data-z="save"><span class="ms s18">save</span>Save project</button>' +
    '<span>Indicative only — the BRANZ H1/AS1 calculation tool gives the result for a consent. The report lists the values to enter into it.</span></div>';
}
function draw() {
  if (!root || mode() !== 'simple') return;
  var act = document.activeElement, keep = act && act.dataset && act.dataset.ar;
  root.innerHTML = '<div class="ezs-in-wrap">' + (ST.view === 'result' ? resultHTML() : dropHTML()) + '</div>';
  if (keep) { var el = root.querySelector('[data-ar="' + keep + '"]'); if (el) el.focus(); }
}

/* ---------- reading a PDF ---------- */
async function read(file) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { ST.err = 'That is not a PDF — choose the drawing set as a PDF file.'; ST.view = 'drop'; draw(); return; }
  ST.err = ''; ST.sug = null;
  EZSeed.busy(true, 'Reading the drawings…');
  try { await R.simple.read(file); ST.view = 'result'; }
  catch (e) { ST.err = e && e.message ? e.message : 'The PDF could not be read.'; ST.view = 'drop'; }
  EZSeed.busy(false); draw(); window.scrollTo(0, 0);
}
/* a project already in this browser is not replaced without asking */
function ask(file) {
  if (!R.simple.hasProject()) { read(file); return; }
  ST.pend = file; var pr = R.S.pdf.proj || {}, el = document.createElement('div'); el.id = 'ezs-dlg';
  el.innerHTML = '<div class="ezs-bg"></div><div class="ezs-box" role="dialog" aria-modal="true" aria-labelledby="ezs-dt"><h3 id="ezs-dt">Replace the project in this browser?</h3>' +
    '<p>“' + esc(pr.address) + '” is only kept in this browser. Reading ' + esc(file.name) + ' replaces it — save it first if you want to come back to it.</p>' +
    '<div class="ezs-btns"><button class="v6btn pri" data-z="dsave"><span class="ms s18">save</span>Save it, then read</button><button class="v6btn" data-z="dgo">Replace without saving</button><button class="v6btn" data-z="dx">Cancel</button></div></div>';
  document.body.appendChild(el);
}
function dlgClose() { var el = document.getElementById('ezs-dlg'); if (el) el.remove(); }

document.addEventListener('click', async function (e) {
  var b = e.target.closest('[data-z]'); if (!b) return;
  var z = b.dataset.z, v = b.dataset.v;
  if (z === 'expert') setMode('expert');
  else if (z === 'simple') setMode('simple');
  else if (z === 'open') { R.simple.go(v); setMode('expert'); }
  else if (z === 'result') { ST.view = 'result'; draw(); }
  else if (z === 'again') { ST.view = 'drop'; ST.err = ''; draw(); }
  else if (z === 'pdf') R.simple.pdf();
  else if (z === 'save') R.simple.save();
  else if (z === 'solve') { EZSeed.busy(true, 'Trying the insulation combinations…'); setTimeout(function () { ST.sug = XP.solve(); EZSeed.busy(false); draw(); }, 30); }
  else if (z === 'apply') { var g = ST.sug; if (g && g.state === 'ok') R.S.list.forEach(function (c) { if (g.by[c.id]) g.by[c.id].apply(c); }); ST.sug = null; R.render(); draw(); }
  else if (z === 'dx') { ST.pend = null; dlgClose(); }
  else if (z === 'dgo') { var f = ST.pend; ST.pend = null; dlgClose(); read(f); }
  else if (z === 'dsave') { var f2 = ST.pend; ST.pend = null; dlgClose(); R.simple.save(); setTimeout(function () { read(f2); }, 400); }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'ezs-file') { var f = t.files[0]; t.value = ''; ask(f); }
  else if (t.dataset && t.dataset.ar) { var x = parseFloat(String(t.value).replace(',', '.')); if (x >= 0) { ST.sug = null; R.simple.area(t.dataset.ar, x); } draw(); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.ar) e.target.blur();
  else if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'ezs-drop') { e.preventDefault(); var f = document.getElementById('ezs-file'); if (f) f.click(); }
  else if (e.key === 'Escape' && document.getElementById('ezs-dlg')) { ST.pend = null; dlgClose(); }
});
/* a PDF dropped anywhere on the simple page */
['dragenter', 'dragover'].forEach(function (n) { document.addEventListener(n, function (e) { if (mode() !== 'simple' || !e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return; e.preventDefault(); var d = document.getElementById('ezs-drop'); if (d) d.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (n) { document.addEventListener(n, function (e) { var d = document.getElementById('ezs-drop'); if (d && (n === 'drop' || !e.relatedTarget)) d.classList.remove('over'); }); });
document.addEventListener('drop', function (e) { if (mode() !== 'simple' || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); ask(e.dataTransfer.files[0]); });

setMode(forced ? 'expert' : saved() === 'expert' ? 'expert' : 'simple', false);
})();
