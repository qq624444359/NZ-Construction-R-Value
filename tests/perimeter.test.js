/* Ceiling perimeter of a truss roof — run with: node tests/perimeter.test.js
   The case is 32 Kaitiaki Drive (zone 1): 30° pitch, R7.0 275 mm between the chords + R2.6 110 mm over.
   Heel height is measured from the top of the wall (underside of the bottom chord) to the top edge of the top chord
   (MiTek GANG-NAIL Residential Manual). A 359 mm heel gives 385.0 mm of room at the top plate centreline. */
'use strict';
const assert = require('assert');
const M = require('./_load.js');

function roof(edge, more) {
  const c = M.newC('roof'); c.id = 'c1'; c.name = 'Roof';
  Object.assign(c.v.fr, { insR: 7.0, insT: 275, prod: 'Pink® Superbatts®' });
  Object.assign(c.v.over, { on: true, r: 2.6, t: 110, prod: 'Pink® Batts® Ceiling' });
  Object.assign(c.v.edge, { pitch: 30, heel: 359, psel: 'product', pprod: 'Pink® Superbatts®', pR: 7.0, pT: 275, pW: 460, area: 186.628, perim: 48 }, edge || {});
  Object.assign(c, more || {});
  const st = M.strategy(c), s = M.toSheet(st.ce, [st.ce]);
  return { c, st, s, P: s.perimeter, text: JSON.stringify(s) };
}
const texts = P => P.checks.map(k => k.text).join('\n');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok  ' + name); };

