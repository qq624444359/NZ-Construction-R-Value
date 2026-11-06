const { endpoint, E } = require('../_http');
module.exports = endpoint(['POST'], b => E.h1Check(b));
