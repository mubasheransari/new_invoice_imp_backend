const XLSX = require('xlsx');

/**
 * Try to detect header row and normalize columns.
 * Expected headers include: Plot No., Owner Name, Total Dues, Amount Paid, Balance, Dues Status, P/O No., PO R Date
 */
function parseExcel(bufferOrPath) {
  const wb = Buffer.isBuffer(bufferOrPath)
    ? XLSX.read(bufferOrPath, { type: 'buffer' })
    : XLSX.readFile(bufferOrPath);

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Get as array-of-arrays
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

  // Find header row index
  const headerIdx = rows.findIndex(r =>
    r.some(c => String(c).toLowerCase().includes('plot') && String(c).toLowerCase().includes('no'))
  );
  if (headerIdx === -1) {
    throw new Error('Could not find "Plot No." header row in Excel.');
  }

  const header = rows[headerIdx].map(h => String(h).trim());
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));

  // Build index map
  const findCol = (names) => {
    const lowered = header.map(h => h.toLowerCase());
    for (const n of names) {
      const i = lowered.findIndex(h => h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const colPlot = findCol(['plot no', 'plot']);
  const colOwner = findCol(['owner name', 'owner']);
  const colStatus = findCol(['dues status', 'status']);
  const colTotal = findCol(['total dues', 'dues rs']);
  const colPaid  = findCol(['amount paid', 'paid']);
  const colBal   = findCol(['balance']);
  const colPoNo  = findCol(['p/o no', 'po no']);
  const colPoDate= findCol(['po r date', 'date']);

  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/,/g, '').trim();
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const toDateIso = (v) => {
    // Excel date can be number
    if (typeof v === 'number') {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      const js = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0));
      return js.toISOString();
    }
    const s = String(v).trim();
    if (!s) return null;
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  const out = [];
  for (const r of dataRows) {
    const plotNo = colPlot >= 0 ? String(r[colPlot]).trim() : '';
    if (!plotNo) continue;

    const totalDues = colTotal >= 0 ? toNum(r[colTotal]) : 0;
    const amountPaid = colPaid >= 0 ? toNum(r[colPaid]) : 0;
    const remaining = Math.max(totalDues - amountPaid, 0);

    out.push({
      plotNo,
      ownerName: colOwner >= 0 ? String(r[colOwner]).trim() : '',
      duesStatus: colStatus >= 0 ? String(r[colStatus]).trim() : '',
      totalDues,
      amountPaid,
      remaining,
      balanceRaw: colBal >= 0 ? String(r[colBal]).trim() : '',
      poNo: colPoNo >= 0 ? String(r[colPoNo]).trim() : '',
      poDate: colPoDate >= 0 ? toDateIso(r[colPoDate]) : null,
    });
  }

  return out;
}

module.exports = { parseExcel };
