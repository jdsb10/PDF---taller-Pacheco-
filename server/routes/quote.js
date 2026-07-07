const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const router = express.Router();

const BUSINESS = {
  tipo: 'Persona Natural Responsable de IVA',
  nit: 'NIT: 1047339039-5',
  direccion: 'Dirección: Calle 12 #12-87, Santo Tomás, Atlántico',
  whatsapp: 'WhatsApp: 300 537 2972',
  correo: 'Correo: Janhcarlos89@gmail.com',
};

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const YELLOW = '#f2c200';
const GRAY = '#d9d9d9';

function money(n) {
  const value = Number(n) || 0;
  return '$ ' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function formatFecha(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function decodeSignature(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch (err) {
    return null;
  }
}

function drawRow(doc, x, y, height, cells) {
  let cx = x;
  cells.forEach((cell) => {
    if (cell.fill) {
      doc.save();
      doc.fillColor(cell.fill);
      doc.rect(cx, y, cell.width, height).fill();
      doc.restore();
    }
    doc.strokeColor('#000').lineWidth(0.75).rect(cx, y, cell.width, height).stroke();
    doc
      .fillColor('#000')
      .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(cell.fontSize || 9)
      .text(cell.text || '', cx + 5, y + 6, {
        width: cell.width - 10,
        align: cell.align || 'left',
      });
    cx += cell.width;
  });
}

router.post('/generate-pdf', (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const descuentos = Number(body.descuentos) || 0;

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const iva = subtotal * 0.19;
  const totalPagar = subtotal + iva - descuentos;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  const safeNumber = (body.cotizacionNo || 'sin-numero').toString().replace(/[^a-zA-Z0-9-_]/g, '');
  res.setHeader('Content-Disposition', `attachment; filename="cotizacion-${safeNumber}.pdf"`);
  doc.pipe(res);

  const marginX = 40;
  const pageWidth = doc.page.width - marginX * 2;
  const pageBottom = doc.page.height - 60;
  let y = 40;

  // ----- Encabezado -----
  const leftColWidth = 300;
  const rightColX = marginX + leftColWidth + 20;
  const rightColWidth = pageWidth - leftColWidth - 20;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, marginX, y, { fit: [180, 70] });
  } else {
    doc.save();
    doc.fillColor(YELLOW).rect(marginX, y, 230, 45).fill();
    doc.restore();
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(20).text('TALLER PACHECO', marginX + 10, y + 13);
  }

  const infoY = y + 82;
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text(BUSINESS.tipo, marginX, infoY, { width: leftColWidth });
  doc.font('Helvetica').fontSize(9.5);
  doc.text(BUSINESS.nit, marginX, doc.y + 2, { width: leftColWidth });
  doc.text(BUSINESS.direccion, marginX, doc.y + 2, { width: leftColWidth });
  doc.text(BUSINESS.whatsapp, marginX, doc.y + 2, { width: leftColWidth });
  doc.text(BUSINESS.correo, marginX, doc.y + 2, { width: leftColWidth });
  const infoBottom = doc.y;

  doc.save();
  doc.fillColor(YELLOW).rect(rightColX, y, rightColWidth, 28).fill();
  doc.restore();
  doc
    .fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(17)
    .text('COTIZACIÓN', rightColX, y + 6, { width: rightColWidth, align: 'center' });

  let ry = y + 38;
  const rightLine = (label, value, extraGapBefore) => {
    if (extraGapBefore) ry += 8;
    doc.font('Helvetica-Bold').fontSize(10).text(label + ' ', rightColX, ry, { continued: true });
    doc.font('Helvetica').text(value || '');
    ry = doc.y + 4;
  };
  const vehiculo = [body.vehiculoMarca, body.vehiculoAnio].filter(Boolean).join(' ');

  rightLine('COTIZACIÓN No:', body.cotizacionNo);
  rightLine('FECHA:', formatFecha(body.fecha));
  rightLine('CLIENTE:', body.cliente);
  if (vehiculo) rightLine('VEHÍCULO:', vehiculo);
  if (body.placa) rightLine('PLACA:', body.placa);
  rightLine('VIGENCIA DE LA OFERTA:', formatFecha(body.vigencia), true);

  y = Math.max(infoBottom, ry) + 20;

  // ----- Tabla -----
  const colWidths = [
    pageWidth * 0.28,
    pageWidth * 0.28,
    pageWidth * 0.16,
    pageWidth * 0.14,
    0,
  ];
  colWidths[4] = pageWidth - colWidths[0] - colWidths[1] - colWidths[2] - colWidths[3];

  const headerHeight = 34;
  drawRow(doc, marginX, y, headerHeight, [
    { text: 'DESCRIPCIÓN DE TRABAJO/MANO DE OBRA', width: colWidths[0], bold: true, align: 'center', fill: GRAY },
    { text: 'MATERIALES/REPUESTOS (Si aplica)', width: colWidths[1], bold: true, align: 'center', fill: GRAY },
    { text: 'TIEMPO ESTIMADO (Días/Horas)', width: colWidths[2], bold: true, align: 'center', fill: GRAY },
    { text: 'VALOR ESTIMADO', width: colWidths[3], bold: true, align: 'center', fill: GRAY },
    { text: 'TOTAL', width: colWidths[4], bold: true, align: 'center', fill: GRAY },
  ]);
  y += headerHeight;

  const itemRowHeight = 28;
  const rows = items.length > 0 ? items : [{}, {}, {}];
  rows.forEach((item) => {
    if (y + itemRowHeight > pageBottom) {
      doc.addPage();
      y = 40;
    }
    drawRow(doc, marginX, y, itemRowHeight, [
      { text: item.descripcion || '', width: colWidths[0] },
      { text: item.materiales || '', width: colWidths[1] },
      { text: item.tiempo || '', width: colWidths[2], align: 'center' },
      { text: item.valor ? money(item.valor) : '', width: colWidths[3], align: 'right' },
      { text: item.total ? money(item.total) : '', width: colWidths[4], align: 'right' },
    ]);
    y += itemRowHeight;
  });

  // ----- Totales (bajo las columnas Valor Estimado / Total) -----
  const totalsX = marginX + colWidths[0] + colWidths[1] + colWidths[2];
  const totalsLabelWidth = colWidths[3];
  const totalsValueWidth = colWidths[4];
  const totalsRowHeight = 24;

  const totalsRows = [
    { label: 'SUBTOTAL', value: money(subtotal), height: totalsRowHeight },
    { label: 'IVA (19%)', value: money(iva), height: totalsRowHeight },
    { label: 'TOTAL ESTIMADO A PAGAR', value: money(totalPagar), fill: GRAY, bold: true, height: 34 },
    { label: 'DESCUENTOS', value: money(descuentos), height: totalsRowHeight },
  ];

  totalsRows.forEach((row) => {
    if (y + row.height > pageBottom) {
      doc.addPage();
      y = 40;
    }
    drawRow(doc, totalsX, y, row.height, [
      { text: row.label, width: totalsLabelWidth, bold: true, fill: row.fill, fontSize: 8 },
      { text: row.value, width: totalsValueWidth, align: 'right', fill: row.fill },
    ]);
    y += row.height;
  });

  y += 25;

  // ----- Notas y términos -----
  if (y + 80 > pageBottom) {
    doc.addPage();
    y = 40;
  }
  doc.font('Helvetica-Bold').fontSize(11).text('NOTAS Y TÉRMINOS:', marginX, y, { width: pageWidth });
  y = doc.y + 4;
  const notas =
    body.notas ||
    'Términos de Pago: Validez de la Cotización:\nLos repuestos adicionales no cotizados se facturarán por separado.\nSe requiere una aprobación por escrito para iniciar el trabajo.';
  doc.font('Helvetica').fontSize(9.5).text(notas, marginX, y, { width: pageWidth });
  y = doc.y + 50;

  // ----- Firmas -----
  if (y + 40 > pageBottom) {
    doc.addPage();
    y = 40;
  }
  const sigWidth = pageWidth / 2 - 20;
  const clienteSignature = decodeSignature(body.firmaCliente);
  const tallerSignature = decodeSignature(body.firmaTaller);
  if (clienteSignature) {
    doc.image(clienteSignature, marginX, y - 48, { fit: [sigWidth, 44] });
  }
  if (tallerSignature) {
    doc.image(tallerSignature, marginX + pageWidth - sigWidth, y - 48, { fit: [sigWidth, 44] });
  }
  doc.moveTo(marginX, y).lineTo(marginX + sigWidth, y).stroke();
  doc.moveTo(marginX + pageWidth - sigWidth, y).lineTo(marginX + pageWidth, y).stroke();
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .text('Aceptación del Cliente (Firma)', marginX, y + 6, { width: sigWidth, align: 'center' });
  doc
    .text('Firma de Taller Pacheco', marginX + pageWidth - sigWidth, y + 6, { width: sigWidth, align: 'center' });

  doc.end();
});

module.exports = router;
