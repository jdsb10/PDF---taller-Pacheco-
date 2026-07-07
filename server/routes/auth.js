const express = require('express');
const bcrypt = require('bcryptjs');
const { getCredentials, saveCredentials } = require('../lib/credentials');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'No autenticado' });
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Falta email o contraseña' });
  }

  const credentials = getCredentials();
  const emailMatches = email.trim().toLowerCase() === credentials.email.toLowerCase();
  const passwordMatches = emailMatches && bcrypt.compareSync(password, credentials.passwordHash);

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  req.session.user = { email: credentials.email };
  res.json({ email: credentials.email });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('taller_pacheco_sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  res.json({ email: req.session.user.email });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Falta la contraseña actual o la nueva' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  const credentials = getCredentials();
  if (!bcrypt.compareSync(currentPassword, credentials.passwordHash)) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }

  credentials.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveCredentials(credentials);
  res.json({ ok: true });
});

module.exports = router;
