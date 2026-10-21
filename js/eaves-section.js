/*
 * Eaves section for the R-value configurator — drawn from the construction, not sketched.
 *
 * Every line is placed from real dimensions in millimetres (y up, x = 0 at the
 * outside face of the wall framing, inside to the right), then flipped into SVG.
 * The drawing is a section cut BETWEEN two trusses looking at the truss beyond:
 *
 *   - cut (in front):   roofing, underlay, purlins or ply, ceiling battens, lining,
 *                       top plates, wall framing, fascia, soffit, insulation
 *   - beyond (behind):  the truss — top chord, bottom chord, heel web
 *
 * Two facts the previous drawings got wrong, fixed here by construction:
 *   1. The section runs up the slope, parallel to the sheet's ribs, so longrun
 *      roofing is a straight sheet with its rib line above — not a wave.
 *   2. The bottom chord sits on the 135 x 35 extra top plate, which is at the same
 *      level as the ceiling battens; the lining runs under both.
 *
 * Heel height follows the BRANZ convention: measured at the outside face of the
 * wall, from the top of the bottom chord to the top of the top chord, i.e.
 * D / cos(pitch) - bird's mouth. A truss has no bird's mouth, so a standard heel is
 * top chord depth / cos(pitch); anything above that lifts the top chord on a heel
 * web. The insulation starts lower, at the underside of the bottom chord, so the
 * depth it has at the wall is bottom chord depth + heel height.
 *
 * Usage:  element.innerHTML = eavesSection({ roofing: 'shingle', pitch: 25, ... })
 * Every part sits in a <g data-layer="..."> so hover/pin highlighting can target it.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    roofing: 'longrun',            // 'longrun' | 'shingle'
    structure: 'truss',            // 'truss' | 'rafter' (skillion: the ceiling follows the rafters)
    rafter: { depth: 190 },        // rafter only
    pitch: 20,                     // degrees
    overhang: 600,                 // outside face of wall to outside face of fascia, horizontal
    wallDepth: 90,                 // stud depth
    topPlate: { width: 90, depth: 45 },
    extraPlate: { width: 135, depth: 35 },   // null when there is none
    topChord: { depth: 90 },
    bottomChord: { depth: 90 },
    heelWeb: 90,                   // visible width of the heel web when the heel is raised
    heelHeight: null,              // null = standard heel
    clash: null,                   // { need, room } — full-thickness insulation that does not fit: drawn whole, the overlap hatched red
    purlin: { width: 70, depth: 45, spacing: 900 },   // longrun only; width along the slope
    ribHeight: 17,                 // longrun sheet rib height (corrugate ~17, trapezoidal ~27)
    ply: 15,                       // shingle only
    battens: { width: 70, depth: 35, spacing: 600 },
    lining: 13,
    fascia: { depth: 185, thickness: 25 },
    // insulation, bottom to top; layer: 'between' | 'over' | 'notched'
    insulation: [{ layer: 'between', label: 'R2.6 · 110 mm', thickness: 110 }],
    battenCavity: null,            // { label, thickness } when insulated
    ventGap: 25,                   // clear air required under the roofing (NZBC), counted from its underside
    perimeter: false,
    stripWidth: 500,
    zone: null,                    // with perimeter: 'field' = whole roof, field layers from the strip edge in; 'perimeter' = the strip enlarged, field greyed
    perimProduct: null,            // { kind: 'product' | 'comp', thickness, label } — P1 over the strip: a flat perimeter batt, or insulation compressed under a guard
    labels: false,                 // off at thumbnail size; turn on for the enlarged view
    numbers: null,                 // with labels: { roofing: 1, 'insulation-over': 3, ... } — numbers instead of words
    extent: 1000                   // how far inside the drawing runs
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

  function eavesSection(input) {
    var S = merge(DEFAULTS, input || {});
    var rad = S.pitch * Math.PI / 180;
    var tan = Math.tan(rad), cos = Math.cos(rad), sin = Math.sin(rad);
    var u = [cos, sin], n = [-sin, cos];
    function along(p, d, v) { return [p[0] + v[0] * d, p[1] + v[1] * d]; }

    var X = S.extent;
    var zone = S.zone, xDiv = S.wallDepth + S.stripWidth, XL = 160;   // field / perimeter boundary, measured from the ceiling edge
    if (zone === 'perimeter') X = xDiv + 140;
    var membrane = S.roofing === 'membrane', shingle = S.roofing === 'shingle' || membrane;   // membrane: on ply, like shingles
    var noBat = !!S.noBattens; if (noBat) S.battens = { width: 0, depth: 0, spacing: S.battens.spacing };
    var rafter = S.structure === 'rafter';
    if (rafter) S.extraPlate = null;                           // a rafter bears on the top plate itself
    // The 25 mm is measured down from the underside of the roofing, and whatever
    // already sits between the roofing and the top chords counts towards it: a
    // 45 mm purlin zone covers it outright, 15 mm ply sheathing covers none of it.
    // The truss itself does not block the airway — air passes through between
    // the trusses — so this is the only thing that limits the blanket's top.
    var clearAbove = shingle ? 0 : S.purlin.depth / cos;       // roofing underside above the top chords
    var vent = Math.max(0, S.ventGap - clearAbove);            // what the insulation still has to give up

    // ---- levels -------------------------------------------------------------
    var cb = S.extraPlate ? S.extraPlate.depth : 0;          // underside of bottom chord
    var bt = cb + S.bottomChord.depth;                        // top of bottom chord
    var D = rafter ? S.rafter.depth : S.topChord.depth;       // depth of the sloping member
    var tcv = D / cos;                                        // ... measured vertically
    // A rafter is birds-mouthed over the full top plate, so its underside meets the
    // top of the plate at the inside face of the wall and the bird's mouth takes
    // wallDepth * tan(pitch) off the heel (BRANZ: heel = D / cos - bird's mouth).
    // Its heel follows from that cut; only a truss can be raised.
    var standardHeel = rafter ? tcv - S.wallDepth * tan : tcv;
    var heel = S.heelHeight == null || rafter ? standardHeel : S.heelHeight;
    var lift = Math.max(0, heel - standardHeel);
    var heelBase = rafter ? 0 : bt;                           // heel is measured up from here
    function yu(x) { return rafter ? (x - S.wallDepth) * tan : bt + lift + x * tan; }  // member underside
    function yt(x) { return yu(x) + tcv; }                    // top chord top = roof plane
    var battenTop = cb, battenBot = cb - S.battens.depth;
    var liningBot = battenBot - S.lining;
    var xTail = -S.overhang + S.fascia.thickness;             // plumb cut of the rafter tail
    var wallTop = rafter ? -(S.battens.depth + S.lining) / cos : liningBot;  // wall lining meets the ceiling
    // the sheet (or the ply) lands on the fascia: its top follows whatever is above the
    // top chord, less the shingle roof's 10 mm intake gap
    var fTop = yt(xTail) + (shingle ? -10 : S.purlin.depth / cos);
    var fBot = Math.min(fTop - S.fascia.depth, yu(xTail) - 10);  // always covers the member's end
    var wallBottom = Math.min(wallTop - 320, fBot - 120);
    var m = [sin, -cos];                                      // down, square to the slope

    var out = [];
    var labels = S.labels === true;                            // too small to read on the thumbnail
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

    // ---- wall and plates (cut) ------------------------------------------------
    var wall = rect(0, wallBottom, S.wallDepth, -S.topPlate.depth, 'cut timber') +
      line([[0, wallBottom - 30], [0, wallBottom]], 'edge') +
      rect(0, -S.topPlate.depth, S.topPlate.width, 0, 'cut timber x') +
      rect(S.wallDepth, wallBottom, S.wallDepth + 10, wallTop, 'cut lining');
    out.push(group('wall', wall));
    labelL('wall', [0, wallBottom + 80], 'Wall framing ' + S.wallDepth + ' × 45');
    labelL('wall', [0, -S.topPlate.depth / 2], 'Top plate ' + S.topPlate.width + ' × ' + S.topPlate.depth);
    if (S.extraPlate) {
      out.push(group('wall', rect(0, 0, S.extraPlate.width, S.extraPlate.depth, 'cut timber x')));
      labelL('wall', [0, S.extraPlate.depth / 2],
        'Extra top plate ' + S.extraPlate.width + ' × ' + S.extraPlate.depth);
    }

    // ---- truss or rafter beyond ------------------------------------------------
    function beyond(cls) {
      if (rafter) {
        return poly([[xTail, yu(xTail)], [0, yu(0)], [0, 0], [S.wallDepth, 0], [X, yu(X)],
          [X, yt(X)], [xTail, yt(xTail)]], cls);                // bird's mouth over the top plate
      }
      return rect(0, cb, X, bt, cls) +
        poly([[xTail, yu(xTail)], [X, yu(X)], [X, yt(X)], [xTail, yt(xTail)]], cls) +
        (lift > 0 ? poly([[0, bt], [S.heelWeb, bt], [S.heelWeb, yu(S.heelWeb)], [0, yu(0)]], cls) : '');
    }
    out.push(group('chord', beyond('beyond timber')));
    if (rafter) {
      labelR('chord', [X, (yu(X) + yt(X)) / 2], 'Rafter ' + D + ' · rafter beyond');
    } else {
      labelR('chord', [X, (cb + bt) / 2], 'Bottom chord ' + S.bottomChord.depth + ' · truss beyond');
      labelR('chord', [X, (yu(X) + yt(X)) / 2], 'Top chord ' + S.topChord.depth + ' · truss beyond');
    }

    // ---- insulation (cut, drawn over the truss beyond) -----------------------
    var L0 = yt(0) - vent;                                     // highest the blanket can reach at x = 0
    function limit(x) { return L0 + x * tan; }
    var patterns = [];
    function battFill(key, t, origin, slope) {
      // one row of loops stretched to this layer's thickness — never stacked repeats.
      // origin is a point on the layer's top face; slope tilts the row to follow the roof.
      // one pattern per call: a split layer fills two bands of different thickness from the same key
      var w = Math.max(60, t * 0.9), id = 'es-batt-' + key + '-' + patterns.length;
      patterns.push('<pattern id="' + id + '" width="' + f(w) + '" height="' + f(t) + '" ' +
        'patternUnits="userSpaceOnUse" patternTransform="translate(' + f(origin[0]) + ' ' +
        f(-origin[1]) + ') rotate(' + f(slope ? -S.pitch : 0) + ')">' +
        '<g transform="scale(' + f(w / 76) + ' ' + f(t / 60) + ')" ' +
        'stroke-width="' + f(4 / Math.sqrt((w / 76) * (t / 60))) + '">' +
        '<path class="batt batt-' + key + '" d="M-38 30 C -18 -6, 18 -6, 38 30 C 18 66, -18 66, -38 30"/>' +
        '<path class="batt batt-' + key + '" d="M0 30 C 20 -6, 56 -6, 76 30 C 56 66, 20 66, 0 30"/>' +
        '<path class="batt batt-' + key + '" d="M38 30 C 58 -6, 94 -6, 114 30 C 94 66, 58 66, 38 30"/>' +
        '</g></pattern>');
      return ' style="fill:url(#' + id + ')"';
    }
    function band(ylo, yhi, cls, fill, x0) {
      if (S.clash && !zone) return poly([[x0 || 0, ylo], [X, ylo], [X, yhi], [x0 || 0, yhi]], cls, fill);   // full thickness to the edge
      var xa = Math.max(x0 || 0, (ylo - L0) / tan);                  // where there is room for any of it
      if (xa >= X) return '';
      var xb = (yhi - L0) / tan;                               // where it reaches full thickness
      var pts = [[xa, ylo], [X, ylo]];
      if (xb < X) { pts.push([X, yhi]); if (xb > xa) pts.push([xb, yhi]); }
      else pts.push([X, limit(X)]);
      pts.push([xa, Math.max(ylo, Math.min(yhi, limit(xa)))]);
      return poly(pts, cls, fill);
    }
    var y = cb, stackTop = cb;
    if (!rafter) S.insulation.forEach(function (layer) {
      var lo = layer.layer === 'over' ? stackTop : cb;
      var hi = lo + layer.thickness;
      stackTop = Math.max(stackTop, hi);
      var id = 'insulation-' + layer.layer;
      var split = layer.layer === 'between' && S.chordCovered === false && hi > bt + 0.5 && zone !== 'perimeter';
      out.push(group(id, zone === 'perimeter' ? band(lo, hi, 'ghost', '', xDiv) :
        split ? band(lo, bt, 'insulation ' + layer.layer, battFill(layer.layer, bt - lo, [0, bt]), zone ? xDiv : 0) +
          band(bt, hi, 'insulation between nocover', battFill(layer.layer, hi - bt, [0, hi]), zone ? xDiv : 0) +
          line([[0, bt], [X, bt]], 'chordtop') :
        band(lo, hi, 'insulation ' + layer.layer, battFill(layer.layer, hi - lo, [0, hi]), zone ? xDiv : 0)));
      var name = { between: 'Between the members', over: 'Over the framing',
        notched: 'Single layer, notched' }[layer.layer];
      labelR(id, [X, (lo + hi) / 2], name + ' · ' + layer.label + (layer.layer === 'between' && S.chordCovered === false && hi > bt + 0.5 ? ' · not over the chords' : layer.layer === 'between' && S.chordCovered && hi > bt + 0.5 ? ' · covers the chords' : ''));
    });
    // Perimeter strip (P1), from the top plate centreline to the strip edge: a flat perimeter batt,
    // or a blanket compressed under an insulation guard where the roof comes down, rising to full thickness.
    var pp = S.perimProduct, pTop = cb, px0 = S.wallDepth / 2, comp = pp && pp.kind === 'comp';
    function pTopAt(x) { return Math.min(pTop, limit(x)); }
    if (zone && !rafter && pp) {
      pTop = cb + pp.thickness;
      var xfp = (pTop - L0) / tan;
      var zp = [[px0, cb], [xDiv, cb], [xDiv, pTopAt(xDiv)]];
      if (xfp > px0 && xfp < xDiv) zp.push([xfp, pTop]);
      zp.push([px0, pTopAt(px0)]);
      out.push(group('insulation-perimeter', poly(zp, 'insulation perim', battFill('perim', pp.thickness, [0, pTop])) +
        (comp ? poly(zp, 'squashed') : '')));
      if (comp && xfp > px0) {
        var xg = Math.min(xfp, xDiv);
        out.push(group('perimeter-guard', line([[px0 - 20, limit(px0 - 20) + 6], [xg + 30, limit(xg + 30) + 6]], 'guard')));
      }
      labelR('insulation-perimeter', [S.wallDepth + S.stripWidth * 0.85, cb + Math.min(pp.thickness, pTopAt(S.wallDepth + S.stripWidth * 0.85) - cb) / 2], pp.label);
      out.push(group('perimeter-zone', line([[xDiv, cb - S.battens.depth - S.lining - 40], [xDiv, yt(xDiv) + 10]], 'divider')));
    }
    // Rafter: the blanket lies between the rafters, from the ceiling side up to 25 mm
    // under the roofing (less whatever the purlin zone already gives). Over the top
    // plate it sits on the plate.
    var room = D - vent, rh = 0;
    function yi(x) { return yu(x) + rh / cos; }               // top face of the rafter blanket
    if (rafter) {
      var layer = S.insulation.filter(function (l) { return l.layer === 'between'; })[0] || S.insulation[0];
      rh = Math.min(layer.thickness, room);
      var rpts = [[0, 0], [S.wallDepth, 0], [X, yu(X)], [X, yi(X)], [0, yi(0)]];
      out.push(group('insulation-between', poly(rpts, 'insulation between',
        battFill('between', rh, [0, yi(0)], true)) +
        (layer.thickness > room ? poly(rpts, 'squashed') : '')));
      labelR('insulation-between', [X, (yu(X) + yi(X)) / 2], 'Between the rafters · ' + layer.label);
    }
    // The roof space is all the air under the roofing: over the insulation, through
    // the trusses and out into the eaves above the soffit. The heel post is in the
    // truss plane, behind the cut, so it does not bound it.
    function roofSpace() {
      function under(x) { return yt(x) + clearAbove; }         // underside of the roofing
      var xf = Math.min(X, Math.max(0, (stackTop - L0) / tan));
      var soffitTop = fBot + 16;
      if (rafter) {                                            // just the airway over the blanket
        return poly([[xTail, under(xTail)], [X, under(X)], [X, yi(X)], [0, yi(0)],
          [0, soffitTop], [xTail, soffitTop]], 'roofspace-fill');
      }
      var pts = [[xTail, under(xTail)], [X, under(X)], [X, Math.min(stackTop, limit(X))]];
      if (zone && pp) {
        pts.push([xDiv, Math.min(stackTop, limit(xDiv))], [xDiv, pTopAt(xDiv)]);
        var xf2 = (pTop - L0) / tan;
        if (xf2 > px0 && xf2 < xDiv) pts.push([xf2, pTop]);
        pts.push([px0, pTopAt(px0)], [px0, Math.min(stackTop, limit(px0))]);
      }
      else if (xf > 0) pts.push([xf, Math.min(stackTop, limit(xf))]);
      pts.push([0, Math.min(stackTop, L0)], [0, soffitTop], [xTail, soffitTop]);
      return poly(pts, 'roofspace-fill');
    }
    var xFull = (stackTop - L0) / tan;
    var clashSvg = '';
    if (S.clash && !rafter && !zone && xFull > 0) {   // where the full-thickness blanket runs into the roofing and the ventilation gap
      var xc = Math.min(xFull, X);
      patterns.push('<pattern id="es-clash" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="#E53935" fill-opacity="0.16"/><line x1="11" y1="0" x2="11" y2="22" stroke="#E53935" stroke-width="5"/></pattern>');
      var cp = L0 < cb ? [[0, cb], [(cb - L0) / tan, cb]] : [[0, L0]];
      cp.push([xc, limit(xc)]);if (xc < xFull) cp.push([xc, stackTop]);cp.push([0, stackTop]);
      clashSvg = group('clash', poly(cp, 'clash', ' style="fill:url(#es-clash)"') +
        text(20, stackTop + 60, 'Clash: insulation needs ' + Math.round(S.clash.need) + ' mm, room ' + Math.round(S.clash.room) + ' mm', 'dimtext strong clashtext'));
    }
    else if (!rafter && xFull > S.wallDepth && !zone) {   // only where the ceiling itself is short of room
      var xs = Math.min(xFull, X);
      out.push(group('perimeter', poly([[0, cb], [xs, cb], [xs, limit(xs)], [0, L0]], 'squashed')));
    }
    if (S.battenCavity && !rafter) {
      var cav = '', x0 = S.extraPlate ? S.extraPlate.width : S.wallDepth;
      var cavFill = battFill('battens', battenTop - battenBot, [0, battenTop]);
      for (var k = 1; ; k++) {
        var bx = S.wallDepth + k * S.battens.spacing - S.battens.width / 2;
        var x1 = Math.min(bx, X);
        if (x1 > x0) cav += rect(x0, battenBot, x1, battenTop, 'insulation battens', cavFill);
        x0 = bx + S.battens.width;
        if (x0 >= X) break;
      }
      out.push(group('insulation-battens', cav));
      labelR('insulation-battens', [X, (battenBot + battenTop) / 2 + 20],
        'Between the battens · ' + S.battenCavity.label);
    }

    // the member beyond stays legible through the insulation in front of it
    out.push(group('chord', beyond('beyond-outline')));

    // ---- battens and lining (cut) ----------------------------------------------
    if (rafter) {
      // under the rafters and square to them: battens cut across, lining along the slope
      var P0 = [S.wallDepth, 0], run = (X - S.wallDepth) / cos;
      var bw = S.battens.width, bd = S.battens.depth, sbat = '', scav = '';
      var scavFill = S.battenCavity ? battFill('battens', bd, P0, true) : '';
      for (var sb = 0; !noBat && sb < run; sb += S.battens.spacing) {
        var A = along(P0, sb, u), Bw = along(P0, Math.min(sb + bw, run), u);
        sbat += poly([A, Bw, along(Bw, bd, m), along(A, bd, m)], 'cut timber x');
        var next = along(P0, Math.min(sb + S.battens.spacing, run), u);
        if (S.battenCavity && sb + bw < run) {
          scav += poly([Bw, next, along(next, bd, m), along(Bw, bd, m)], 'insulation battens', scavFill);
        }
      }
      if (S.battenCavity) {
        out.push(group('insulation-battens', scav));
        labelR('insulation-battens', along(along(P0, run, u), bd / 2, m),
          'Between the battens · ' + S.battenCavity.label);
      }
      if (!noBat) {
        out.push(group('battens', sbat));
        labelR('battens', along(along(P0, run - bw / 2, u), bd / 2, m),
          'Ceiling battens ' + bw + ' × ' + bd + ' at ' + S.battens.spacing);
      }
      var L0p = along(P0, bd, m), L1p = along(along(P0, run, u), bd, m);
      out.push(group('lining', poly([L0p, L1p, along(L1p, S.lining, m), along(L0p, S.lining, m)], 'cut lining')));
      labelR('lining', along(L1p, S.lining, m), 'Sloping ceiling ' + S.lining + ' mm plasterboard');
    }
    var bat = '';
    for (var b = 1; !rafter && !noBat && S.wallDepth + b * S.battens.spacing - S.battens.width / 2 < X; b++) {
      var c = S.wallDepth + b * S.battens.spacing;
      bat += rect(c - S.battens.width / 2, battenBot, Math.min(c + S.battens.width / 2, X), battenTop, 'cut timber x');
    }
    if (!rafter) {
      if (!noBat) {
        out.push(group('battens', bat));
        labelR('battens', [X, (battenBot + battenTop) / 2 - 20],
          'Ceiling battens ' + S.battens.width + ' × ' + S.battens.depth + ' at ' + S.battens.spacing);
      }
      out.push(group('lining', rect(S.wallDepth, liningBot, X, battenBot, 'cut lining')));
      labelR('lining', [X, liningBot - 10], 'Ceiling lining ' + S.lining + ' mm plasterboard');
    }

    // ---- fascia, soffit, gutter ---------------------------------------------
    var ov = -S.overhang;
    var eaves = rect(ov, fBot, xTail, fTop, 'cut timber') +
      rect(xTail, fBot + 10, 0, fBot + 16, 'cut lining') +
      line([[ov, fTop - 25], [ov - 10, fTop - 25], [ov - 10, fTop - 125], [ov - 115, fTop - 125],
        [ov - 135, fTop - 45], [ov - 120, fTop - 30]], 'gutter');
    out.push(group('eaves', eaves));
    labelL('eaves', [ov, (fTop + fBot) / 2], 'Fascia');
    labelL('eaves', [ov / 2, fBot + 13], 'Soffit lining');
    labelL('eaves', [ov - 120, fTop - 80], 'Gutter');

    // ---- roof build-up (cut) ---------------------------------------------------
    var tail = [xTail, yt(xTail)];
    var runTo = function (p) { return (X - p[0]) / cos; };      // slope length from p to the right edge
    if (!shingle) {
      var P = S.purlin, purl = '';
      for (var s = 0; s + P.width <= runTo(tail); s += P.spacing) {
        var B = along(tail, s, u);
        purl += poly([B, along(B, P.width, u), along(along(B, P.width, u), P.depth, n), along(B, P.depth, n)],
          'cut timber x');
      }
      function yr(x) { return yt(x) + P.depth / cos; }        // top of the purlins
      // roof paper runs straight over the purlin tops; the sheet sits on it
      var paperStart = [ov - 10, yr(ov - 10)], paperEnd = [X, yr(X)];
      out.push(group('substrate', purl));
      out.push(group('underlay', line([paperStart, paperEnd], 'underlay')));
      var sheetStart = along([ov - 50, yr(ov - 50)], 8, n), sheetEnd = along(paperEnd, 8, n);
      out.push(group('roofing',
        line([sheetStart, sheetEnd], 'sheet') +
        line([along(sheetStart, S.ribHeight, n), along(sheetEnd, S.ribHeight, n)], 'sheet-rib')));
      labelL('roofing', along(sheetStart, 1150, u), 'Longrun roofing');
      labelL('substrate', along(along(tail, P.spacing + P.width / 2, u), P.depth / 2, n), 'Purlins ' + P.width + ' × ' + P.depth + ' at ' + P.spacing);
      labelL('underlay', along(paperStart, P.spacing * 0.55 + 590, u), 'Roof paper over the purlins');
      out.push(group('roofspace', roofSpace() + (labels && !rafter && zone !== 'perimeter' ? text(X * 0.72,
        (yu(X * 0.72) + stackTop) / 2 - 15, 'Roof space', 'note', 'middle') : '')));
    } else {
      var from = [ov - 10, yt(ov - 10)];
      var plyQ = [from, [X, yt(X)], along([X, yt(X)], S.ply, n), along(from, S.ply, n)];
      out.push(group('substrate', poly(plyQ, 'cut ply')));
      var ul = [along(from, S.ply + 2, n), along([X, yt(X)], S.ply + 2, n)];
      out.push(group('underlay', line(ul, 'underlay solid')));
      var courses = [], exposure = 140, len = runTo(from);
      for (var d = 0; !membrane && d <= len; d += exposure) {
        var a = along(along(from, d, u), S.ply + 3, n);
        courses.push(a, along(a, 9, n), along(along(a, 9, n), Math.min(exposure, len - d), u));
      }
      if (membrane) out.push(group('roofing', line([along(from, S.ply + 4, n), along([X, yt(X)], S.ply + 4, n)], 'sheet')));
      else out.push(group('roofing', line(courses, 'shingles')));
      labelL('roofing', along(along(from, 1150, u), S.ply + 8, n), membrane ? 'Membrane roofing' : 'Asphalt shingles');
      if (!membrane) labelL('underlay', along(along(from, 900, u), S.ply + 2, n), 'D226+ underlay');
      labelL('substrate', along(along(from, 650, u), S.ply / 2, n), S.ply + ' mm ply on the ' + (rafter ? 'rafters' : 'top chords'));
      out.push(group('roofspace', roofSpace() + (labels && !rafter && zone !== 'perimeter' ? text(X * 0.72,
        (yu(X * 0.72) + stackTop) / 2 - 15, 'Roof space · ventilated', 'note', 'middle') : '')));
    }

    // ---- dimensions ----------------------------------------------------------
    if (!rafter && numbers) labelR('roofspace', [X, (yu(X) + stackTop) / 2], '');
    if (rafter && vent > 0) labelR('roofspace', [X, (yi(X) + yt(X)) / 2], vent + ' mm ventilated gap');
    // heel: outside face of the wall, top of bottom chord (or top plate) to top of the member
    if (labels) {
      out.push(group('chord', line([[0, heelBase], [0, yt(0)]], 'dim strong-heel') +
        line([[-20, yt(0)], [20, yt(0)]], 'dim') + line([[-20, heelBase], [20, heelBase]], 'dim')));
    }
    labelL('chord', [0, (heelBase + yt(0)) / 2], 'Heel ' + Math.round(heel) + ' mm' +
      (rafter ? " · bird's mouth " + Math.round(S.wallDepth * tan) : lift > 0 ? ' · raised' : ' · standard'));
    if (S.perimeter && labels && !rafter) {
      var px = S.wallDepth, py = liningBot - 70;   // from the outer edge of the ceiling: the inside face of the wall framing
      var per = line([[px, py], [px + S.stripWidth, py]], 'dim strong') +
        line([[px, py - 20], [px, py + 20]], 'dim strong') +
        line([[px + S.stripWidth, py - 20], [px + S.stripWidth, py + 20]], 'dim strong') +
        text(px + 30, py - 60, 'Perimeter ' + S.stripWidth + ' mm', 'dimtext strong');
      if (zone === 'perimeter' && comp) {
        // compressed: the room at the outer edge of the ceiling, and the guard
        var dxc = px + 14, xgl = Math.min((pTop - L0) / tan, xDiv) * 0.5, gy = limit(xgl) + 6, ty = yt(xgl) + clearAbove + 110;
        per += line([[dxc, cb], [dxc, pTopAt(dxc)]], 'dim strong') +
          text(px + 30, py - 120, Math.round(pTopAt(px) - cb) + ' mm at the ceiling edge', 'dimtext strong') +
          line([[xgl, gy], [xgl, ty - 10]], 'leader') + '<circle class="leader-dot" cx="' + f(xgl) + '" cy="' + f(-gy) + '" r="6"/>' +
          text(xgl + 15, ty, 'Insulation guard', 'dimtext strong');
      } else if (zone === 'perimeter' && pp) {
        // product thickness, and the clear gap above it to the roof underlay, at the outer edge of the ceiling
        var dx = px + 40, under0 = yt(dx) + clearAbove;
        per += line([[dx, cb], [dx, pTop]], 'dim strong') + line([[dx - 15, cb], [dx + 15, cb]], 'dim') + line([[dx - 15, pTop], [dx + 15, pTop]], 'dim') +
          text(dx + 25, (cb + pTop) / 2 - 15, pp.thickness + ' mm', 'dimtext strong') +
          line([[dx, pTop], [dx, under0]], 'dim') + line([[dx - 15, under0], [dx + 15, under0]], 'dim') +
          text(dx + 25, (pTop + under0) / 2 - 15, Math.round(under0 - pTop) + ' mm to underlay', 'dimtext strong');
      }
      out.push(group('perimeter', per));
    }

    // ---- labels with leaders -------------------------------------------------
    var FS = 44, GAP = 62;
    var colL = zone === 'perimeter' ? -XL - 80 : ov - 200, colR = X + 70;
    function place(list, col, side) {
      list.sort(function (a, b) { return b.a[1] - a.a[1]; });
      var prev = Infinity, svg = '';
      list.forEach(function (l) {
        var ly = Math.min(l.a[1], prev - GAP);
        prev = ly;
        var elbow = side < 0 ? [col + 20, ly] : [col - 20, ly];
        svg += group(l.id, line([l.a, [l.a[0] + side * 30, ly], elbow], 'leader') +
          '<circle class="leader-dot" cx="' + f(l.a[0]) + '" cy="' + f(-l.a[1]) + '" r="6"/>' +
          text(col, ly - FS * 0.35, l.s, numbers ? 'label num' : 'label', side < 0 ? 'end' : 'start'));
      });
      return { svg: svg, low: prev };
    }
    var left = place(labelsL, colL, -1), right = place(labelsR, colR, 1);

    var minX = labels ? colL - (numbers ? 110 : 760) : ov - 170, maxX = labels ? colR + (numbers ? 110 : 820) : X + 60;
    var maxY = (shingle ? yt(X) + S.ply + 30 : yt(X) + S.purlin.depth / cos + S.ribHeight + 30) + 40;
    if (zone === 'perimeter' && comp) maxY = Math.max(maxY, yt(xDiv * 0.5) + 260);
    var minY = Math.min(wallBottom - 40, left.low - 60, right.low - 60, S.perimeter && !rafter ? liningBot - (zone === 'perimeter' && comp ? 230 : 170) : Infinity);

    var clipP = zone === 'perimeter';           // the strip only: cropped at XL outside the wall, with a break line
    var defs = '<defs>' + patterns.join('') + (clipP ? '<clipPath id="es-pclip"><rect x="' + f(-XL) + '" y="' + f(-maxY) +
      '" width="' + f(X + XL) + '" height="' + f(maxY - minY) + '"/></clipPath>' : '') + '</defs>';
    if (typeof clashSvg !== 'undefined' && clashSvg) out.push(clashSvg);   // on top of the roofing it runs into
    var drawn = clipP ? '<g clip-path="url(#es-pclip)">' + out.join('') + '</g>' +
      line([[-XL, minY + 80], [-XL, cb - 30], [-XL - 22, cb - 12], [-XL + 22, cb + 12], [-XL, cb + 30], [-XL, maxY - 20]], 'break') : out.join('');
    var body = defs + drawn + left.svg + right.svg + (labels
      ? (clipP ? text(-XL - 15, minY + 30, 'OUTSIDE', 'caption', 'end') : text(ov, minY + 30, 'EAVES · OUTSIDE', 'caption')) + text(X, minY + 30, 'INSIDE', 'caption', 'end')
      : '');
    return '<svg class="eaves-section" xmlns="http://www.w3.org/2000/svg" viewBox="' +
      [f(minX), f(-maxY), f(maxX - minX), f(maxY - minY)].join(' ') + '" role="img" ' +
      'aria-label="Eaves section drawn from the current construction">' + body + '</svg>';
  }

  root.eavesSection = eavesSection;
  if (typeof module !== 'undefined') module.exports = eavesSection;
})(typeof window !== 'undefined' ? window : globalThis);

