/* ===========================
   COTIZACIÓN / FACTURA
   =========================== */
const itemsBody = document.getElementById('items-body');
const itemsCards = document.getElementById('items-cards');
const subtotalDisplay = document.getElementById('subtotal-display');
const ivaDisplay = document.getElementById('iva-display');
const totalDisplay = document.getElementById('total-display');
const descuentosInput = document.getElementById('descuentos');

function money(n) {
  const value = Number(n) || 0;
  return '$ ' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

let rowIndex = 0;

function addRow(values = {}) {
  const idx = rowIndex++;

  // Desktop: fila en tabla
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="f-descripcion" value="${values.descripcion || ''}" /></td>
    <td><input type="text" class="f-materiales" value="${values.materiales || ''}" /></td>
    <td><input type="text" class="f-tiempo" value="${values.tiempo || ''}" /></td>
    <td><input type="number" class="f-valor" min="0" value="${values.valor || ''}" /></td>
    <td><input type="number" class="f-total" min="0" value="${values.total || ''}" /></td>
    <td class="col-actions"><button type="button" class="row-remove-table" title="Quitar fila">&times;</button></td>
  `;
  row.querySelector('.row-remove-table').addEventListener('click', () => {
    row.remove();
    removeItemCard(idx);
    recalcTotals();
  });
  row.querySelector('.f-valor').addEventListener('input', (e) => {
    const totalInput = row.querySelector('.f-total');
    if (!totalInput.dataset.touched) {
      totalInput.value = e.target.value;
      syncCardField(idx, 'total', e.target.value);
    }
    recalcTotals();
  });
  row.querySelector('.f-total').addEventListener('input', (e) => {
    e.target.dataset.touched = 'true';
    recalcTotals();
  });
  itemsBody.appendChild(row);

  // Mobile: tarjeta apilada
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.idx = idx;
  card.innerHTML = `
    <button type="button" class="row-remove" title="Quitar fila">&times;</button>
    <div class="field">
      <label>Descripción</label>
      <input type="text" class="f-descripcion" value="${values.descripcion || ''}" />
    </div>
    <div class="field">
      <label>Materiales/Repuestos</label>
      <input type="text" class="f-materiales" value="${values.materiales || ''}" />
    </div>
    <div class="grid">
      <div class="field">
        <label>Tiempo estimado</label>
        <input type="text" class="f-tiempo" value="${values.tiempo || ''}" />
      </div>
      <div class="field">
        <label>Valor estimado</label>
        <input type="number" class="f-valor" min="0" value="${values.valor || ''}" />
      </div>
      <div class="field">
        <label>Total</label>
        <input type="number" class="f-total" min="0" value="${values.total || ''}" />
      </div>
    </div>
  `;
  card.querySelector('.row-remove').addEventListener('click', () => {
    card.remove();
    removeTableRow(idx);
    recalcTotals();
  });
  card.querySelector('.f-valor').addEventListener('input', (e) => {
    const totalInput = card.querySelector('.f-total');
    if (!totalInput.dataset.touched) {
      totalInput.value = e.target.value;
      syncTableRow(idx, 'total', e.target.value);
    }
    recalcTotals();
  });
  card.querySelector('.f-total').addEventListener('input', (e) => {
    e.target.dataset.touched = 'true';
    recalcTotals();
  });
  itemsCards.appendChild(card);
}

function removeItemCard(idx) {
  const card = itemsCards.querySelector(`[data-idx="${idx}"]`);
  if (card) card.remove();
}

function removeTableRow(idx) {
  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((row) => {
    const totalInput = row.querySelector('.f-total');
    if (totalInput && totalInput.dataset.idx === String(idx)) {
      row.remove();
    }
  });
}

function syncCardField(idx, field, value) {
  const card = itemsCards.querySelector(`[data-idx="${idx}"]`);
  if (card) {
    const input = card.querySelector(`.f-${field}`);
    if (input) input.value = value;
  }
}

function syncTableRow(idx, field, value) {
  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((row) => {
    const totalInput = row.querySelector('.f-total');
    if (totalInput && totalInput.dataset.idx === String(idx)) {
      const input = row.querySelector(`.f-${field}`);
      if (input) input.value = value;
    }
  });
}

function recalcTotals() {
  let subtotal = 0;
  // Use cards on mobile, table on desktop
  const activeContainer = window.innerWidth <= 640 ? itemsCards : itemsBody;
  activeContainer.querySelectorAll('.f-total').forEach((input) => {
    subtotal += Number(input.value) || 0;
  });
  const iva = subtotal * 0.19;
  const descuentos = Number(descuentosInput.value) || 0;
  const total = subtotal + iva - descuentos;

  subtotalDisplay.textContent = money(subtotal);
  ivaDisplay.textContent = money(iva);
  totalDisplay.textContent = money(total);
}

document.getElementById('btn-add-row').addEventListener('click', () => addRow());
descuentosInput.addEventListener('input', recalcTotals);

function suggestDocumentNo(tipo) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = tipo === 'factura' ? 'FAC' : 'COT';
  return `${prefix}-${y}${m}${d}`;
}

function suggestDiagNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `DIAG-${y}${m}${d}`;
}

function buildDefaultNotas(tipo) {
  const palabra = tipo === 'factura' ? 'Factura' : 'Cotización';
  const participio = tipo === 'factura' ? 'facturados' : 'cotizados';
  return (
    `Términos de Pago: Validez de la ${palabra}:\n` +
    `Los repuestos adicionales no ${participio} se facturarán por separado.\n` +
    'Se requiere una aprobación por escrito para iniciar el trabajo.'
  );
}

const numeroInput = document.getElementById('cotizacionNo');
const notasTextarea = document.getElementById('notas');
let lastAutoNumero = '';
let lastAutoNotas = '';
let currentTipo = 'cotizacion';

function applyDocumentType() {
  const tipo = currentTipo;
  const esFactura = tipo === 'factura';

  document.getElementById('label-numero').textContent = esFactura ? 'Factura No' : 'Cotización No';
  document.getElementById('label-vigencia').textContent = esFactura
    ? 'Fecha de vencimiento'
    : 'Vigencia de la oferta';

  if (numeroInput.value === lastAutoNumero) {
    lastAutoNumero = suggestDocumentNo(tipo);
    numeroInput.value = lastAutoNumero;
  }
  if (notasTextarea.value === lastAutoNotas) {
    lastAutoNotas = buildDefaultNotas(tipo);
    notasTextarea.value = lastAutoNotas;
  }
}

function initForm() {
  lastAutoNumero = suggestDocumentNo(currentTipo);
  numeroInput.value = lastAutoNumero;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('fecha').value = today;
  lastAutoNotas = buildDefaultNotas(currentTipo);
  notasTextarea.value = lastAutoNotas;
  applyDocumentType();

  for (let i = 0; i < 3; i += 1) addRow();
  recalcTotals();
}

/* ===========================
   CARTA DIAGNÓSTICO
   =========================== */
const hallazgosBody = document.getElementById('hallazgos-body');
let hallazgoIndex = 0;

function addHallazgo(values = {}) {
  const idx = hallazgoIndex++;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="f-sistema" value="${values.sistema || ''}" placeholder="Ej. Motor" /></td>
    <td><input type="text" class="f-codigo" value="${values.codigo || ''}" placeholder="Ej. P0301" /></td>
    <td><input type="text" class="f-falla" value="${values.falla || ''}" placeholder="Descripción" /></td>
    <td>
      <select class="f-estado">
        <option value="Pendiente" ${values.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="Reparado" ${values.estado === 'Reparado' ? 'selected' : ''}>Reparado</option>
        <option value="Por revisar" ${values.estado === 'Por revisar' ? 'selected' : ''}>Por revisar</option>
        <option value="No aplica" ${values.estado === 'No aplica' ? 'selected' : ''}>No aplica</option>
      </select>
    </td>
    <td class="col-actions"><button type="button" class="row-remove-table" title="Quitar">&times;</button></td>
  `;
  row.querySelector('.row-remove-table').addEventListener('click', () => row.remove());
  hallazgosBody.appendChild(row);
}

document.getElementById('btn-add-hallazgo').addEventListener('click', () => addHallazgo());

// Checkbox "Otro"
document.getElementById('proc-otro-check').addEventListener('change', (e) => {
  document.getElementById('proc-otro-field').style.display = e.target.checked ? 'block' : 'none';
});

function initDiagnosticoForm() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('diag-fecha').value = today;
  document.getElementById('diag-numero').value = suggestDiagNo();
  for (let i = 0; i < 3; i += 1) addHallazgo();
}

