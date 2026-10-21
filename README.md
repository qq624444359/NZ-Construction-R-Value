# Construction R-value Calculator

Construction R-values for New Zealand walls, roofs and floors, to **H1/AS1 6th edition** — NZS 4214 isothermal planes as modified by paragraph 2.1.3.2, and slab-on-ground R-values from H1/AS1 Appendix E.

**Use it:** https://qq624444359.github.io/NZ-Construction-R-Value/

- Build each construction layer by layer, outside to inside; framing layers are split into the path through the timber and the path beside it.
- Checks every construction against the 2.1.2.11 minimums and the Table 2.1.2.12 heated minimums.
- Section drawings for walls, truss and skillion roofs and suspended floors.
- Project page with envelope areas and the rows to paste into the BRANZ H1/AS1 calculation tool.
- Exports a PDF calculation report. Projects save to a file and stay in your browser — nothing is sent to a server.

## Request a feature or report a problem

- **GitHub:** [open an issue](https://github.com/qq624444359/NZ-Construction-R-Value/issues/new/choose) — there is a form for feature requests and one for wrong results.
- **No GitHub account?** Email [pitayadesign.ezbuild@gmail.com](mailto:pitayadesign.ezbuild@gmail.com?subject=Construction%20R-value%20calculator%20%E2%80%94%20feature%20request).

## Run it locally

It is a static site — no build step, no dependencies.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Code layout

| File | What it does |
|---|---|
| `index.html` | The page |
| `js/rvalue-model.js` | Materials, construction templates and the isothermal-planes calculation. No DOM — the numbers live here. |
| `js/slab-appendix-e.js` | H1/AS1 Appendix E slab-on-ground tables |
| `js/h1-data.js` | H1/AS1 minimums and reference-building data |
| `js/rvc-v6.js` | The calculator page: constructions, build-up, section, PDF |
| `js/rvc-project.js` | Project page, Windows & doors, BRANZ input |
| `js/*-section.js` | Section drawings (SVG) |
| `js/project-file.js`, `js/export-name.js` | Save / open project files, file names |

## Disclaimer

Material, air-gap and surface values are provisional defaults you can overwrite on every row. Confirm each against your own copy of NZS 4214 and the manufacturers' data before a figure goes into a building consent. The calculator does not decide compliance: the building consent authority does. Provided under the MIT License, without warranty.

NZS 4214 is published by Standards New Zealand; H1/AS1 and H1/VM1 by the Ministry of Business, Innovation and Employment. Product names (Pink® Batts®, GIB®, James Hardie and others) belong to their owners.
