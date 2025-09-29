const http = require('http');
const url = require('url');

// Very simple SVG generator: from text prompt produce SVG with styled text
// POST /generate { prompt: string, width?: number, height?: number }

const PORT = 4000;

function makeSvg({ prompt, width = 512, height = 512 }) {
  const escaped = String(prompt || '').replace(/[<>&]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100%" height="100%" fill="url(#g)"/>
  <g>
    <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width,height)/3}" fill="rgba(255,255,255,0.25)" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(16, Math.min(48, Math.floor(width/12)))}" fill="#0f172a">
      ${escaped}
    </text>
  </g>
</svg>`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (req.method === 'POST' && parsed.pathname === '/generate') {
    try {
      const body = await readJson(req);
      const svg = makeSvg({ prompt: body.prompt, width: body.width, height: body.height });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
      res.end(svg);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request', message: String(e?.message || e) }));
    }
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => console.log(`[svggen] listening on ${PORT}`));
