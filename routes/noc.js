const express = require('express');
const { loadAll } = require('../db/store');

const router = express.Router();

/**
 * Generate NOC data by plotNo.
 * NOC can be issued only if remaining <= 0 (fully paid).
 * GET /api/noc?plot=ABC-12
 */
router.get('/', (req, res) => {
  const q = (req.query.plot || req.query.house || req.query.plotNo || '').toString().trim().toLowerCase();
  if (!q) return res.status(400).json({ message: 'plot (Plot No.) is required' });

  const rows = loadAll();
  const exact = rows.find(r => (r.plotNo || '').toString().trim().toLowerCase() === q);
  const row = exact || rows.find(r => (r.plotNo || '').toString().trim().toLowerCase().includes(q));

  if (!row) return res.status(404).json({ message: 'No record found' });

  const totalDues = Number(row.totalDues || 0);
  const amountPaid = Number(row.amountPaid || 0);
  const remaining = Math.max(totalDues - amountPaid, 0);

  const canIssue = remaining <= 0;

  return res.json({
    plotNo: row.plotNo,
    ownerName: row.ownerName || '',
    address: row.address || '',
    contact: row.contact || '',
    totalDues,
    amountPaid,
    remaining,
    duesStatus: row.duesStatus || '',
    poNo: row.poNo || '',
    poDate: row.poDate || null,
    canIssue,
    issuedAt: new Date().toISOString(),
  });
});

module.exports = router;
