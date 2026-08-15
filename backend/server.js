require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { router } = require('./routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api', router);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'arynox-hotel-backend', time: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] Arynox Hotel ERP backend running on http://localhost:${PORT}`));