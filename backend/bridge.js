// Local thermal printer bridge (runs on localhost:8765 alongside run.bat)
// Frontend sends ESC/POS bytes here, bridge pushes them to a network printer (ip:9100)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const net = require('net');
const http = require('http');

const PORT = 8765;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { ip, port = 9100, data } = JSON.parse(body);
        if (!ip || !data) return res.writeHead(400).end(JSON.stringify({ error: 'ip and data required' }));
        const sock = net.connect(port, ip, () => sock.write(Buffer.from(data, 'base64')));
        sock.on('error', (e) => res.writeHead(502).end(JSON.stringify({ error: e.message })));
        sock.on('close', () => res.end(JSON.stringify({ ok: true })));
        setTimeout(() => sock.destroy(), 10000);
      } catch (e) {
        res.writeHead(400).end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'arynox-printer-bridge' }));
  } else {
    res.writeHead(404).end(JSON.stringify({ error: 'use POST /print with {ip, port, data(base64)}' }));
  }
});

server.listen(PORT, () => console.log(`[bridge] Thermal printer bridge on http://localhost:${PORT} (network printer ip:9100)`));