/* Manufacturer products offered in the calculator's pickers — data only, no code.
   To list a manufacturer's products, add rows here; nothing else needs to change.
   Every value is the manufacturer's own declared value, and `src` (or the brand's
   entry in `sources`) says where it came from — it is printed under the product list.
   Loaded before rvalue-model.js. */
(function (g) {
g.RVC_PRODUCTS = {
  insulation: {
    /* where each brand's values come from — shown under its product list */
    sources: {
      'Pink® Batts®': 'Pink® Batts® declared values — Pink® Batts® Product Guide (March 2023); BRANZ Appraisal 238 (ceiling) / 767 (skillion).'
    },
    /* ceilings: between and over truss bottom chords. r = R-value, t = thickness mm, w = width mm,
       note 'two' = a two-layer system with Superbatts® */
    ceiling: [
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Classic', r: 1.8, t: 95, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Classic', r: 2.2, t: 115, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® R2.6C', r: 2.6, t: 110, w: 432, note: 'two' },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Classic', r: 2.6, t: 140, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Ceiling Retrofit', r: 2.9, t: 150, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® R3.0C', r: 3.0, t: 160, w: 432, note: 'two' },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Classic', r: 3.2, t: 170, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Ceiling Retrofit', r: 3.3, t: 175, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Classic', r: 3.6, t: 180, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Ultra®', r: 4.0, t: 195, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 4.5, t: 210, w: 460 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 5.0, t: 225, w: 460 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 6.0, t: 245, w: 460 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 7.0, t: 275, w: 460 }
    ],
    /* skillion and flat roofs: between rafters. A product named "… Skillion" is the one picked
       automatically when a roof becomes a skillion roof (the highest R that fits the rafter) */
    skillion: [
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 1.0, t: 40, w: 580 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 3.2, t: 115, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 3.6, t: 165, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 4.5, t: 165, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 5.0, t: 180, w: 560 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 6.0, t: 230, w: 560 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 7.4, t: 275, w: 560 }
    ],
    /* R-value · thickness pairs offered for each framing member, all from one brand:
       studs (walls), truss chords, rafters and joists (floors) */
    byMember: {
      brand: 'Pink® Batts®',
      stud: [[2.2, 90], [2.4, 90], [2.6, 90], [2.8, 90], [3.2, 140], [3.6, 140], [4.0, 140], [4.3, 140]],
      chord: [[1.8, 95], [2.2, 115], [2.6, 110], [2.6, 140], [3.0, 160], [3.2, 170], [3.6, 180]],
      rafter: [[2.6, 110], [3.0, 160], [3.2, 170], [3.6, 180]],
      joist: [[1.8, 95], [2.6, 110], [3.2, 170], [3.6, 180]],
      batten: []
    }
  },
  /* named wall claddings. t = thickness mm, k = conductivity W/(m·K) — R is t ÷ k.
     group: fc fibre cement · tb timber · br brick · ot other. brand: the brand dropdown's entry.
     display: how it reads in the product dropdown — start it with the brand in brackets, as below */
  cladding: [
    { brand: 'James Hardie', n: 'James Hardie Linea Weatherboard 16 mm', t: 16, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (James Hardie Linea, 16 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Stria Cladding 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (James Hardie Stria, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Sheet / panel (James Hardie Axon, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Oblique Weatherboard 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (James Hardie Oblique, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie HardieFlex sheet 6 mm', t: 6, k: 0.25, group: 'fc', display: 'Sheet / panel (James Hardie HardieFlex, 6 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Cavity Cladding 7.5 mm', t: 7.5, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Weatherboard Cavity Cladding, 7.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Vertical Weatherboard 7.5 mm', t: 7.5, k: 0.25, group: 'fc', display: 'Board — vertical (Clad Solutions Shera Shiplap Vertical, 7.5 mm)', src: 'Value to be confirmed with the manufacturer' }
  ]
};
})(typeof window !== 'undefined' ? window : globalThis);
