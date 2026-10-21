/*
 * Wall section for the R-value configurator — a vertical cut, drawn from the construction.
 *
 * Only the wall is drawn. Every line is placed from real dimensions in millimetres (y up
 * from the underside of the bottom plate, x = 0 at the outside face of the framing, inside to the right), then
 * flipped into SVG. The cut runs up the wall BETWEEN two studs, looking at the stud beyond:
 *
 *   - cut (in front):   cladding, cavity (and its horizontal battens behind vertical
 *                       boards), air barrier, nog, insulation, lining
 *   - beyond (behind):  the stud, and behind bevel-back boards the cavity batten on the stud line
 *
 * Only a window at mid-height is shown, centred on the first nog: the plates add nothing
 * to the insulation. The window is true scale and breaks off top and bottom; the
 * geometry is drawn in real coordinates and cropped, never squashed.
 *
 * Usage:  element.innerHTML = wallSection({ stud: { width: 45, depth: 90 }, ... })
 * Every part sits in a <g data-layer="..."> so hover/pin highlighting can target it.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    cladding: { type: 'bevel', thickness: 19, cover: 160, lap: 30 },  // 'bevel' | 'vertical' | 'sheet' (flat sheet on vertical cavity battens; give it a label)
    cavity: { depth: 20 },                  // null = direct fixed
    // vertical boards are fixed through horizontal cavity battens (drained / castellated);
    // take the centres from the cladding supplier
    horizontalBattens: { height: 45, spacing: 480 },
    barrier: { type: 'rigid', thickness: 7 },   // 'rigid' | 'wrap'
    stud: { width: 45, depth: 90 },
    spacing: 600,
    nogs: 800,                               // nog centres; null = none shown
    height: 2400,                            // underside of bottom plate to top of top plate
    topPlate: { depth: 45 },
    bottomPlate: { depth: 45 },
    lining: 10,
    insulation: { label: 'R2.6 · 90 mm', thickness: 90 },   // null = empty cavity
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

  function wallSection(input) {
    var S = merge(DEFAULTS, input || {});
    var key = 'ws' + (++uid);
    var H = S.height, D = S.stud.depth;
    var labels = S.labels === true;

    // ---- x positions, outside to inside -----------------------------------------
    var rigid = S.barrier.type === 'rigid';
    var bOut = rigid ? -S.barrier.thickness : 0;              // outside face of the air barrier
    var cOut = S.cavity ? bOut - S.cavity.depth : bOut;       // back of the cladding
    var vertical = S.cladding.type === 'vertical';
    var sheet = S.cladding.type === 'sheet';
    var clFace = cOut - S.cladding.thickness;                 // outside face of the cladding
    var liIn = D + S.lining;                                  // inside face of the wall lining

    // ---- y levels ---------------------------------------------------------------
    var bpTop = S.bottomPlate.depth;
    var tpBot = H - S.topPlate.depth;
    var clBottom = -50;                                       // cladding runs 50 below the bottom plate
    var nogY = [];                                            // nog centres
    for (var ny = S.nogs; S.nogs && ny < tpBot - S.stud.width; ny += S.nogs) nogY.push(ny);
    var ly = nogY.length ? nogY[0] : H / 2;                   // centre of the window shown
    var lo = ly - 250, hi = ly + 250;

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

    // ---- stud beyond ------------------------------------------------------------------
    function beyond(cls) {
      var s = rect(0, bpTop, D, tpBot, cls);
      if (S.cavity && !vertical) s += rect(cOut, clBottom, bOut, H + 400, cls);   // cavity batten on the stud line
      return s;
    }
    out.push(group('framing', beyond('beyond timber')));

    // ---- insulation between the studs (cut) ----------------------------------------
    var ins = S.insulation, t = ins ? Math.min(ins.thickness, D) : 0;
    if (ins) {
      // one column of loops stretched to the blanket's thickness, running up the wall
      var w = Math.max(60, t * 0.9), pid = key + '-batt';
      patterns.push('<pattern id="' + pid + '" width="' + f(w) + '" height="' + f(t) + '" ' +
        'patternUnits="userSpaceOnUse" patternTransform="translate(' + f(t) + ' 0) rotate(90)">' +
        '<g transform="scale(' + f(w / 76) + ' ' + f(t / 60) + ')" ' +
        'stroke-width="' + f(4 / Math.sqrt((w / 76) * (t / 60))) + '">' +
        '<path class="batt" d="M-38 30 C -18 -6, 18 -6, 38 30 C 18 66, -18 66, -38 30"/>' +
        '<path class="batt" d="M0 30 C 20 -6, 56 -6, 76 30 C 56 66, 20 66, 0 30"/>' +
        '<path class="batt" d="M38 30 C 58 -6, 94 -6, 114 30 C 94 66, 58 66, 38 30"/>' +
        '</g></pattern>');
      var fill = ' style="fill:url(#' + pid + ')"', segs = '', y0 = bpTop;
      nogY.concat([tpBot + S.stud.width / 2]).forEach(function (c) {
        var y1 = c - S.stud.width / 2;
        segs += rect(0, y0, t, y1, 'insulation', fill) +
          (ins.thickness > D ? rect(0, y0, t, y1, 'squashed') : '');
        y0 = c + S.stud.width / 2;
      });
      out.push(group('insulation', segs));
      labelR('insulation', [t / 2, ly + 150], 'Insulation · ' + ins.label);
    }
    out.push(group('framing', beyond('beyond-outline')));

    // ---- plates and nogs (cut) --------------------------------------------------------
    var fr = rect(0, 0, D, bpTop, 'cut timber x') + rect(0, tpBot, D, H, 'cut timber x');
    nogY.forEach(function (c) { fr += rect(0, c - S.stud.width / 2, D, c + S.stud.width / 2, 'cut timber x'); });
    out.push(group('framing', fr));
    if (nogY.length) labelR('framing', [D / 2, nogY[0]], 'Nogs at ' + S.nogs + ' centres');
    labelR('framing', [D * 0.75, ly + 90],
      'Studs ' + S.stud.width + ' × ' + D + ' at ' + S.spacing + ' · stud beyond');

    // ---- wall lining (cut) --------------------------------------------------------------
    out.push(group('lining', rect(D, 10, liIn, H, 'cut lining')));
    labelR('lining', [liIn, ly - 150], S.liningLabel ? 'Lining · ' + S.liningLabel : 'Lining · ' + S.lining + ' mm plasterboard');

    // ---- air barrier (cut) ----------------------------------------------------------------
    var top = H + 400;                                        // above the top band; clipped
    out.push(group('barrier', rigid
      ? rect(bOut, 0, 0, top, 'cut ply')
      : line([[-1, 0], [-1, top]], 'underlay')));

    // ---- cavity (cut, air) -------------------------------------------------------------------
    var HB = S.horizontalBattens, hbY = [];                  // horizontal batten centres
    if (S.cavity) {
      var cav = rect(cOut, clBottom, bOut, top, 'air-fill');
      if (vertical) {
        for (var hy = HB.height / 2; hy < top; hy += HB.spacing) {
          hbY.push(hy);
          cav += rect(cOut, hy - HB.height / 2, bOut, hy + HB.height / 2, 'cut timber x');
        }
      }
      out.push(group('cavity', cav));
    }

    // ---- cladding (cut) ------------------------------------------------------------------------
    var C = S.cladding, cl = '';
    if (vertical) {
      // one board cut along its length; the shiplap rebate of the joint beyond shows as a hidden line
      cl = rect(clFace, clBottom, cOut, top, 'cut timber') +
        line([[(clFace + cOut) / 2, clBottom], [(clFace + cOut) / 2, top]], 'hidden');
    } else if (sheet) {
      // a flat sheet cut along its length
      cl = rect(clFace, clBottom, cOut, top, 'cut ply');
    } else {
      // bevel-back boards: thin at the top, full thickness at the butt, each lapping the one below
      for (var yb = clBottom; yb < top; yb += C.cover) {
        cl += poly([[cOut, yb], [clFace, yb], [cOut - 6, yb + C.cover + C.lap], [cOut, yb + C.cover + C.lap]], 'cut timber');
      }
    }
    out.push(group('cladding', cl));

    // ---- the window: cropped to mid-height, a break line top and bottom --------------------------
    var minXd = clFace - 30, maxXd = liIn + 30, cid = key + '-window';
    var clips = '<clipPath id="' + cid + '"><rect x="' + f(minXd) + '" y="' + f(-hi) + '" width="' +
      f(maxXd - minXd) + '" height="' + f(hi - lo) + '"/></clipPath>';
    var shown = '<g clip-path="url(#' + cid + ')">' + out.join('') + '</g>';
    [lo, hi].forEach(function (by) {
      var zx = (clFace + D) / 2;
      shown += line([[minXd, by], [zx - 30, by], [zx - 12, by + 22], [zx + 12, by - 22], [zx + 30, by], [maxXd, by]], 'break');
    });

    // ---- labels with leaders ------------------------------------------------------------------
    labelL('cladding', [clFace + 4, ly + 100], S.cladding.label || (vertical ? 'Vertical shiplap weatherboard' : sheet ? 'Sheet cladding ' + S.cladding.thickness + ' mm' : 'Bevel-back weatherboard'));
    if (S.cavity) labelL('cavity', [(cOut + bOut) / 2, ly], S.cavity.depth + ' mm drained cavity');
    var hbIn = hbY.filter(function (y) { return y > lo + 40 && y < hi - 40; })[0];
    if (S.cavity && vertical && hbIn != null) labelL('cavity', [(cOut + bOut) / 2, hbIn],
      'Horizontal cavity battens at ' + HB.spacing);
    labelL('barrier', [bOut / 2, ly - 100], S.barrier.label || (rigid ? 'Rigid air barrier ' + S.barrier.thickness + ' mm' : 'Building wrap'));
    var FS = 40, LGAP = 58;
    var colL = clFace - 140, colR = liIn + 90;
    function place(list, col, side) {
      list.sort(function (a, b) { return b.a[1] - a.a[1]; });
      var prev = Infinity, svg = '';
      list.forEach(function (l) {
        var ly = Math.min(l.a[1], prev - LGAP);
        prev = ly;
        var elbow = side < 0 ? [col + 20, ly] : [col - 20, ly];
        svg += group(l.id, line([l.a, [side < 0 ? col + 60 : Math.max(l.a[0] + 30, col - 60), ly], elbow], 'leader') +
          '<circle class="leader-dot" cx="' + f(l.a[0]) + '" cy="' + f(-l.a[1]) + '" r="6"/>' +
          text(col, ly - FS * 0.35, l.s, numbers ? 'label num' : 'label', side < 0 ? 'end' : 'start'));
      });
      return { svg: svg, low: prev };
    }
    var left = place(labelsL, colL, -1), right = place(labelsR, colR, 1);

    var maxY = hi + 30 + (labels ? 90 : 0);
    var minY = Math.min(lo - 30, left.low - 50, right.low - 50);
    var minX = labels ? colL - (numbers ? 110 : 560) : minXd, maxX = labels ? colR + (numbers ? 110 : 700) : maxXd;
    var caps = labels
      ? text(clFace, maxY - 60, 'OUTSIDE', 'caption', 'end') + text(liIn, maxY - 60, 'INSIDE', 'caption', 'start')
      : '';

    return '<svg class="wall-section" xmlns="http://www.w3.org/2000/svg" viewBox="' +
      [f(minX), f(-maxY), f(maxX - minX), f(maxY - minY)].join(' ') + '" role="img" ' +
      'aria-label="Wall section drawn from the current construction">' +
      '<defs>' + patterns.join('') + clips + '</defs>' + shown + left.svg + right.svg + caps + '</svg>';
  }

  root.wallSection = wallSection;
  if (typeof module !== 'undefined') module.exports = wallSection;
})(typeof window !== 'undefined' ? window : globalThis);

