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
       studs (walls), truss chords, rafters and joists (floors). An optional third entry is the product name */
    byMember: {
      brand: 'Pink® Batts®',
      stud: [[2.2, 90, 'Pink® Batts® Classic Wall'], [2.4, 90, 'Pink® Batts® Classic Wall'], [2.6, 90, 'Pink® Batts® Ultra® Wall'], [2.8, 90, 'Pink® Batts® Ultra® Wall'], [3.2, 140, 'Pink® Batts® Ultra® Wall'], [3.6, 140, 'Pink® Batts® Ultra® Wall'], [4.0, 140, 'Pink® Batts® Ultra® Wall'], [4.3, 140, 'Pink® Batts® Ultra® Wall']],
      chord: [[1.8, 95], [2.2, 115], [2.6, 110], [2.6, 140], [3.0, 160], [3.2, 170], [3.6, 180]],
      rafter: [[2.6, 110], [3.0, 160], [3.2, 170], [3.6, 180]],
      joist: [[1.8, 95], [2.6, 110], [3.2, 170], [3.6, 180]],
      batten: []
    }
  },
  /* named wall claddings. t = thickness mm, k = conductivity W/(m·K) — R is t ÷ k.
     group: fc fibre cement · tb timber · br brick · ot other. brand: the brand dropdown's entry.
     display: "<profile> (<brand> <product>, <t> mm)". The profile — Bevelback weatherboard · Weatherboard — horizontal ·
     Board — vertical · Sheet / panel — is the group the product sits in. n is the saved id: never rename one.
     old: no longer offered; kept so a project saved with it still opens */
  cladding: [
    /* James Hardie (NZ) — Product Identification Guide, May 2026; BRANZ Appraisal 1285 (2025) */
    { brand: 'James Hardie', n: 'James Hardie Hardie Plank Weatherboard 7.5 mm', t: 7.5, k: 0.25, group: 'fc', display: 'Bevelback weatherboard (James Hardie Hardie Plank, 7.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Hardie Plank Weatherboard 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Bevelback weatherboard (James Hardie Hardie Plank, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Linea Weatherboard 16 mm', t: 16, k: 0.25, group: 'fc', display: 'Bevelback weatherboard (James Hardie Linea, 16 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Oblique Weatherboard 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (James Hardie Oblique, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Stria Cladding 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (James Hardie Stria, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Oblique Weatherboard vertical 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Oblique, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Stria Cladding vertical 14 mm', t: 14, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Stria, 14 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Axon Panel Grooved 133, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel Grooved Grained 133 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Axon Panel Grooved Grained 133, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel Grooved 400 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Axon Panel Grooved 400, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel Smooth 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Axon Panel Smooth, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie Axon Panel Brushed Concrete 8.5 mm', t: 8.5, k: 0.25, group: 'fc', display: 'Board — vertical (James Hardie Axon Panel Brushed Concrete, 8.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie HardieFlex sheet 6 mm', t: 6, k: 0.25, group: 'fc', display: 'Sheet / panel (James Hardie HardieFlex, 6 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'James Hardie', n: 'James Hardie ExoTec Facade Panel 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Sheet / panel (James Hardie ExoTec Facade Panel, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    /* Clad Solutions — Shera. cladsolutions.nz; BRANZ Appraisals 1251, 1253, 1254 (2023). The two 7.5 mm entries are an earlier listing: kept so saved projects open, not offered */
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Bevelback 15 mm', t: 15, k: 0.25, group: 'fc', display: 'Bevelback weatherboard (Clad Solutions Shera Weatherboard Bevelback, 15 mm)', src: 'Supplier lists a 15 mm depth — confirm the board thickness and value with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Flat 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Weatherboard Flat, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Horizontal Weatherboard 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Shiplap Horizontal, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Vertical Weatherboard 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Board — vertical (Clad Solutions Shera Shiplap Vertical, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Cavity Cladding 7.5 mm', t: 7.5, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Weatherboard, 7.5 mm — earlier listing)', src: 'Value to be confirmed with the manufacturer', old: true },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Vertical Weatherboard 7.5 mm', t: 7.5, k: 0.25, group: 'fc', display: 'Board — vertical (Clad Solutions Shera Shiplap Vertical, 7.5 mm — earlier listing)', src: 'Value to be confirmed with the manufacturer', old: true },
    /* Cemintel (NZ) — cemintel.co.nz / EBOSS product pages. Territory is cement-bonded panel; Surround: the product page also quotes 16 mm — confirm */
    { brand: 'Cemintel', n: 'Cemintel Territory 16 mm', t: 16, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Cemintel Territory, 16 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Cemintel', n: 'Cemintel Territory vertical 16 mm', t: 16, k: 0.25, group: 'fc', display: 'Board — vertical (Cemintel Territory, 16 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Cemintel', n: 'Cemintel Barestone 9 mm', t: 9, k: 0.25, group: 'fc', display: 'Sheet / panel (Cemintel Barestone, 9 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Cemintel', n: 'Cemintel Surround 8 mm', t: 8, k: 0.25, group: 'fc', display: 'Sheet / panel (Cemintel Surround, 8 mm)', src: 'Value to be confirmed with the manufacturer' },
    /* timber — Abodo Vulcan (abodo.co.nz, profile size as listed); CHH Shadowclad grooved plywood 12 mm */
    { brand: 'Abodo', n: 'Abodo Vulcan Bevelback AW62 20 mm', t: 20, k: 0.12, group: 'tb', display: 'Bevelback weatherboard (Abodo Vulcan Bevelback AW62, 20 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Abodo', n: 'Abodo Vulcan WB18 18 mm', t: 18, k: 0.12, group: 'tb', display: 'Weatherboard — horizontal (Abodo Vulcan WB18, 18 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Abodo', n: 'Abodo Vulcan WB18 vertical 18 mm', t: 18, k: 0.12, group: 'tb', display: 'Board — vertical (Abodo Vulcan WB18, 18 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Abodo', n: 'Abodo Vulcan WB12 18 mm', t: 18, k: 0.12, group: 'tb', display: 'Board — vertical (Abodo Vulcan WB12, 18 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Abodo', n: 'Abodo Vulcan Fineline WB12F 18 mm', t: 18, k: 0.12, group: 'tb', display: 'Board — vertical (Abodo Vulcan Fineline WB12F, 18 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'CHH', n: 'CHH Shadowclad 12 mm', t: 12, k: 0.13, group: 'tb', display: 'Board — vertical (CHH Shadowclad grooved plywood, 12 mm)', src: 'Value to be confirmed with the manufacturer' },
    /* Hermpac (Herman Pacific) — Profile Portfolio, hermpac.co.nz; one entry per profile family and thickness, profile codes in the name */
    { brand: 'Hermpac', n: 'Hermpac Bevel Back 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Bevelback weatherboard (Hermpac Bevel Back HP61 · HP62 · CP325, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Rebated Bevel Back 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Bevelback weatherboard (Hermpac Rebated Bevel Back HP63 · HP64, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Rusticated 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Weatherboard — horizontal (Hermpac Rusticated CP835–CP840 · CP656 · HP67 · HP68, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Rusticated 28 mm', t: 28, k: 0.12, group: 'tb', display: 'Weatherboard — horizontal (Hermpac Rusticated CP1736 · CP1737 · CP1738, 28 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Splaycut 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Weatherboard — horizontal (Hermpac Splaycut HP65 · HP66 · HP65MS · HP66MS, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Vertical Shiplap 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Board — vertical (Hermpac Vertical Shiplap HP50–HP60 · CP862 · CP1470 · CP1739 · CP1740 · CP2257 · CP2258 · CP3344, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Vertical Shiplap 28 mm', t: 28, k: 0.12, group: 'tb', display: 'Board — vertical (Hermpac Vertical Shiplap CP1741 · CP1742 · CP1743 · CP3495, 28 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Hermpac', n: 'Hermpac Board and Batten 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Board — vertical (Hermpac Board & Batten HP120 · HP121 · CP2197, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    /* JSC — jsc.co.nz profiles J50, J51-22; RustiClad 18.5 mm (JSC). BevelClad and Board & Batten: no thickness published yet */
    { brand: 'JSC', n: 'JSC RustiClad 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Weatherboard — horizontal (JSC RustiClad rusticated, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'JSC', n: 'JSC VertiClad J50 18.5 mm', t: 18.5, k: 0.12, group: 'tb', display: 'Board — vertical (JSC VertiClad shiplap J50, 18.5 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'JSC', n: 'JSC VertiClad J51-22 22 mm', t: 22, k: 0.12, group: 'tb', display: 'Board — vertical (JSC VertiClad shiplap J51-22, 22 mm)', src: 'Value to be confirmed with the manufacturer' }
  ]
};
})(typeof window !== 'undefined' ? window : globalThis);
