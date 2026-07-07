const itemsBody = document.getElementById('items-body');
const subtotalDisplay = document.getElementById('subtotal-display');
const ivaDisplay = document.getElementById('iva-display');
const totalDisplay = document.getElementById('total-display');
const descuentosInput = document.getElementById('descuentos');

function money(n) {
  const value = Number(n) || 0;
  return '$ ' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function addRow(values = {}) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="f-descripcion" value="${values.descripcion || ''}" /></td>
    <td><input type="text" class="f-materiales" value="${values.materiales || ''}" /></td>
    <td><input type="text" class="f-tiempo" value="${values.tiempo || ''}" /></td>
    <td><input type="number" class="f-valor" min="0" value="${values.valor || ''}" /></td>
    <td><input type="number" class="f-total" min="0" value="${values.total || ''}" /></td>
    <td class="col-actions"><button type="button" class="row-remove" title="Quitar fila">&times;</button></td>
  `;
  row.querySelector('.row-remove').addEventListener('click', () => {
    row.remove();
    recalcTotals();
  });
  row.querySelector('.f-valor').addEventListener('input', (e) => {
    const totalInput = row.querySelector('.f-total');
    if (!totalInput.dataset.touched) {
      totalInput.value = e.target.value;
    }
    recalcTotals();
  });
  row.querySelector('.f-total').addEventListener('input', (e) => {
    e.target.dataset.touched = 'true';
    recalcTotals();
  });
  itemsBody.appendChild(row);
}

function recalcTotals() {
  let subtotal = 0;
  itemsBody.querySelectorAll('tr').forEach((row) => {
    subtotal += Number(row.querySelector('.f-total').value) || 0;
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

function suggestCotizacionNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `COT-${y}${m}${d}`;
}

function initForm() {
  document.getElementById('cotizacionNo').value = suggestCotizacionNo();
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('fecha').value = today;
  document.getElementById('notas').value =
    'Términos de Pago: Validez de la Cotización:\n' +
    'Los repuestos adicionales no cotizados se facturarán por separado.\n' +
    'Se requiere una aprobación por escrito para iniciar el trabajo.';

  for (let i = 0; i < 3; i += 1) addRow();
  recalcTotals();
}

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

// ----- Generar PDF -----
document.getElementById('btn-generate').addEventListener('click', async () => {
  const messageEl = document.getElementById('generate-message');
  messageEl.textContent = '';
  messageEl.className = 'message';

  const items = Array.from(itemsBody.querySelectorAll('tr')).map((row) => ({
    descripcion: row.querySelector('.f-descripcion').value,
    materiales: row.querySelector('.f-materiales').value,
    tiempo: row.querySelector('.f-tiempo').value,
    valor: Number(row.querySelector('.f-valor').value) || 0,
    total: Number(row.querySelector('.f-total').value) || 0,
  }));

  const payload = {
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
    link.download = `cotizacion-${payload.cotizacionNo || 'sin-numero'}.pdf`;
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

// ----- Cambiar contraseña -----
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

// ----- Firmas -----
const signatures = { cliente: null, taller: null };
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

loadUser();
initForm();
