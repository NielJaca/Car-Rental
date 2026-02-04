const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Booking = require('../models/Booking');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

function asDate(input) {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toISODate(d) {
  const dd = new Date(d);
  return dd.toISOString().slice(0, 10);
}

function buildBookingsQuery({ from, to, status, carId }) {
  const q = {};
  if (status && status !== 'all') q.status = status;
  if (carId) q.carId = carId;

  // Overlap logic: booking overlaps [from,to] if startDate <= to AND endDate >= from
  if (from && to) {
    q.startDate = { $lte: to };
    q.endDate = { $gte: from };
  } else if (from) {
    q.endDate = { $gte: from };
  } else if (to) {
    q.startDate = { $lte: to };
  }
  return q;
}

router.get('/bookings', async (req, res) => {
  try {
    const { format = 'csv', from: fromStr, to: toStr, status = 'all', carId = '' } = req.query;
    const from = fromStr ? asDate(fromStr) : null;
    const to = toStr ? asDate(toStr) : null;
    if ((fromStr && !from) || (toStr && !to)) {
      return res.status(400).json({ error: 'Invalid from/to date. Use YYYY-MM-DD.' });
    }
    if (from && to && to < from) {
      return res.status(400).json({ error: '"To" date must be on or after "From" date.' });
    }

    // Normalize range to full days (UTC)
    if (from) from.setUTCHours(0, 0, 0, 0);
    if (to) to.setUTCHours(23, 59, 59, 999);

    const q = buildBookingsQuery({ from, to, status, carId: carId || null });
    const bookings = await Booking.find(q)
      .populate('carId', 'name pricePerDay')
      .sort({ startDate: 1 })
      .lean();

    const rows = bookings.map((b) => ({
      car: b.carId?.name ?? '',
      customerName: b.customerName ?? '',
      contact: b.contact ?? '',
      startDate: b.startDate ? toISODate(b.startDate) : '',
      endDate: b.endDate ? toISODate(b.endDate) : '',
      status: b.status ?? '',
      totalPrice: b.totalPrice ?? '',
      createdAt: b.createdAt ? toISODate(b.createdAt) : '',
    }));

    const baseName = `bookings_${from ? toISODate(from) : 'all'}_${to ? toISODate(to) : 'all'}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
      const header = ['Car', 'Customer', 'Contact', 'Start', 'End', 'Status', 'Total', 'Created'];
      const lines = [header.join(',')].concat(
        rows.map((r) => [
          csvEscape(r.car),
          csvEscape(r.customerName),
          csvEscape(r.contact),
          csvEscape(r.startDate),
          csvEscape(r.endDate),
          csvEscape(r.status),
          csvEscape(r.totalPrice),
          csvEscape(r.createdAt),
        ].join(','))
      );
      return res.send(lines.join('\n'));
    }

    if (format === 'xlsx' || format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Bookings');
      sheet.columns = [
        { header: 'Car', key: 'car', width: 24 },
        { header: 'Customer', key: 'customerName', width: 22 },
        { header: 'Contact', key: 'contact', width: 18 },
        { header: 'Start', key: 'startDate', width: 12 },
        { header: 'End', key: 'endDate', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Total', key: 'totalPrice', width: 12 },
        { header: 'Created', key: 'createdAt', width: 12 },
      ];
      rows.forEach((r) => sheet.addRow(r));
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: 'A1', to: 'H1' };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      doc.pipe(res);

      doc.fontSize(16).text('Bookings Report', { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(10).fillColor('#555').text(`Range: ${from ? toISODate(from) : 'All'} to ${to ? toISODate(to) : 'All'}   Status: ${status}`, { align: 'left' });
      doc.moveDown(0.75);
      doc.fillColor('#000');

      const cols = [
        { label: 'Car', w: 120 },
        { label: 'Customer', w: 110 },
        { label: 'Start', w: 60 },
        { label: 'End', w: 60 },
        { label: 'Status', w: 55 },
        { label: 'Total', w: 55 },
      ];

      const startX = doc.x;
      let y = doc.y;
      const rowH = 16;

      const drawHeader = () => {
        let x = startX;
        doc.fontSize(10).fillColor('#000');
        cols.forEach((c) => {
          doc.text(c.label, x, y, { width: c.w, ellipsis: true });
          x += c.w;
        });
        y += rowH;
        doc.moveTo(startX, y - 3).lineTo(startX + cols.reduce((a, c) => a + c.w, 0), y - 3).strokeColor('#ddd').stroke();
      };

      drawHeader();

      doc.fontSize(9).fillColor('#111');
      for (const r of rows) {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = doc.y;
          drawHeader();
        }
        let x = startX;
        const values = [r.car, r.customerName, r.startDate, r.endDate, r.status, r.totalPrice ? `₱${Number(r.totalPrice).toLocaleString()}` : ''];
        values.forEach((v, idx) => {
          doc.text(String(v ?? ''), x, y, { width: cols[idx].w, ellipsis: true });
          x += cols[idx].w;
        });
        y += rowH;
      }

      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or pdf.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

