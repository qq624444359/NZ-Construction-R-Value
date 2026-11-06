/* MCP server (Streamable HTTP, stateless, JSON responses): POST https://rvalue.ezbuild.co.nz/api/mcp
   The tools run the calculator's own model, so an AI assistant or a Revit add-in gets the same numbers as the website. */
'use strict';
const { send, readBody, E } = require('./_http');
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const EL = { type: 'string', enum: ['wall', 'roof', 'floor'], description: 'Building element.' };
const TOOLS = [
  {
    name: 'list_construction_types',
    title: 'List construction types',
    description: 'Every wall, roof and floor construction type the calculator models (timber frame, block wall, truss roof, skillion roof, suspended timber floor, slab-on-ground …) with the options each takes. Start here.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => ({ types: E.types() })
  },
  {
    name: 'describe_construction',
    title: 'Describe a construction type',
    description: 'The layers of one construction type, outside to inside, with the default of each and what it accepts: material choices (id, name, R), framing (depth, width, centres, insulation R and thickness), insulation layers, or the slab-on-ground inputs. Call this before calculate_construction to know the layer ids and material ids.',
    inputSchema: {
      type: 'object', required: ['element'],
      properties: {
        element: EL,
        kind: { type: 'string', description: 'Construction type id from list_construction_types, e.g. frame, block, truss, skillion, susp, slab. Defaults to the first type.' },
        options: { type: 'object', additionalProperties: { type: 'boolean' }, description: 'Options of the type to switch on or off, e.g. {"cav": true, "strap": false}.' }
      }
    },
    run: a => E.describe(a)
  },
  {
    name: 'calculate_construction',
    title: 'Calculate a construction R-value',
    description: 'The construction R-value (m²K/W) of one wall, roof or floor to H1/AS1 6th edition: NZS 4214 isothermal planes as modified by 2.1.3.2, wall framing fraction 38% unless stated, slab-on-ground by Appendix E. Give only the layers you want to change from the defaults; describe_construction lists them. Returns the R-value, each layer and each bridged path.',
    inputSchema: {
      type: 'object', required: ['element'],
      properties: {
        element: EL,
        kind: { type: 'string', description: 'Construction type id, e.g. frame, block, truss, susp, slab, custom.' },
        options: { type: 'object', additionalProperties: { type: 'boolean' } },
        name: { type: 'string', description: 'Your name for this construction, e.g. "W1 – Brick veneer".' },
        layers: {
          type: 'object',
          description: 'Layer id → value. Material layer: a choice id or name (e.g. "plasterboard-10-mm"), or {"r": 0.05}. Framing layer: {"depth_mm":90,"width_mm":45,"centres_mm":600,"insulation_r":2.8,"insulation_mm":90}; truss roofs also take "covers_chords". Insulation layer: {"r":3.6,"mm":180}, or null to leave it out.',
          additionalProperties: true
        },
        slab: {
          type: 'object', description: 'Slab-on-ground floors (kind "slab") only.',
          properties: {
            area_m2: { type: 'number' }, perimeter_m: { type: 'number' },
            floor: { type: 'string', enum: ['slab', 'raft'] }, edge_insulation: { type: 'string', enum: ['none', 'r10'] },
            underslab: { type: 'string', enum: ['none', 's12', 's24', 'f12', 'f24'], description: 'none, strip R1.2 / R2.4, full R1.2 / R2.4' },
            wall: { type: 'string', enum: ['other', 'masonry'], description: 'masonry = brick or block veneer over the slab edge' },
            dimensions: { type: 'string', enum: ['external', 'internal'] }, wall_thickness_mm: { type: 'number' },
            parts: { type: 'array', items: { type: 'object', properties: { length_m: { type: 'number' }, edge_insulation: { type: 'string', enum: ['none', 'r10'] }, wall: { type: 'string', enum: ['other', 'masonry'] }, name: { type: 'string' } } }, description: 'Parts of the perimeter with their own wall or edge insulation, e.g. the length under brick veneer.' },
            vm1_r: { type: 'number', description: 'An R-value calculated to H1/VM1 Appendix E, used instead of the tables.' }
          },
          required: ['area_m2', 'perimeter_m']
        },
        r_value: { type: 'number', description: 'Types "custom" and "exist" only: the R-value itself.' },
        construction: { type: 'object', description: 'A construction exactly as the website saves it in a project file — instead of the fields above.' }
      }
    },
    run: a => { const r = E.construction(a); delete r.construction; return r; }
  },
  {
    name: 'check_h1',
    title: 'Check H1 (Calculation Method)',
    description: 'PASS / FAIL for a house by the H1/AS1 6th edition Calculation Method, worked the way the BRANZ H1/AS1 calculation tool works it: proposed heat loss Σ area ÷ R against the Table 2.1.2.7 reference building, plus the 2.1.2.11 minimum R-values (Table 2.1.2.12 for heated elements) and the 40% glazing limit. Areas are finished internal-face areas (2.1.2.10). The BRANZ tool’s own result is the one for the building consent.',
    inputSchema: {
      type: 'object', required: ['climate_zone', 'elements'],
      properties: {
        climate_zone: { type: 'integer', minimum: 1, maximum: 6, description: 'H1/AS1 climate zone (Appendix C). Auckland and Northland are zone 1.' },
        elements: {
          type: 'array', minItems: 1,
          items: {
            type: 'object', required: ['type', 'area_m2', 'r_value'],
            properties: {
              type: { type: 'string', enum: ['roof', 'wall', 'slab', 'floor', 'skylight', 'glazing', 'door'], description: 'floor = suspended / other floors; glazing = windows and glazed doors; door = opaque doors' },
              area_m2: { type: 'number' }, r_value: { type: 'number' }, name: { type: 'string' },
              heated: { type: 'boolean', description: 'An element with heating in it (Table 2.1.2.12).' },
              ceiling_perimeter: { type: 'boolean', description: 'Roof only: the ceiling perimeter strip (2.1.2.9).' }
            }
          }
        }
      }
    },
    run: a => E.h1Check(a)
  }
];
TOOLS.forEach(t => { t.annotations = { readOnlyHint: true, openWorldHint: false }; });

