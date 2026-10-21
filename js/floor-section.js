/*
 * Floor section for the R-value configurator — a cut across the joists, drawn from the construction.
 *
 * Only the floor is drawn. Every line is placed from real dimensions in millimetres (y up
 * from the underside of the lining, x = 0 at the centre of a joist), then flipped into SVG.
 * The cut runs across the joists BETWEEN two ceiling battens, looking at the batten beyond:
 *
 *   - cut (in front):   flooring, joists, insulation and its strap, the air below it, lining
 *   - beyond (behind):  the ceiling batten, which runs square to the joists
 *
 * The air under the insulation and the batten cavity are one air space: nothing separates
 * them between the battens. Both are drawn as one fill in one group.
 *
 * Two joist bays are shown, true scale, breaking off left and right; the geometry is drawn
 * in real coordinates and cropped, never squashed.
 *
 * Usage:  element.innerHTML = floorSection({ joist: { width: 45, depth: 240 }, ... })
 * Every part sits in a <g data-layer="..."> so hover/pin highlighting can target it.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    type: 'cantilever',                      // 'cantilever' (outside air below) | 'subfloor'
    flooring: { label: '20 mm particleboard', thickness: 20 },
    joist: { width: 45, depth: 240 },
    spacing: 400,
    battens: { width: 70, depth: 35, spacing: 600 },
    lining: { label: '4.5 mm fibre-cement', thickness: 4.5 },
    insulation: { label: 'R3.2 · 140 mm', thickness: 140 },   // null = empty joist bays
    labels: false                            // off at thumbnail size; turn on for the enlarged view
  };

  function merge(base, over) {
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var j in over) {
      var v = over[j];
      out[j] = v && typeof v === 'object' && !Array.isArray(v) && base[j] && typeof base[j] === 'object'
        ? merge(base[j], v) : v;
    }
    return out;
  }

  function f(n) { return (Math.round(n * 10) / 10).toString(); }
  function pt(p) { return f(p[0]) + ',' + f(-p[1]); }
  function poly(points, cls, extra) {
    return '<polygon class="' + cls + '" points="' + points.map(pt).join(' ') + '"' + (extra || '') + '/>';
  }
  function line(points, cls) {
    return '<polyline class="' + cls + '" points="' + points.map(pt).join(' ') + '"/>';
  }
  function rect(x0, y0, x1, y1, cls, extra) {
    return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cls, extra);
  }
  function text(x, y, s, cls, anchor) {
    return '<text class="' + cls + '" x="' + f(x) + '" y="' + f(-y) + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>';
  }
  function group(id, body) { return '<g data-layer="' + id + '">' + body + '</g>'; }

  var uid = 0;   // clip and pattern ids stay unique when the thumbnail and the zoom share a page

  function floorSection(input) {
    var S = merge(DEFAULTS, input || {});
    var key = 'fs' + (++uid);
    var labels = S.labels === true;
    var J = S.joist, SP = S.spacing, D = J.depth;

    // ---- y levels, bottom to top ------------------------------------------------
    var yL = S.lining.thickness;                // top of the lining
    var yB = yL + S.battens.depth;              // top of the battens = underside of the joists
    var yJ = yB + D;                            // top of the joists = underside of the flooring
    var yF = yJ + S.flooring.thickness;         // top of the flooring

    // ---- x extent: two bays, broken off either side ------------------------------
    var xa = -0.3 * SP, xb = 2.3 * SP;          // the window shown
    var x0 = xa - 100, x1 = xb + 100;           // drawn wider, then clipped
    var centres = [-SP, 0, SP, 2 * SP, 3 * SP];
    var bays = [];                              // clear space between joist faces
    for (var i = 0; i < centres.length - 1; i++) {
      bays.push([centres[i] + J.width / 2, centres[i + 1] - J.width / 2]);
    }

    var ins = S.insulation, t = ins ? Math.min(ins.thickness, D) : 0;
    var yI = yJ - t;                            // underside of the insulation
    var gap = D - t;                            // air left in the joist bay

    var out = [], patterns = [];
    var labelsL = [], labelsR = [];
    // numbers: { <layer id>: n } swaps the worded labels for one number per listed layer,
    // on the same leaders — for a drawing that sits beside a numbered schedule.
    var numbers = labels && S.numbers ? S.numbers : null, numbered = {};
    function label(list, id, anchor, s) {
      if (!labels) return;
      if (numbers) { if (numbers[id] == null || numbered[id]) return; numbered[id] = 1; s = String(numbers[id]); }
      list.push({ id: id, a: anchor, s: s });
    }
    function labelL(id, anchor, s) { label(labelsL, id, anchor, s); }
    function labelR(id, anchor, s) { label(labelsR, id, anchor, s); }

    // ---- batten beyond --------------------------------------------------------------
    out.push(group('battens', rect(x0, yL, x1, yB, 'beyond timber')));

    // ---- the air space: under the insulation and on through the batten cavity ----------
    var air = rect(x0, yL, x1, yB, 'air-fill');
    if (gap > 0) bays.forEach(function (b) { air += rect(b[0], yB, b[1], yI, 'air-fill'); });
    out.push(group('airspace', air));

    // ---- insulation, friction-fitted up against the flooring (cut) ----------------------
    if (ins) {
      // one row of loops stretched to the blanket's thickness, running along the bay
      var w = Math.max(60, t * 0.9), pid = key + '-batt';
      patterns.push('<pattern id="' + pid + '" width="' + f(w) + '" height="' + f(t) + '" ' +
        'patternUnits="userSpaceOnUse" patternTransform="translate(0 ' + f(-yJ) + ')">' +
        '<g transform="scale(' + f(w / 76) + ' ' + f(t / 60) + ')" ' +
        'stroke-width="' + f(4 / Math.sqrt((w / 76) * (t / 60))) + '">' +
        '<path class="batt" d="M-38 30 C -18 -6, 18 -6, 38 30 C 18 66, -18 66, -38 30"/>' +
        '<path class="batt" d="M0 30 C 20 -6, 56 -6, 76 30 C 56 66, 20 66, 0 30"/>' +
        '<path class="batt" d="M38 30 C 58 -6, 94 -6, 114 30 C 94 66, 58 66, 38 30"/>' +
        '</g></pattern>');
      var fill = ' style="fill:url(#' + pid + ')"', segs = '';
      bays.forEach(function (b) {
        segs += rect(b[0], yI, b[1], yJ, 'insulation', fill) +
          (ins.thickness > D ? rect(b[0], yI, b[1], yJ, 'squashed') : '');
        // plastic strap: stapled to the joist faces, run under the blanket
        if (gap > 0) segs += line([[b[0], yI + 30], [b[0] + 14, yI - 2], [b[1] - 14, yI - 2], [b[1], yI + 30]], 'strap');
      });
      out.push(group('insulation', segs));
      labelR('insulation', [1.5 * SP + 60, yJ - t / 2], 'Insulation · ' + ins.label);
    }
    if (gap > 0) labelR('airspace', [1.5 * SP + 60, (yB + yI) / 2],
      gap + ' mm enclosed air under the insulation · not ventilated');
    labelR('battens', [2 * SP + 90, (yL + yB) / 2],
      'Ceiling battens ' + S.battens.width + ' × ' + S.battens.depth + ' at ' + S.battens.spacing + ' · batten beyond');
    out.push(group('battens', rect(x0, yL, x1, yB, 'beyond-outline')));

    // ---- joists, flooring and lining (cut) ------------------------------------------------
    var jo = '';
    centres.forEach(function (c) { jo += rect(c - J.width / 2, yB, c + J.width / 2, yJ, 'cut timber x'); });
    out.push(group('joists', jo));
    labelL('joists', [0, yB + D * 0.35], 'Joists ' + J.width + ' × ' + D + ' at ' + SP + ' centres');

    out.push(group('flooring', rect(x0, yJ, x1, yF, 'cut ply')));
    labelL('flooring', [0.5 * SP, (yJ + yF) / 2], 'Flooring · ' + S.flooring.label);

    out.push(group('lining', rect(x0, 0, x1, yL, 'cut lining')));
    labelL('lining', [0.5 * SP, yL / 2], (S.type === 'cantilever' ? 'Soffit lining · ' : 'Lining under the joists · ') + S.lining.label);

    // ---- the window: two bays, a break line left and right -----------------------------------
    var lo = -30, hi = yF + 30, cid = key + '-window';
    var clips = '<clipPath id="' + cid + '"><rect x="' + f(xa) + '" y="' + f(-hi) + '" width="' +
      f(xb - xa) + '" height="' + f(hi - lo) + '"/></clipPath>';
    var shown = '<g clip-path="url(#' + cid + ')">' + out.join('') + '</g>';
    [xa, xb].forEach(function (bx) {
      var zy = yF / 2;
      shown += line([[bx, lo], [bx, zy - 30], [bx - 22, zy - 12], [bx + 22, zy + 12], [bx, zy + 30], [bx, hi]], 'break');
    });

    // ---- labels with leaders ------------------------------------------------------------------
    var FS = 40, LGAP = 58;
    var colL = xa - 140, colR = xb + 90;
    function place(list, col, side) {
      list.sort(function (a, b) { return b.a[1] - a.a[1]; });
      var prev = Infinity, svg = '';
      list.forEach(function (l) {
        var ly = Math.min(l.a[1], prev - LGAP);
        prev = ly;
        var elbow = side < 0 ? [col + 20, ly] : [col - 20, ly];
        svg += group(l.id, line([l.a, [side < 0 ? col + 60 : col - 60, ly], elbow], 'leader') +
          '<circle class="leader-dot" cx="' + f(l.a[0]) + '" cy="' + f(-l.a[1]) + '" r="6"/>' +
          text(col, ly - FS * 0.35, l.s, numbers ? 'label num' : 'label', side < 0 ? 'end' : 'start'));
      });
      return { svg: svg, low: prev };
    }
    var left = place(labelsL, colL, -1), right = place(labelsR, colR, 1);

    var maxY = hi + (labels ? 90 : 0);
    var minY = Math.min(lo, left.low - 50, right.low - 50) - (labels ? 90 : 0);
    var minX = labels ? colL - (numbers ? 110 : 820) : xa - 30, maxX = labels ? colR + (numbers ? 110 : 1100) : xb + 30;
    var caps = labels
      ? text(xa, maxY - 60, 'INSIDE', 'caption') +
        text(xa, minY + 30, S.type === 'cantilever' ? 'OUTSIDE · CANTILEVER' : 'SUBFLOOR SPACE', 'caption')
      : '';

    return '<svg class="floor-section" xmlns="http://www.w3.org/2000/svg" viewBox="' +
      [f(minX), f(-maxY), f(maxX - minX), f(maxY - minY)].join(' ') + '" role="img" ' +
      'aria-label="Floor section drawn from the current construction">' +
      '<defs>' + patterns.join('') + clips + '</defs>' + shown + left.svg + right.svg + caps + '</svg>';
  }

  root.floorSection = floorSection;
  if (typeof module !== 'undefined') module.exports = floorSection;
})(typeof window !== 'undefined' ? window : globalThis);

