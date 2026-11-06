const { endpoint, E } = require('../_http');
/* GET ?element=&kind=&options=cav,strap  or  POST {element, kind, options:{cav:true}} */
module.exports = endpoint(['GET', 'POST'], q => {
  let o = q.options;
  if (typeof o === 'string') o = Object.fromEntries(o.split(',').filter(Boolean).map(x => x.startsWith('-') ? [x.slice(1), false] : [x, true]));
  return E.describe({ element: q.element, kind: q.kind, options: o });
});
