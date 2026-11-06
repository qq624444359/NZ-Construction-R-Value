const { endpoint, E } = require('../_http');
module.exports = endpoint(['GET'], () => ({ types: E.types() }));
