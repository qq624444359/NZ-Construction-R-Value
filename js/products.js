/* Manufacturer products offered in the calculator's pickers — data only, no code.
   To list a manufacturer's products, add rows here; nothing else needs to change.
   Every value is the manufacturer's own declared value, and `src` (or the brand's
   entry in `sources`) says where it came from — it is printed under the product list.
   Loaded before rvalue-model.js. */
(function (g) {
g.RVC_PRODUCTS = {
  insulation: {
    /* where each brand's values come from — shown under its product list and on the PDF beside each R-value */
    sources: {
      'Pink® Batts®': 'Pink® Batts® declared values — Pink® Batts® Product Guide (March 2023); BRANZ Appraisal 238 (ceiling) / 767 (skillion).',
      'Earthwool®': 'Earthwool® declared values — Knauf Insulation NZ, Earthwool® comparison chart and product pages (earthwool.co.nz, knauf.com/en-NZ), November 2026.',
      'GreenStuf®': 'GreenStuf® declared values — Autex GreenStuf® Residential Insulation Guide (October 2025).',
      'Mammoth': 'Mammoth declared values — mammoth.co.nz wall, ceiling and roof, and underfloor product tables, November 2026.',
      'EXPOL': 'EXPOL declared values — EXPOL Technical Product Guide (2026): Tables 4.2 and 5.2 (timber underfloor), Table 6.2 (concrete floor) and ThermaSlab Edge specifications; ASTM C518-04.'
    },
    /* ceilings: between and over truss bottom chords. r = R-value, t = thickness mm, w = width mm,
       note 'two' = a two-layer system with Superbatts®. Listed by R-value, then thickness, whoever makes it */
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
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 7.0, t: 275, w: 460 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 3.4, t: 110, w: 580 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 3.6, t: 175, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Roll', r: 3.6, t: 150, w: 1200 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 4.1, t: 195, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 5.2, t: 210, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 7.0, t: 330, w: 460 },
      { brand: 'Earthwool®', name: 'Earthwool® Ceiling Batt', r: 8.0, t: 330, w: 460 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Pads', r: 2.9, t: 175, w: 430 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Pads', r: 3.2, t: 180, w: 430 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Pads', r: 3.4, t: 190, w: 430 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 1.8, t: 100, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 2.2, t: 150, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 2.4, t: 140, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 2.6, t: 140, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 2.9, t: 185, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 3.2, t: 190, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 3.4, t: 200, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 3.6, t: 210, w: 580 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 4.0, t: 220, w: 870 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Roll Form', r: 4.1, t: 210, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 1.8, t: 115, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 2.9, t: 185, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 3.2, t: 200, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 3.3, t: 210, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 3.6, t: 225, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 4.0, t: 240, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Ceiling Blanket', r: 4.1, t: 210, w: 870 }
    ],
    /* skillion and flat roofs: between rafters. A Pink® Batts® product named "… Skillion" is the one picked
       automatically when a roof becomes a skillion roof (the highest R that fits the rafter) */
    skillion: [
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 1.0, t: 40, w: 580 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 3.2, t: 115, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 3.6, t: 165, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Batts® Skillion', r: 4.5, t: 165, w: 432 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 5.0, t: 180, w: 560 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 6.0, t: 230, w: 560 },
      { brand: 'Pink® Batts®', name: 'Pink® Superbatts®', r: 7.4, t: 275, w: 560 },
      { brand: 'Earthwool®', name: 'Earthwool® Skillion Batt', r: 3.2, t: 105, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Skillion Batt', r: 5.0, t: 165, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Skillion Batt', r: 6.0, t: 215, w: 430 },
      { brand: 'Earthwool®', name: 'Earthwool® Skillion Batt', r: 7.4, t: 265, w: 430 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Blanket', r: 2.9, t: 115, w: 870 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Blanket', r: 3.2, t: 165, w: 870 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Blanket', r: 3.4, t: 165, w: 870 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Blanket', r: 3.6, t: 165, w: 870 },
      { brand: 'GreenStuf®', name: 'GreenStuf® Ceiling Blanket', r: 3.6, t: 140, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Skillion Sections', r: 2.9, t: 115, w: 560 },
      { brand: 'Mammoth', name: 'Mammoth Skillion Sections', r: 3.2, t: 165, w: 570 },
      { brand: 'Mammoth', name: 'Mammoth Skillion Sections', r: 3.6, t: 165, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Skillion Sections', r: 3.6, t: 140, w: 870 },
      { brand: 'Mammoth', name: 'Mammoth Skillion Sections', r: 5.0, t: 215, w: 870 }
    ],
    /* R-value · thickness · product name [· brand] offered for each framing member: studs (walls), truss chords,
       rafters and joists (floors). No brand = the default brand below, the one filled in automatically */
    byMember: {
      brand: 'Pink® Batts®',
      stud: [
        [2.2, 90, 'Pink® Batts® Classic Wall'],
        [2.4, 90, 'Pink® Batts® Classic Wall'],
        [2.6, 90, 'Pink® Batts® Ultra® Wall'],
        [2.8, 90, 'Pink® Batts® Ultra® Wall'],
        [3.2, 140, 'Pink® Batts® Ultra® Wall'],
        [3.6, 140, 'Pink® Batts® Ultra® Wall'],
        [4.0, 140, 'Pink® Batts® Ultra® Wall'],
        [4.3, 140, 'Pink® Batts® Ultra® Wall'],
        [2.2, 90, 'Earthwool® Wall Batt', 'Earthwool®'],
        [2.4, 90, 'Earthwool® Wall Batt', 'Earthwool®'],
        [2.6, 90, 'Earthwool® Wall Batt', 'Earthwool®'],
        [2.8, 90, 'Earthwool® Wall Batt', 'Earthwool®'],
        [3.2, 140, 'Earthwool® Wall Batt', 'Earthwool®'],
        [3.6, 140, 'Earthwool® Wall Batt', 'Earthwool®'],
        [4.1, 140, 'Earthwool® Wall Batt', 'Earthwool®'],
        [4.4, 140, 'Earthwool® Wall Batt', 'Earthwool®'],
        [2.0, 90, 'GreenStuf® Wall Pads', 'GreenStuf®'],
        [2.2, 90, 'GreenStuf® Wall Pads', 'GreenStuf®'],
        [2.5, 90, 'GreenStuf® Wall Pads', 'GreenStuf®'],
        [3.2, 140, 'GreenStuf® Wall Pads', 'GreenStuf®'],
        [3.6, 140, 'GreenStuf® Wall Pads', 'GreenStuf®'],
        [1.9, 90, 'Mammoth Wall Sections', 'Mammoth'],
        [2.0, 90, 'Mammoth Wall Sections', 'Mammoth'],
        [2.2, 90, 'Mammoth Wall Sections', 'Mammoth'],
        [2.5, 90, 'Mammoth Wall Sections', 'Mammoth'],
        [2.8, 140, 'Mammoth Wall Sections', 'Mammoth'],
        [3.2, 140, 'Mammoth Wall Sections', 'Mammoth'],
        [3.6, 140, 'Mammoth Wall Sections', 'Mammoth']],
      chord: [[1.8, 95], [2.2, 115], [2.6, 110], [2.6, 140], [3.0, 160], [3.2, 170], [3.6, 180]],
      rafter: [[2.6, 110], [3.0, 160], [3.2, 170], [3.6, 180]],
      joist: [
        [1.5, 100, 'Pink® Batts® Polyester Underfloor'],
        [2.6, 110, 'Pink® Batts® SnugFloor®'],
        [3.2, 140, 'Pink® Batts® SnugFloor®'],
        [2.6, 90, 'Earthwool® Floor Batt', 'Earthwool®'],
        [3.0, 105, 'Earthwool® Floor Batt', 'Earthwool®'],
        [1.5, 100, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [1.8, 100, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [2.0, 115, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [2.6, 140, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [2.9, 140, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [3.4, 140, 'GreenStuf® Thermal Underfloor', 'GreenStuf®'],
        [1.9, 90, 'Mammoth Underfloor Sections', 'Mammoth'],
        [2.8, 140, 'Mammoth Underfloor Sections', 'Mammoth'],
        [3.2, 140, 'Mammoth Underfloor Sections', 'Mammoth'],
        [3.4, 140, 'Mammoth Underfloor Sections', 'Mammoth'],
        [1.5, 100, 'Mammoth Underfloor Blanket', 'Mammoth'],
        [1.8, 115, 'Mammoth Underfloor Blanket', 'Mammoth'],
        [2.0, 115, 'Mammoth Underfloor Blanket', 'Mammoth'],
        [2.6, 140, 'Mammoth Underfloor Blanket', 'Mammoth'],
        [1.4, 60, 'EXPOL R1.4 UnderFloor', 'EXPOL'],
        [1.8, 60, 'EXPOL R1.8 Black UnderFloor', 'EXPOL'],
        [2.5, 100, 'EXPOL R2.5 UnderFloor', 'EXPOL'],
        [2.8, 120, 'EXPOL R1.4 UnderFloor (double layer)', 'EXPOL'],
        [3.1, 100, 'EXPOL R3.1 Black UnderFloor', 'EXPOL'],
        [3.6, 120, 'EXPOL R1.8 Black UnderFloor (double layer)', 'EXPOL']],
      batten: []
    },
    /* concrete slab-on-ground (H1/AS1 Appendix E). under: boards under the slab — the table used follows the board's R
       (R1.2 or R2.4 tables). edge: vertical slab-edge insulation (the tables give R1.0 only). r = product R-value, t = thickness mm */
    slab: {
      /* EXPOL Technical Product Guide (2026) Table 6.2 — ASTM C518-04 */
      under: [
      { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 1.50, t: 50 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 1.80, t: 60 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 2.20, t: 75 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 2.50, t: 85 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 2.70, t: 90 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 3.00, t: 100 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 3.25, t: 110 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 3.60, t: 120 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 4.50, t: 150 }, { brand: 'EXPOL', name: 'EXPOL SLABX200', r: 6.00, t: 200 },
      { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 0.57, t: 20 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 0.71, t: 25 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 0.86, t: 30 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.00, t: 35 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.14, t: 40 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.29, t: 45 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.43, t: 50 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.58, t: 55 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.71, t: 60 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 1.86, t: 65 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.00, t: 70 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.20, t: 75 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.29, t: 80 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.43, t: 85 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.57, t: 90 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.72, t: 95 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 2.86, t: 100 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 3.14, t: 110 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 3.43, t: 120 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 4.28, t: 150 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab VH', r: 5.70, t: 200 },
      { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 0.56, t: 20 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 0.69, t: 25 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 0.83, t: 30 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 0.97, t: 35 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.11, t: 40 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.25, t: 45 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.39, t: 50 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.53, t: 55 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.67, t: 60 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.81, t: 65 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 1.94, t: 70 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.08, t: 75 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.22, t: 80 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.36, t: 85 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.50, t: 90 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.64, t: 95 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 2.78, t: 100 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 3.06, t: 110 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 3.33, t: 120 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 4.16, t: 150 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab H', r: 5.55, t: 200 },
      { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 0.53, t: 20 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 0.66, t: 25 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 0.79, t: 30 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 0.92, t: 35 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.05, t: 40 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.18, t: 45 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.32, t: 50 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.45, t: 55 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.58, t: 60 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.71, t: 65 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.84, t: 70 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 1.97, t: 75 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.11, t: 80 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.24, t: 85 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.37, t: 90 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.50, t: 95 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.63, t: 100 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 2.89, t: 110 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 3.16, t: 120 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 3.95, t: 150 }, { brand: 'EXPOL', name: 'EXPOL ThermaSlab S', r: 5.26, t: 200 },
      { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 0.63, t: 20 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 0.78, t: 25 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 0.94, t: 30 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.09, t: 35 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.25, t: 40 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.41, t: 45 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.56, t: 50 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.72, t: 55 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 1.88, t: 60 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.03, t: 65 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.19, t: 70 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.34, t: 75 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.50, t: 80 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.66, t: 85 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.81, t: 90 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 2.97, t: 95 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 3.13, t: 100 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 3.44, t: 110 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 3.75, t: 120 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 4.69, t: 150 }, { brand: 'EXPOL', name: 'EXPOL Platinum Board', r: 6.25, t: 200 },
      { brand: 'EXPOL', name: 'EXPOL-X', r: 0.36, t: 10 }, { brand: 'EXPOL', name: 'EXPOL-X', r: 1.10, t: 30 }, { brand: 'EXPOL', name: 'EXPOL-X', r: 1.45, t: 40 }, { brand: 'EXPOL', name: 'EXPOL-X', r: 1.80, t: 50 }, { brand: 'EXPOL', name: 'EXPOL-X', r: 2.70, t: 75 }, { brand: 'EXPOL', name: 'EXPOL-X', r: 3.60, t: 100 }],
      /* EXPOL Technical Product Guide (2026), ThermaSlab Edge technical specifications */
      edge: [
      { brand: 'EXPOL', name: 'EXPOL ThermaSlab Edge', r: 1.0, t: 30 }]
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
    /* Clad Solutions — Shera. cladsolutions.nz (Shera Shiplap: Modern Stagger MS200 / MS150 horizontal or vertical, DeLine DL00–DL02 vertical only, all 10 mm); BRANZ Appraisals 1251, 1253, 1254 (2023). The two 7.5 mm entries are an earlier listing: kept so saved projects open, not offered */
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Bevelback 15 mm', t: 15, k: 0.25, group: 'fc', display: 'Bevelback weatherboard (Clad Solutions Shera Weatherboard Bevelback, 15 mm)', src: 'Supplier lists a 15 mm depth — confirm the board thickness and value with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Weatherboard Flat 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Weatherboard Flat, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Horizontal Weatherboard 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Weatherboard — horizontal (Clad Solutions Shera Shiplap Modern Stagger MS200 · MS150, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
    { brand: 'Clad Solutions', n: 'Clad Solutions Shera Shiplap Vertical Weatherboard 10 mm', t: 10, k: 0.25, group: 'fc', display: 'Board — vertical (Clad Solutions Shera Shiplap Modern Stagger MS200 · MS150 · DeLine DL00–DL02, 10 mm)', src: 'Value to be confirmed with the manufacturer' },
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
