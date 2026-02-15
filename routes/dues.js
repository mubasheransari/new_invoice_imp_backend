const express = require('express');
const multer = require('multer');
const { parseExcel } = require('../db/excel');
const { loadAll, upsertMany, upsertOne, saveAll } = require('../db/store');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Search by plotNo (house name) ?plot= or ?house=
router.get('/', (req, res) => {
  const q = (req.query.plot || req.query.house || '').toString().trim().toLowerCase();
  const rows = loadAll();

  if (!q) {
    // return last 200
    return res.json(rows.slice(-200).reverse());
  }

  const filtered = rows.filter(r =>
    (r.plotNo || '').toString().toLowerCase().includes(q)
  );

  return res.json(filtered);
});


// Add / Update single house record (upsert by plotNo)
router.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const plotNo = (body.plotNo || body.house || '').toString().trim();
    if (!plotNo) return res.status(400).json({ message: 'plotNo is required' });

    const totalDues = Number(String(body.totalDues ?? body.total ?? 0).replace(/,/g, '')) || 0;
    const amountPaid = Number(String(body.amountPaid ?? body.paid ?? 0).replace(/,/g, '')) || 0;
    const remaining = Math.max(totalDues - amountPaid, 0);

    const row = {
      plotNo,
      ownerName: (body.ownerName || body.owner || '').toString().trim(),
      duesStatus: (body.duesStatus || body.status || '').toString().trim(),
      totalDues,
      amountPaid,
      remaining,
      poNo: (body.poNo || '').toString().trim(),
      poDate: body.poDate ? new Date(body.poDate).toISOString() : null,
      address: (body.address || '').toString().trim(),
      contact: (body.contact || '').toString().trim(),
    };

    const result = upsertOne(row);
    return res.json({ message: 'Saved', ...result });
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Failed to save' });
  }
});

// Delete by plotNo
router.delete('/:plotNo', (req, res) => {
  const plotNo = (req.params.plotNo || '').toString().trim().toLowerCase();
  if (!plotNo) return res.status(400).json({ message: 'plotNo is required' });

  const rows = loadAll();
  const before = rows.length;
  const next = rows.filter(r => (r.plotNo || '').toString().trim().toLowerCase() !== plotNo);
  if (next.length === before) return res.status(404).json({ message: 'Not found' });

  saveAll(next);
  return res.json({ message: 'Deleted', total: next.length });
});

// Upload excel and upsert by plotNo
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Excel file is required (field name: file).' });

  try {
    const parsed = parseExcel(req.file.buffer);
    const result = upsertMany(parsed);
    return res.json({
      message: 'Upload successful',
      ...result
    });
  } catch (e) {
    return res.status(400).json({ message: e.message || 'Failed to parse Excel' });
  }
});

module.exports = router;
