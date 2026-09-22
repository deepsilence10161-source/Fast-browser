/**
 * FastBrowser Turbo Server & Web Proxy
 * Serves the exact Chrome UI and provides a high-speed reverse proxy
 * that strips tracking ads, removes frame restrictions, and injects the Anti-Lag engine.
 */

const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const zlib = require('zlib');
const adBlocker = require('./main/adblocker');
const HistoryManager = require('./main/history-manager');
const { LMARENA_ANTI_LAG_CSS, LMARENA_ANTI_LAG_JS } = require('./main/lmarena-turbo-engine');

const app = express();
const PORT = process.env.PORT || 3000;
const historyManager = new HistoryManager(path.join(__dirname, '../data/history.json'));

// 1. CORS & Frame Ancestors Middleware (MUST BE FIRST)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  res.removeHeader('X-Frame-Options');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'renderer')));

// --- API Endpoints for Chrome UI ---

// History APIs
app.get('/api/history', (req, res) => {
  const query = req.query.q || '';
  const list = historyManager.getHistory({ query });
  res.json({ success: true, history: list });
});

app.post('/api/history', (req, res) => {
  const { title, url, favicon } = req.body;
  const entry = historyManager.addEntry({ title, url, favicon });
  res.json({ success: true, entry });
});

app.delete('/api/history/:id', (req, res) => {
  const deleted = historyManager.deleteEntry(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/history/delete-selected', (req, res) => {
  const { ids } = req.body;
  const count = historyManager.deleteSelected(ids);
  res.json({ success: true, deletedCount: count });
});

app.post('/api/history/clear', (req, res) => {
  const { timeRange, clearHistory, clearCache, clearCookies } = req.body;
  const result = historyManager.clearBrowsingData({
    timeRange,
    clearHistory,
    clearCache,
    clearCookies
  });
  res.json(result);
});

// AdBlock APIs
app.get('/api/adblock/stats', (req, res) => {
  res.json(adBlocker.getStats());
});

app.post('/api/adblock/toggle', (req, res) => {
  const newState = adBlocker.toggle(req.body.enabled);
  res.json({ success: true, enabled: newState });
});

// Anti-Lag Script API
app.get('/api/anti-lag/script', (req, res) => {
  res.type('application/javascript').send(LMARENA_ANTI_LAG_JS);
});

// --- High-Speed Turbo Web Proxy ---
app.get('/proxy', (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  // Prepend https if user typed a bare domain (e.g. en.wikipedia.org)
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (err) {
    return res.status(400).send('Invalid URL format');
  }

  // Record visited history entry
  historyManager.addEntry({
    title: parsedTarget.hostname,
    url: targetUrl,
    favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${parsedTarget.hostname}`
  });

  // Check if target is blocked by AdBlocker
  if (adBlocker.isBlocked(targetUrl)) {
    return res.status(204).end();
  }

  const client = parsedTarget.protocol === 'https:' ? https : http;
  const requestOptions = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
    path: parsedTarget.pathname + parsedTarget.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    },
    timeout: 15000
  };

  const proxyReq = client.request(requestOptions, (proxyRes) => {
    // Strip headers that prevent embedding inside browser tab iframe
    const headers = { ...proxyRes.headers };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    delete headers['content-security-policy-report-only'];

    const contentType = headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');

    // Handle compressed response streams
    let decompressStream;
    const encoding = headers['content-encoding'];
    if (encoding === 'gzip') {
      decompressStream = zlib.createGunzip();
    } else if (encoding === 'deflate') {
      decompressStream = zlib.createInflate();
    } else if (encoding === 'br') {
      decompressStream = zlib.createBrotliDecompress();
    }

    if (isHtml) {
      // Modify HTML to inject base tag, Anti-Lag CSS & JS, and rewrite links
      delete headers['content-encoding'];
      delete headers['content-length'];
      headers['cache-control'] = 'no-cache';

      res.writeHead(proxyRes.statusCode, headers);

      let bodyChunks = [];
      const dataStream = decompressStream ? proxyRes.pipe(decompressStream) : proxyRes;

      dataStream.on('data', (chunk) => {
        bodyChunks.push(chunk);
      });

      dataStream.on('end', () => {
        try {
          let html = Buffer.concat(bodyChunks).toString('utf8');

          // Inject Base tag so relative links resolve correctly
          const baseTag = `<base href="${parsedTarget.origin}${parsedTarget.pathname}">`;
          
          // Inject LMArena Turbo Shield & Anti-Lag Engine
          const injection = `
            ${baseTag}
            <style>${LMARENA_ANTI_LAG_CSS}</style>
            <script>${LMARENA_ANTI_LAG_JS}</script>
          `;

          if (html.includes('<head>')) {
            html = html.replace('<head>', '<head>' + injection);
          } else {
            html = injection + html;
          }

          res.end(html);
        } catch (err) {
          res.end(Buffer.concat(bodyChunks));
        }
      });

      dataStream.on('error', (err) => {
        res.status(502).send('Proxy decoding error: ' + err.message);
      });
    } else {
      // Direct stream non-HTML files (images, css, scripts)
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).send('Request timed out connecting to destination.');
  });

  proxyReq.on('error', (err) => {
    res.status(502).send(`FastBrowser Turbo Proxy Error: ${err.message}`);
  });

  proxyReq.end();
});

// Interactive LMArena Lag-Fix Demo Benchmark Page
app.get('/demo/lmarena-benchmark', (req, res) => {
  res.sendFile(path.join(__dirname, 'renderer/lmarena-demo.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FastBrowser Server running on http://0.0.0.0:${PORT}`);
});