const INSTRUCTIONS = 'New Zealand H1/AS1 6th edition (climate zones 1–6) construction R-values and the Calculation Method check. ' +
  'Typical flow: list_construction_types → describe_construction → calculate_construction for each wall, roof and floor → check_h1 with every element’s area and R-value. ' +
  'Results come from the same model as https://rvalue.ezbuild.co.nz; material and air-gap values are provisional defaults to confirm against NZS 4214 and the manufacturer before a figure goes into a consent.';

function handle(msg) {
  const { id, method, params } = msg || {};
  const ok = result => ({ jsonrpc: '2.0', id, result }), err = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return err(-32600, 'Invalid request');
  if (id === undefined) return null;                          /* a notification: nothing to answer */
  if (method === 'initialize') {
    const v = params && params.protocolVersion;
    return ok({ protocolVersion: PROTOCOLS.includes(v) ? v : PROTOCOLS[0], capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'ezbuild-rvalue', title: 'EZbuild Construction R-value (NZ H1)', version: E.VERSION }, instructions: INSTRUCTIONS });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS.map(({ run, ...t }) => t) });
  if (method === 'tools/call') {
    const t = TOOLS.find(x => x.name === (params && params.name));
    if (!t) return err(-32602, 'Unknown tool: ' + (params && params.name));
    try {
      const out = t.run((params && params.arguments) || {});
      return ok({ content: [{ type: 'text', text: JSON.stringify(out, null, 1) }], structuredContent: out, isError: false });
    } catch (e) {
      if (!(e instanceof E.InputError)) console.error(e);
      return ok({ content: [{ type: 'text', text: e instanceof E.InputError ? e.message : 'Calculation failed: ' + e.message }], isError: true });
    }
  }
  return err(-32601, 'Method not found: ' + method);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.method === 'GET') return send(res, 405, { error: 'This MCP server answers POST requests only (Streamable HTTP, no event stream).' });
  if (req.method === 'DELETE') return send(res, 405, { error: 'Stateless server: there is no session to end.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  if (Array.isArray(body)) { const out = body.map(handle).filter(Boolean); return out.length ? send(res, 200, out) : send(res, 202, {}); }
  const out = handle(body);
  if (!out) { res.statusCode = 202; res.setHeader('Access-Control-Allow-Origin', '*'); return res.end(); }
  send(res, 200, out);
};
