/* Loads the calculator's own model files (the ones the website runs) into a sandbox for the tests. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite, parseFloat, parseInt, Map, Set };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['products.js', 'h1-data.js', 'slab-appendix-e.js', 'rvalue-model.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
vm.runInContext('globalThis.__M={calc,tpl,newC,strategy,geom,toSheet,D,slabLookup:typeof slabLookup==="function"?slabLookup:null}', ctx);
module.exports = ctx.__M;
