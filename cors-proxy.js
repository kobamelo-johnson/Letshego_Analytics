/**
 * Letshego KYC – Local CORS Proxy Server
 * ─────────────────────────────────────────
 * Run:   node cors-proxy.js
 * 
 * This creates a tiny local server on port 8010 that relays requests
 * to external URLs (like AWS S3) and adds CORS headers so the browser
 * allows the response to be read by JavaScript.
 *
 * Why: The KYC documents are stored on an S3 bucket that does not send
 * Access-Control-Allow-Origin headers. Browsers block JavaScript from
 * reading these responses (CORS policy). This proxy fetches the file
 * server-side (where CORS doesn't apply) and returns it with the
 * correct CORS headers.
 *
 * Zero dependencies – uses only Node.js built-ins.
 */

const http  = require('http');
const https = require('https');
const urlMod = require('url');

const PORT = 8010;

const server = http.createServer((req, res) => {
    // ── CORS headers on every response ──────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ── Parse the target URL from ?url= parameter ───────────────────────
    const parsed = urlMod.parse(req.url, true);
    const targetUrl = parsed.query.url;

    if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing ?url= query parameter');
        return;
    }

    // Validate URL
    let parsedTarget;
    try {
        parsedTarget = new URL(targetUrl);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid URL: ' + targetUrl);
        return;
    }

    // Only allow HTTPS targets
    if (parsedTarget.protocol !== 'https:') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Only HTTPS URLs are supported');
        return;
    }

    // ── Proxy the request ───────────────────────────────────────────────
    const proxyReq = https.get(targetUrl, {
        headers: {
            // Mimic a browser User-Agent so S3 doesn't reject us
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }, (proxyRes) => {
        // Forward status code and relevant headers
        const fwdHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream'
        };
        if (proxyRes.headers['content-length']) {
            fwdHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }
        if (proxyRes.headers['content-disposition']) {
            fwdHeaders['Content-Disposition'] = proxyRes.headers['content-disposition'];
        }

        res.writeHead(proxyRes.statusCode, fwdHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error(`[PROXY ERROR] ${targetUrl} → ${err.message}`);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        }
        res.end('Proxy error: ' + err.message);
    });

    // Timeout after 30 seconds
    proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'text/plain' });
        }
        res.end('Proxy timeout');
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║   Letshego KYC – CORS Proxy Server              ║');
    console.log(`  ║   Running on http://localhost:${PORT}              ║`);
    console.log('  ║   Press Ctrl+C to stop                          ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('  Keep this terminal open while using Download All.');
    console.log('');
});
