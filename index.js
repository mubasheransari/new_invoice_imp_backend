require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const duesRoutes = require('./routes/dues');
const nocRoutes = require('./routes/noc');
const { parseExcel } = require('./db/excel');
const { upsertMany, loadAll } = require('./db/store');

const app = express();

app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/dues', duesRoutes);
app.use('/api/noc', nocRoutes);

// Seed once (optional): if db empty, seed from data/dues.xlsx
app.post('/api/dues/seed', (req, res) => {
  try {
    const rows = loadAll();
    if (rows.length > 0) return res.json({ message: 'Already seeded', total: rows.length });

    const seedPath = path.join(__dirname, 'data', 'dues.xlsx');
    const parsed = parseExcel(seedPath);
    const result = upsertMany(parsed);
    return res.json({ message: 'Seeded from data/dues.xlsx', ...result });
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Seed failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