t('32 Kaitiaki Drive: field 9.82 (Rb 9.55), perimeter 7.10 (Rb 6.94), room at the heel 385.0', () => {
  const { s, P, st } = roof();
  assert.strictEqual(s.total, 9.82); assert.strictEqual(s.portions[0].rb, 9.55);
  assert.strictEqual(P.total, 7.1); assert.strictEqual(P.portions[0].rb, 6.94);
  assert.strictEqual(st.G.H.toFixed(1), '385.0');
  assert.strictEqual(P.area.aP.toFixed(1), '24.0'); assert.strictEqual(P.area.aF.toFixed(1), '162.6');
});
t('a ceiling batt carried to the edge: no strip-width or top-plate check, nothing about -40 mm', () => {
  const { P, text, st } = roof();
  assert.ok(st.pp.batt && st.pp.lower);
  assert.ok(!/-40\.0|460 − 500|half the plate|Laid from/.test(text));
  assert.ok(P.checks.every(k => k.ok && !k.warn));
  assert.strictEqual(texts(P), [
    'R7.0 275 mm + R2.6 110 mm: 385 + 25 = 410 mm > room at the heel 385.0 mm — does not fit — the ceiling perimeter part takes the first 500 mm',
    'Pink® Superbatts® R7.0: 275 + 25 = 300 mm ≤ room at the heel 385.0 mm — fits',
    'Perimeter RT 7.10 ≥ R2.6 (2.1.2.11(a), each part of the roof)'].join('\n'));
});
t('summary wording follows what is built', () => {
  assert.strictEqual(roof().P.build, 'top layer omitted — R7.0 at full thickness');
  assert.strictEqual(roof({ pprod: 'Pink® Batts® Perimeter', pR: 2.7, pT: 100, pW: 560 }).P.build, 'perimeter product');
  assert.strictEqual(roof({ psel: 'comp', pitch: 15, heel: null }).P.build, 'insulation compressed');
});
t('the perimeter insulation is sourced as itself, not as Pink Batts Perimeter', () => {
  const row = roof().P.edge.find(r => r[0] === 'Perimeter insulation');
  assert.ok(/Product Guide \(March 2023\); BRANZ Appraisal 238/.test(row[2]));
  assert.ok(!/Installation Guide/.test(JSON.stringify(roof().P.edge)));
});
t('least setback: 43.3 mm from the top plate centreline, 0 mm from the ceiling edge', () => {
  const { st } = roof();
  assert.strictEqual(st.G.xCL.toFixed(1), '43.3'); assert.strictEqual(st.G.xEdge, 0); assert.strictEqual(st.G.Wmin, 50); assert.strictEqual(st.G.W, 500);
});
t('strip width: entered value kept between the least setback (rounded up to 50) and 500; areas follow it', () => {
  const a = roof({ width: 100 }); assert.strictEqual(a.st.G.W, 100); assert.strictEqual(a.P.area.aP.toFixed(1), '4.8'); assert.strictEqual(a.P.total, 7.1);
  assert.strictEqual(roof({ width: 20 }).st.G.W, 50);
  assert.strictEqual(roof({ width: 800 }).st.G.W, 500);
  const low = roof({ heel: 290, width: 100 });      /* room 316 mm: 410 mm fits 162.8 mm in from the centreline, 117.8 mm from the ceiling edge */
  assert.strictEqual(low.st.G.xEdge.toFixed(1), '117.8'); assert.strictEqual(low.st.G.Wmin, 150); assert.strictEqual(low.st.G.W, 150);
});
t('Pink Batts Perimeter R2.7 (560 mm): width and top-plate checks still made', () => {
  const { P, st } = roof({ pprod: 'Pink® Batts® Perimeter', pR: 2.7, pT: 100, pW: 560 });
  assert.ok(!st.pp.batt);
  assert.ok(/Perimeter product over the top plate 60\.0 mm \(560 − 500\) ≥ half the plate, 45 mm/.test(texts(P)));
  assert.ok(P.edge.some(r => r[0] === 'Product thickness · width' && /Laid from 60\.0 mm over the top plate to 500 mm/.test(r[2])));
  assert.ok(P.edge.some(r => r[0] === 'Perimeter product' && /Installation Guide \(March 2026\)/.test(r[2])));
  const narrow = roof({ pprod: 'Pink® Batts® Perimeter', pR: 2.7, pT: 100, pW: 520 });
  const k = narrow.P.checks.find(x => /over the top plate/.test(x.text)); assert.ok(k && !k.ok && k.warn);
});
t('15° pitch, standard heel: R7.0 does not fit, the perimeter is compressed slices', () => {
  const { P, st, s } = roof({ psel: 'comp', pitch: 15, heel: null });
  assert.ok(st.G.H < 300); assert.strictEqual(P.pkind, 'comp'); assert.ok(st.cs && st.cs.rt > 0);
  assert.ok(/compressed/.test(P.type)); assert.ok(P.total < s.total);
});
t('minimums: R2.6 each part unless the ceiling is heated (R6.6, R3.3 within 500 mm)', () => {
  const a = roof(); assert.strictEqual(a.s.min, 2.6); assert.strictEqual(a.P.min, 2.6);
  const h = roof({}, { heated: true }); assert.strictEqual(h.s.min, 6.6); assert.strictEqual(h.P.min, 3.3);
});
t('heel height is from the top of the wall: the bottom chord is not added again', () => {
  const a = roof({ heel: 269 });                    /* 269 + 45 × tan 30° = 295.0 mm: R7.0 (275 + 25 = 300) does not fit */
  assert.strictEqual(a.st.G.H.toFixed(1), '295.0');
  const k = a.P.checks.find(x => /Superbatts® R7\.0: 275 \+ 25 = 300 mm > room at the heel 295\.0 mm — does not fit/.test(x.text)); assert.ok(k && !k.ok && !k.warn);
  const std = roof({ heel: null, pitch: 20 });      /* standard truss: heel = top chord depth ÷ cos pitch */
  assert.strictEqual(std.st.G.heel.toFixed(1), (M.D.topChord / Math.cos(20 * Math.PI / 180)).toFixed(1));
  assert.strictEqual(roof({ heel: 10 }).st.G.heel, roof({ heel: null }).st.G.heel);   /* never less than the standard heel */
});
console.log(n + ' tests passed');
