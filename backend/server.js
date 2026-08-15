require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { router } = require('./routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'arynox-hotel-backend', time: new Date().toISOString() }));
app.get('/', (req, res) => {
  const { useTurso } = require('./db');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Arynox_Hotel_ERP - Backend</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#141a2e;color:#e5e9f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1e2746;border-radius:16px;padding:36px 44px;max-width:560px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}
h1{margin:0 0 6px;color:#fff}code{background:#0f1430;padding:2px 8px;border-radius:6px;color:#93c5fd}
.btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;margin-top:18px;font-weight:600}
.muted{color:#8b93ad;font-size:13px}ul{text-align:left;color:#b9c1d8;font-size:13px;line-height:1.8}</style></head><body>
<div class="card">
  <div style="font-size:42px">🏨</div>
  <h1>Arynox_Hotel_ERP — API</h1>
  <p class="muted">Hotel + Restaurant + POS + AI backend. This is the API server (Render).</p>
  <p class="muted">Database: <b>${useTurso ? 'Turso (online)' : 'Local file (offline)'}</b> · Status: <b style="color:#4ade80">● Running</b></p>
  <a class="btn" href="https://arynox-hotel-erp.vercel.app" target="_blank">Open the Web App →</a>
  <ul style="margin-top:20px">
    <li>Health: <code>/api/health</code></li>
    <li>Login: <code>POST /api/auth/login</code> (admin / admin123)</li>
    <li>Full API: rooms, bookings, guests, menu, orders, POS bills, reports, receipts (ESC/POS), AI chat</li>
  </ul>
</div></body></html>`);
});
app.use('/api', router);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] Arynox_Hotel_ERP backend running on http://localhost:${PORT}`));