function collectDiagnosticoData() {
  const procs = [];
  if (document.getElementById('proc-inspeccion').checked) procs.push('Inspección visual y revisión general');
  if (document.getElementById('proc-escaneo').checked) procs.push('Escaneo electrónico / lectura de códigos de falla');
  if (document.getElementById('proc-sensores').checked) procs.push('Pruebas de sensores y actuadores');
  if (document.getElementById('proc-electricas').checked) procs.push('Pruebas eléctricas: alimentación, tierras, continuidad y señales');
  if (document.getElementById('proc-mecanicas').checked) procs.push('Pruebas mecánicas / funcionamiento del sistema');
  if (document.getElementById('proc-carretera').checked) procs.push('Prueba de carretera / prueba de funcionamiento');
  if (document.getElementById('proc-otro-check').checked) {
    const otro = document.getElementById('proc-otro-text').value.trim();
    procs.push(otro ? `Otro: ${otro}` : 'Otro');
  }

  const hallazgos = Array.from(hallazgosBody.querySelectorAll('tr')).map((row) => ({
    sistema: row.querySelector('.f-sistema').value,
    codigo: row.querySelector('.f-codigo').value,
    falla: row.querySelector('.f-falla').value,
    estado: row.querySelector('.f-estado').value,
  })).filter((h) => h.sistema || h.codigo || h.falla);

  return {
    fecha: document.getElementById('diag-fecha').value,
    numero: document.getElementById('diag-numero').value,
    cliente: document.getElementById('diag-cliente').value,
    telefono: document.getElementById('diag-telefono').value,
    vehiculo: document.getElementById('diag-vehiculo').value,
    placa: document.getElementById('diag-placa').value,
    marcaModeloAnio: document.getElementById('diag-marca-modelo').value,
    kilometraje: document.getElementById('diag-kilometraje').value,
    motivo: document.getElementById('diag-motivo').value,
    procedimientos: procs,
    hallazgos,
    explicacion: document.getElementById('diag-explicacion').value,
    recomendacion: document.getElementById('diag-recomendacion').value,
    realizadoPor: document.getElementById('diag-realizado-por').value,
    clienteNombre: document.getElementById('diag-cliente-nombre').value,
    firmaTecnico: signatures.tecnico,
    firmaRecibido: signatures.recibido,
  };
}

