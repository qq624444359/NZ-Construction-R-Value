/* What's new: the release notes, shown once per version.
   The first visit after a new version goes live opens them; closing marks that version as seen in this browser,
   so the same version never shows twice. The "What's new" button in the bar opens them at any time.
   Newest first — a release adds its entry at the top. */
(function () {
  var NOTES = [
    { v: '1.23', d: '2026-11-27', items: [
      'What’s new: the notes for each version, shown once when it goes live — and at any time from What’s new in the bar, or in the footer on a phone.'
    ] },
    { v: '1.22', d: '2026-11-26', items: [
      'Drawing reader: an insulated garage door in the notes (“sectional garage door … R0.85”) puts the garage inside the thermal envelope — its floor, walls and door are counted, and the wall to the house is internal.',
      'A yard or courtyard closed in by the house is no longer counted as floor.',
      'Of two or more narrow external doors, the entrance door is taken as the solid one and the others as glazed doors — check them on the elevations.',
      'Window R written before the frame (“R-0.50 Aluminium Frame”) is read; a roof “perimeter R6.0” in the insulation summary is flagged to split off.'
    ] },
    { v: '1.21', d: '2026-11-23', items: [
      'Drawing reader: walls drawn in pieces either side of sliders and doors are closed across where the opening tags fill the gap — on plans drawn this way the floor area was coming out short.',
      'Two framings in one insulation cell (90 mm and 140 mm) give two walls; a skillion roof in the summary gives a skillion roof.',
      'The aluminium and timber window R from the insulation summary; a “Timber Frame” label by a tag takes the timber R.',
      'Openings on the roof plan are skylights; tags like EXW109-1, and tags with no size, are listed.'
    ] },
    { v: '1.20', d: '2026-11-23', items: [
      'Windows & doors: a window’s own R now has Done (or Enter) and “Use the default R”, as doors have.'
    ] },
    { v: '1.19', d: '2026-11-23', items: [
      'Windows & doors: Sort by name puts the windows in order of their IDs — EXW105 before EXW110.'
    ] },
    { v: '1.17', d: '2026-11-23', items: [
      'Simple mode: drop the drawings PDF and get the H1 check. Expert mode opens the full calculator.',
      'The drawing reader measures each floor plan, the floor over outside and the roof area.',
      'Clad Solutions AKERA weatherboard added.'
    ] }
  ];
  var KEY = 'ezh1.whatsNew', latest = NOTES[0].v;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var date = function (s) { var p = s.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; };
  var newer = function (a, b) { var x = a.split('.').map(Number), y = b.split('.').map(Number); for (var i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var seen = function () { try { return localStorage.getItem(KEY); } catch (e) { return undefined; } };
  var mark = function () { try { localStorage.setItem(KEY, latest); } catch (e) {} };

  function open(all) {
    if (document.getElementById('ezwn')) return;
    var was = seen(), list = all || !was ? NOTES : NOTES.filter(function (n) { return newer(n.v, was); });
    if (!all && !was) list = NOTES.slice(0, 1);   /* a first visit: just the latest */
    var rest = all ? [] : NOTES.filter(function (n) { return list.indexOf(n) < 0; }).slice(0, 4);
    var sec = function (n) { return '<section><div class="ezwn-h"><b>Version ' + esc(n.v) + '</b><span>' + date(n.d) + '</span></div><ul>' + n.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></section>'; };
    var el = document.createElement('div'); el.id = 'ezwn';
    el.innerHTML = '<div class="ezwn-bg"></div><div class="ezwn-box" role="dialog" aria-modal="true" aria-labelledby="ezwn-t">' +
      '<h3 id="ezwn-t">What’s new</h3><p class="ezwn-sub">' + (all ? 'Every version, newest first.' : list.length > 1 ? list.length + ' updates since your last visit.' : 'Updated ' + date(NOTES[0].d) + '.') + '</p>' +
      '<div class="ezwn-list">' + list.map(sec).join('') +
      (rest.length ? '<details><summary>Earlier versions</summary>' + rest.map(sec).join('') + '</details>' : '') + '</div>' +
      '<div class="ezwn-foot"><button class="ezwn-ok" data-wn="x">Got it</button></div></div>';
    var close = function () { mark(); el.remove(); document.removeEventListener('keydown', key); };
    var key = function (e) { if (e.key === 'Escape') close(); };
    el.addEventListener('click', function (e) { if (e.target.closest('[data-wn="x"]') || e.target.classList.contains('ezwn-bg')) close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(el); el.querySelector('.ezwn-ok').focus();
  }

  window.EZWhatsNew = { open: function () { open(true); }, latest: latest };
  document.addEventListener('click', function (e) { if (e.target.closest('[data-wn="open"]')) open(true); });
  var lab = document.querySelector('[data-wn="open"] .ezwn-v'); if (lab) lab.textContent = 'v' + latest;
  var vv = document.querySelector('.ezwn-vv'); if (vv) vv.textContent = latest + ' (' + date(NOTES[0].d) + ')';
  /* once per version: only where this browser can remember it — never on every visit */
  var s = seen(); if (s !== undefined && s !== latest) setTimeout(function () { open(false); }, 400);
})();
