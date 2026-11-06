/* shared request handling for the API endpoints: CORS, JSON in and out, input errors as 400 */
'use strict';
const E = require('./_engine');
const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.end(code === 204 ? '' : JSON.stringify(body, null, 1));
};
async function readBody(req) {
  if (req.body !== undefined && typeof req.body !== 'string') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) { for await (const ch of req) raw += ch; }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { throw new E.InputError('The request body is not valid JSON.'); }
}
/* an endpoint: fn(input, req) → result. GET reads the query string, POST the JSON body */
const endpoint = (methods, fn) => async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  if (!methods.includes(req.method)) return send(res, 405, { error: 'Use ' + methods.join(' or ') + '.' });
  try {
    const url = new URL(req.url, 'http://x'), q = Object.fromEntries(url.searchParams);
    const input = req.method === 'GET' ? q : await readBody(req);
    send(res, 200, await fn(input, req));
  } catch (e) {
    if (e instanceof E.InputError) return send(res, 400, { error: e.message });
    console.error(e); send(res, 500, { error: 'Calculation failed: ' + e.message });
  }
};
module.exports = { send, readBody, endpoint, E };
