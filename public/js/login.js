document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const messageEl = document.getElementById('login-message');
  messageEl.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      messageEl.textContent = data.error || 'No se pudo iniciar sesión';
      return;
    }

    window.location.href = '/app.html';
  } catch (err) {
    messageEl.textContent = 'Error de conexión con el servidor';
  }
});
