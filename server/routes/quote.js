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
  const esFactura = body.tipoDocumento === 'factura';
  const tituloDocumento = esFactura ? 'FACTURA' : 'COTIZACIÓN';

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const iva = subtotal * 0.19;
  const totalPagar = subtotal + iva - descuentos;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  const safeNumber = (body.cotizacionNo || 'sin-numero').toString().replace(/[^a-zA-Z0-9-_]/g, '');
  const nombreArchivo = esFactura ? 'factura' : 'cotizacion';
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}-${safeNumber}.pdf"`);
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
    .text(tituloDocumento, rightColX, y + 6, { width: rightColWidth, align: 'center' });

  let ry = y + 38;
  const rightLine = (label, value, extraGapBefore) => {
    if (extraGapBefore) ry += 8;
    doc.font('Helvetica-Bold').fontSize(10).text(label + ' ', rightColX, ry, { continued: true });
    doc.font('Helvetica').text(value || '');
    ry = doc.y + 4;
  };
  const vehiculo = [body.vehiculoMarca, body.vehiculoAnio].filter(Boolean).join(' ');

  rightLine(`${tituloDocumento} No:`, body.cotizacionNo);
  rightLine('FECHA:', formatFecha(body.fecha));
  rightLine('CLIENTE:', body.cliente);
  if (vehiculo) rightLine('VEHÍCULO:', vehiculo);
  if (body.placa) rightLine('PLACA:', body.placa);
  rightLine(esFactura ? 'FECHA DE VENCIMIENTO:' : 'VIGENCIA DE LA OFERTA:', formatFecha(body.vigencia), true);

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
    `Términos de Pago: Validez de la ${esFactura ? 'Factura' : 'Cotización'}:\n` +
      `Los repuestos adicionales no ${esFactura ? 'facturados' : 'cotizados'} se facturarán por separado.\n` +
      'Se requiere una aprobación por escrito para iniciar el trabajo.';
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

// ===================== CARTA DIAGNÓSTICO =====================

function drawSectionHeader(doc, x, y, width, text) {
  const height = 22;
  doc.save();
  doc.fillColor(YELLOW);
  doc.roundedRect(x, y, width, height, 3).fill();
  doc.restore();
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text(text, x + 8, y + 6, { width: width - 16 });
  return y + height + 6;
}

function drawCheckboxLine(doc, x, y, text, checked, width) {
  const boxSize = 10;
  doc.save();
  if (checked) {
    doc.fillColor(YELLOW).rect(x, y, boxSize, boxSize).fill();
  }
  doc.strokeColor('#000').lineWidth(0.75).rect(x, y, boxSize, boxSize).stroke();
  if (checked) {
    // Marca en forma de "X" dibujada con lineas (no texto), para que quede
    // siempre dentro del cuadro sin importar la fuente.
    const pad = 2.5;
    doc.strokeColor('#000').lineWidth(1.1);
    doc.moveTo(x + pad, y + pad).lineTo(x + boxSize - pad, y + boxSize - pad).stroke();
    doc.moveTo(x + boxSize - pad, y + pad).lineTo(x + pad, y + boxSize - pad).stroke();
  }
  doc.fillColor('#000').font('Helvetica').fontSize(9)
    .text(text, x + boxSize + 6, y + 1, { width: width || 400 });
  doc.restore();
  return doc.y + 4;
}

