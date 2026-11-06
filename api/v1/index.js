const { endpoint, E } = require('../_http');
module.exports = endpoint(['GET'], () => ({
  name: 'EZbuild Construction R-value API', version: E.VERSION,
  docs: 'https://rvalue.ezbuild.co.nz/api.html',
  endpoints: {
    'GET /api/v1/types': 'construction types for walls, roofs and floors, with their options',
    'GET /api/v1/describe?element=wall&kind=frame&options=cav': 'the layers of one type and what each accepts',
    'POST /api/v1/construction': 'the R-value of one construction, layer by layer',
    'POST /api/v1/h1-check': 'H1/AS1 Calculation Method PASS / FAIL from areas and R-values',
    'POST /api/mcp': 'the same tools as an MCP server (Streamable HTTP)'
  }
}));
