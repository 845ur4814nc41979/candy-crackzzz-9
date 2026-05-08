#!/usr/bin/env node
/*
 * Candy CrackZZZ Replit preview proxy
 *
 * Replit's preview expects port 5000 to open quickly. The real Vite dev
 * server runs on 5001 so this proxy can bind 5000 immediately, keep the
 * preview from showing a raw 502, and forward HTTP/WebSocket traffic to Vite
 * as soon as it is ready.
 */
const http = require('http');
const net = require('net');

const LISTEN_HOST = process.env.PREVIEW_PROXY_HOST || '0.0.0.0';
const LISTEN_PORT = Number(process.env.PREVIEW_PROXY_PORT || 5000);
const TARGET_HOST = process.env.VITE_TARGET_HOST || '127.0.0.1';
const TARGET_PORT = Number(process.env.VITE_TARGET_PORT || process.env.FRONTEND_TARGET_PORT || 5001);

const loadingHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="2" />
  <title>Candy CrackZZZ is starting</title>
  <style>
    body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#120617;color:white;font-family:Inter,system-ui,sans-serif}
    .card{max-width:440px;margin:20px;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(255,255,255,.07);box-shadow:0 20px 80px rgba(0,0,0,.35);text-align:center}
    h1{margin:0 0 8px;font-size:28px;letter-spacing:.04em;text-transform:uppercase}
    p{margin:0;color:rgba(255,255,255,.74);line-height:1.5;font-weight:700}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff4fd8;margin:18px 4px 0;animation:pulse 1s infinite alternate}
    .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
    @keyframes pulse{from{opacity:.35;transform:translateY(0)}to{opacity:1;transform:translateY(-5px)}}
  </style>
</head>
<body>
  <main class="card">
    <h1>Candy CrackZZZ</h1>
    <p>The app is starting. This page refreshes automatically so the preview does not get stuck on a white screen.</p>
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
  </main>
</body>
</html>`;

function proxyHttp(req, res) {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  };

  const upstream = http.request(options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on('error', () => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(loadingHtml);
  });

  req.pipe(upstream);
}

const server = http.createServer(proxyHttp);

server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(TARGET_PORT, TARGET_HOST, () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (const [key, value] of Object.entries(req.headers)) {
      upstream.write(`${key}: ${value}\r\n`);
    }
    upstream.write('\r\n');
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[preview-proxy] listening on ${LISTEN_HOST}:${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);
});