router.post('/generate-diagnostic-pdf', (req, res) => {
  const b = req.body || {};
  const hallazgos = Array.isArray(b.hallazgos) ? b.hallazgos : [];
  const procedimientos = Array.isArray(b.procedimientos) ? b.procedimientos : [];

  const doc = new PDFDocument({ size: 'letter', margin: 45 });

  res.setHeader('Content-Type', 'application/pdf');
  const safeNumber = (b.numero || 'sin-numero').toString().replace(/[^a-zA-Z0-9-_]/g, '');
  res.setHeader('Content-Disposition', `attachment; filename="diagnostico-${safeNumber}.pdf"`);
  doc.pipe(res);

  const marginX = 45;
  const pageWidth = doc.page.width - marginX * 2;
  const pageBottom = doc.page.height - 50;
  let y = 40;

  // ----- Encabezado -----
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, marginX, y, { fit: [200, 75] });
    y += 80;
  } else {
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(22).text('TALLER PACHECO', marginX, y, { width: pageWidth, align: 'center' });
    y = doc.y + 4;
  }

  doc.fillColor('#000').font('Helvetica-Bold').fontSize(11)
    .text('DIAGNÓSTICO AUTOMOTRIZ Y SERVICIO TÉCNICO', marginX, y, { width: pageWidth, align: 'center' });
  y = doc.y + 2;
  doc.font('Helvetica-Oblique').fontSize(9)
    .text('"La fuerza para tu vehículo, la confianza para ti."', marginX, y, { width: pageWidth, align: 'center' });
  y = doc.y + 14;

  // ----- Datos generales -----
  const colW = pageWidth / 2;

  function drawFieldRow(label, value, cx, cy, cw) {
    doc.font('Helvetica-Bold').fontSize(9)
      .text(label + ': ' + (value || '___________________________'), cx, cy, { width: cw });
    return doc.y + 4;
  }

  let rowY = y;
  y = drawFieldRow('Fecha', b.fecha, marginX, rowY, colW);
  drawFieldRow('No. de diagnóstico', b.numero, marginX + colW, rowY, colW);
  y = Math.max(y, doc.y) + 4;

  rowY = y;
  y = drawFieldRow('Cliente', b.cliente, marginX, rowY, colW);
  drawFieldRow('Teléfono', b.telefono, marginX + colW, rowY, colW);
  y = Math.max(y, doc.y) + 4;

  rowY = y;
  y = drawFieldRow('Vehículo', b.vehiculo, marginX, rowY, colW);
  drawFieldRow('Placa', b.placa, marginX + colW, rowY, colW);
  y = Math.max(y, doc.y) + 4;

  rowY = y;
  y = drawFieldRow('Marca / Modelo / Año', b.marcaModeloAnio, marginX, rowY, colW);
  drawFieldRow('Kilometraje', b.kilometraje, marginX + colW, rowY, colW);
  y = Math.max(y, doc.y) + 8;

  // ----- 1. Motivo de ingreso -----
  if (y + 60 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '1. MOTIVO DE INGRESO / SÍNTOMA REPORTADO');
  doc.font('Helvetica').fontSize(8.5).fillColor('#555')
    .text('Describa de forma clara la falla o síntoma informado por el cliente:', marginX, y, { width: pageWidth });
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
    .text(b.motivo || '', marginX, y, { width: pageWidth });
  y = doc.y + 12;

  // ----- 2. Procedimiento de diagnóstico -----
  if (y + 80 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '2. PROCEDIMIENTO DE DIAGNÓSTICO REALIZADO');
  const procLabels = [
    'Inspección visual y revisión general',
    'Escaneo electrónico / lectura de códigos de falla',
    'Pruebas de sensores y actuadores',
    'Pruebas eléctricas: alimentación, tierras, continuidad y señales',
    'Pruebas mecánicas / funcionamiento del sistema',
    'Prueba de carretera / prueba de funcionamiento',
  ];
  procLabels.forEach((label) => {
    if (y + 14 > pageBottom) { doc.addPage(); y = 45; }
    const checked = procedimientos.includes(label);
    y = drawCheckboxLine(doc, marginX, y, label, checked, pageWidth - 16);
  });
  // "Otro"
  const otroProc = procedimientos.find((p) => p.startsWith('Otro:'));
  if (y + 14 > pageBottom) { doc.addPage(); y = 45; }
  y = drawCheckboxLine(
    doc,
    marginX,
    y,
    `Otro: ${otroProc ? otroProc.replace('Otro: ', '') : ''}`,
    !!otroProc,
    pageWidth - 16
  );
  y += 10;

  // ----- 3. Hallazgos y fallas -----
  if (y + 60 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '3. HALLAZGOS Y FALLAS ENCONTRADAS');

  const fColW = [
    pageWidth * 0.25,
    pageWidth * 0.22,
    pageWidth * 0.33,
    pageWidth * 0.20,
  ];
  // Adjust last column to fill remaining
  fColW[2] = pageWidth - fColW[0] - fColW[1] - fColW[3];

  const fHeaderH = 20;
  drawRow(doc, marginX, y, fHeaderH, [
    { text: 'Sistema / componente', width: fColW[0], bold: true, align: 'center', fill: '#1a1a1a', fontSize: 8 },
    { text: 'Código / medición', width: fColW[1], bold: true, align: 'center', fill: '#1a1a1a', fontSize: 8 },
    { text: 'Falla encontrada', width: fColW[2], bold: true, align: 'center', fill: '#1a1a1a', fontSize: 8 },
    { text: 'Estado', width: fColW[3], bold: true, align: 'center', fill: '#1a1a1a', fontSize: 8 },
  ]);
  y += fHeaderH;

  const fRowH = 22;
  const rows = hallazgos.length > 0 ? hallazgos : [{}, {}, {}, {}];
  rows.forEach((h) => {
    if (y + fRowH > pageBottom) { doc.addPage(); y = 45; }
    drawRow(doc, marginX, y, fRowH, [
      { text: h.sistema || '', width: fColW[0] },
      { text: h.codigo || '', width: fColW[1], align: 'center' },
      { text: h.falla || '', width: fColW[2] },
      { text: h.estado || 'Pendiente', width: fColW[3], align: 'center' },
    ]);
    y += fRowH;
  });
  y += 10;

  // ----- 4. Explicación técnica -----
  if (y + 60 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '4. EXPLICACIÓN TÉCNICA DEL DIAGNÓSTICO');
  doc.font('Helvetica').fontSize(8.5).fillColor('#555')
    .text('Explique qué se encontró, qué pruebas se realizaron, qué resultados se obtuvieron y cómo estos resultados se relacionan con la falla presentada por el vehículo.', marginX, y, { width: pageWidth });
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(9).fillColor('#000')
    .text(b.explicacion || '', marginX, y, { width: pageWidth });
  y = doc.y + 12;

  // ----- 5. Recomendación -----
  if (y + 60 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '5. RECOMENDACIÓN / TRABAJO SUGERIDO');
  doc.font('Helvetica').fontSize(9).fillColor('#000')
    .text(b.recomendacion || '', marginX, y, { width: pageWidth });
  y = doc.y + 12;

  // ----- 6. Observaciones -----
  if (y + 100 > pageBottom) { doc.addPage(); y = 45; }
  y = drawSectionHeader(doc, marginX, y, pageWidth, '6. OBSERVACIONES Y ALCANCE DEL DIAGNÓSTICO');
  doc.font('Helvetica').fontSize(8).fillColor('#555')
    .text(
      'El diagnóstico corresponde a las pruebas efectuadas en el momento de la revisión. Cuando sea necesario desmontar componentes, realizar pruebas adicionales o efectuar una reparación, se informará al cliente antes de continuar. La sustitución de una pieza no se considerará necesaria únicamente por la presencia de un código de falla; debe confirmarse mediante las pruebas correspondientes.',
      marginX, y, { width: pageWidth, lineGap: 2 }
    );
  y = doc.y + 14;

  // Firmas
  const sigY = y;
  const sigWidth = pageWidth / 2 - 20;

  const tecnicoSig = decodeSignature(b.firmaTecnico);
  const recibidoSig = decodeSignature(b.firmaRecibido);

  doc.fillColor('#000').font('Helvetica').fontSize(9)
    .text('Diagnóstico realizado por:', marginX, sigY, { width: sigWidth });
  doc.font('Helvetica-Bold').text(b.realizadoPor || '________________', marginX, doc.y + 2, { width: sigWidth });
  doc.font('Helvetica').fontSize(9)
    .text('Firma del técnico:', marginX + pageWidth - sigWidth, sigY, { width: sigWidth, align: 'center' });

  const sig2Y = doc.y + 30;
  doc.font('Helvetica').fontSize(9)
    .text('Cliente:', marginX, sig2Y, { width: sigWidth });
  doc.font('Helvetica-Bold').text(b.clienteNombre || '________________', marginX, doc.y + 2, { width: sigWidth });
  doc.font('Helvetica').fontSize(9)
    .text('Firma de recibido:', marginX + pageWidth - sigWidth, sig2Y, { width: sigWidth, align: 'center' });

  // Firmas centradas en su columna, apoyadas justo encima de su propia
  // línea (columna derecha, donde están las etiquetas "Firma del técnico" /
  // "Firma de recibido").
  const sigImgX = marginX + pageWidth - sigWidth;
  const sigImgW = sigWidth - 30;
  const sigImgH = 26;
  if (tecnicoSig) {
    doc.image(tecnicoSig, sigImgX + (sigWidth - sigImgW) / 2, sigY + 10, {
      fit: [sigImgW, sigImgH],
      align: 'center',
      valign: 'bottom',
    });
  }
  if (recibidoSig) {
    doc.image(recibidoSig, sigImgX + (sigWidth - sigImgW) / 2, sig2Y + 10, {
      fit: [sigImgW, sigImgH],
      align: 'center',
      valign: 'bottom',
    });
  }

  // Líneas de firma
  doc.moveTo(marginX, sigY + 40).lineTo(marginX + sigWidth, sigY + 40).stroke();
  doc.moveTo(marginX + pageWidth - sigWidth, sigY + 40).lineTo(marginX + pageWidth, sigY + 40).stroke();
  doc.moveTo(marginX, sig2Y + 40).lineTo(marginX + sigWidth, sig2Y + 40).stroke();
  doc.moveTo(marginX + pageWidth - sigWidth, sig2Y + 40).lineTo(marginX + pageWidth, sig2Y + 40).stroke();

  // Footer
  const footerY = doc.page.height - 35;
  doc.font('Helvetica').fontSize(7).fillColor('#888')
    .text(
      'Taller Pacheco · Mecánica · Electricidad · Electrónica · Aire acondicionado · Diagnóstico automotriz\nDocumento de diagnóstico técnico — conservar junto con la orden de servicio.',
      marginX, footerY, { width: pageWidth, align: 'center', lineGap: 2 }
    );

  doc.end();
});

module.exports = router;