/* ===========================
   SELECTOR DE TIPO
   =========================== */
const tipoBtns = document.querySelectorAll('.tipo-btn');
const sectionCotizacion = document.getElementById('section-cotizacion');
const sectionDiagnostico = document.getElementById('section-diagnostico');

function setTipo(tipo) {
  currentTipo = tipo;
  tipoBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.tipo === tipo));

  if (tipo === 'diagnostico') {
    sectionCotizacion.classList.remove('active');
    sectionDiagnostico.classList.add('active');
  } else {
    sectionCotizacion.classList.add('active');
    sectionDiagnostico.classList.remove('active');
    applyDocumentType();
  }
}

tipoBtns.forEach((btn) => {
  btn.addEventListener('click', () => setTipo(btn.dataset.tipo));
});

/* ===========================
   CARGAR USUARIO
   =========================== */
async function loadUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      window.location.href = '/login.html';
      return;
    }
    const data = await response.json();
    document.getElementById('user-email').textContent = data.email;
  } catch (err) {
    window.location.href = '/login.html';
  }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

/* ===========================
   GENERAR PDF COTIZACIÓN/FACTURA
   =========================== */
document.getElementById('btn-generate').addEventListener('click', async () => {
  const messageEl = document.getElementById('generate-message');
  messageEl.textContent = '';
  messageEl.className = 'message';

  const activeContainer = window.innerWidth <= 640 ? itemsCards : itemsBody;
  const items = Array.from(activeContainer.querySelectorAll(
    window.innerWidth <= 640 ? '.item-card' : 'tr'
  )).map((el) => ({
    descripcion: el.querySelector('.f-descripcion').value,
    materiales: el.querySelector('.f-materiales').value,
    tiempo: el.querySelector('.f-tiempo').value,
    valor: Number(el.querySelector('.f-valor').value) || 0,
    total: Number(el.querySelector('.f-total').value) || 0,
  }));

  const payload = {
    tipoDocumento: currentTipo,
    cotizacionNo: document.getElementById('cotizacionNo').value,
    fecha: document.getElementById('fecha').value,
    cliente: document.getElementById('cliente').value,
    vigencia: document.getElementById('vigencia').value,
    vehiculoMarca: document.getElementById('vehiculoMarca').value,
    vehiculoAnio: document.getElementById('vehiculoAnio').value,
    placa: document.getElementById('placa').value,
    items,
    descuentos: Number(descuentosInput.value) || 0,
    notas: document.getElementById('notas').value,
    firmaCliente: signatures.cliente,
    firmaTaller: signatures.taller,
  };

  try {
    const response = await fetch('/api/quote/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      messageEl.textContent = data.error || 'No se pudo generar el PDF';
      messageEl.classList.add('error');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefijoArchivo = payload.tipoDocumento === 'factura' ? 'factura' : 'cotizacion';
    link.download = `${prefijoArchivo}-${payload.cotizacionNo || 'sin-numero'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    messageEl.textContent = 'PDF generado correctamente';
    messageEl.classList.add('success');
  } catch (err) {
    messageEl.textContent = 'Error de conexión con el servidor';
    messageEl.classList.add('error');
  }
});

/* ===========================
   GENERAR PDF CARTA DIAGNÓSTICO
   =========================== */
document.getElementById('btn-generate-diag').addEventListener('click', async () => {
  const messageEl = document.getElementById('generate-message-diag');
  messageEl.textContent = '';
  messageEl.className = 'message';

  const payload = collectDiagnosticoData();

  try {
    const response = await fetch('/api/quote/generate-diagnostic-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      messageEl.textContent = data.error || 'No se pudo generar el PDF';
      messageEl.classList.add('error');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-${payload.numero || 'sin-numero'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    messageEl.textContent = 'PDF generado correctamente';
    messageEl.classList.add('success');
  } catch (err) {
    messageEl.textContent = 'Error de conexión con el servidor';
    messageEl.classList.add('error');
  }
});

/* ===========================
   CAMBIAR CONTRASEÑA
   =========================== */
const passwordModal = document.getElementById('password-modal');

document.getElementById('btn-change-password').addEventListener('click', () => {
  document.getElementById('password-message').textContent = '';
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  passwordModal.classList.remove('hidden');
});

document.getElementById('btn-cancel-password').addEventListener('click', () => {
  passwordModal.classList.add('hidden');
});

document.getElementById('password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const messageEl = document.getElementById('password-message');
  messageEl.textContent = '';

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;

  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();

    if (!response.ok) {
      messageEl.textContent = data.error || 'No se pudo cambiar la contraseña';
      return;
    }

    passwordModal.classList.add('hidden');
  } catch (err) {
    messageEl.textContent = 'Error de conexión con el servidor';
  }
});

/* ===========================
   FIRMAS
   =========================== */
const signatures = { cliente: null, taller: null, tecnico: null, recibido: null };
const signatureModal = document.getElementById('signature-modal');
const signatureCanvas = document.getElementById('signature-canvas');
const signatureCtx = signatureCanvas.getContext('2d');
const signatureModalTitle = document.getElementById('signature-modal-title');
const signatureMessage = document.getElementById('signature-message');
let currentSignatureTarget = null;
let isDrawingSignature = false;
let hasDrawnSignature = false;

function getCanvasPoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  const scaleX = signatureCanvas.width / rect.width;
  const scaleY = signatureCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function clearSignatureCanvas() {
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  hasDrawnSignature = false;
}

signatureCanvas.addEventListener('pointerdown', (event) => {
  isDrawingSignature = true;
  hasDrawnSignature = true;
  const { x, y } = getCanvasPoint(event);
  signatureCtx.beginPath();
  signatureCtx.moveTo(x, y);
  signatureCanvas.setPointerCapture(event.pointerId);
});

signatureCanvas.addEventListener('pointermove', (event) => {
  if (!isDrawingSignature) return;
  const { x, y } = getCanvasPoint(event);
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = 'round';
  signatureCtx.strokeStyle = '#000';
  signatureCtx.lineTo(x, y);
  signatureCtx.stroke();
});

function stopDrawingSignature() {
  isDrawingSignature = false;
}

signatureCanvas.addEventListener('pointerup', stopDrawingSignature);
signatureCanvas.addEventListener('pointerleave', stopDrawingSignature);
signatureCanvas.addEventListener('pointercancel', stopDrawingSignature);

function updateSignaturePreview(target) {
  const preview = document.getElementById(`preview-${target}`);
  const dataUrl = signatures[target];
  preview.innerHTML = dataUrl ? '' : 'Sin firmar';
  if (dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Firma';
    preview.appendChild(img);
  }
}

// Firmas cotización/factura
document.querySelectorAll('.btn-firmar').forEach((button) => {
  button.addEventListener('click', () => {
    currentSignatureTarget = button.dataset.target;
    signatureModalTitle.textContent =
      currentSignatureTarget === 'cliente' ? 'Firma del Cliente' : 'Firma de Taller Pacheco';
    signatureMessage.textContent = '';
    clearSignatureCanvas();
    signatureModal.classList.remove('hidden');
  });
});

// Firmas carta diagnóstico
document.querySelectorAll('.btn-firmar-diag').forEach((button) => {
  button.addEventListener('click', () => {
    currentSignatureTarget = button.dataset.target;
    signatureModalTitle.textContent =
      currentSignatureTarget === 'tecnico' ? 'Firma del Técnico' : 'Firma de Recibido (Cliente)';
    signatureMessage.textContent = '';
    clearSignatureCanvas();
    signatureModal.classList.remove('hidden');
  });
});

document.getElementById('btn-clear-signature').addEventListener('click', () => {
  clearSignatureCanvas();
});

document.getElementById('btn-cancel-signature').addEventListener('click', () => {
  signatureModal.classList.add('hidden');
});

document.getElementById('btn-save-signature').addEventListener('click', () => {
  if (!hasDrawnSignature) {
    signatureMessage.textContent = 'Dibuja una firma antes de guardar';
    return;
  }
  signatures[currentSignatureTarget] = signatureCanvas.toDataURL('image/png');
  updateSignaturePreview(currentSignatureTarget);
  signatureModal.classList.add('hidden');
});

/* ===========================
   INIT
   =========================== */
loadUser();
initForm();
initDiagnosticoForm();
