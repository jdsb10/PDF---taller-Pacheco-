const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const { ensureCredentials } = require('./lib/credentials');
const authRouter = require('./routes/auth');
const quoteRouter = require('./routes/quote');

ensureCredentials();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(
  session({
    name: 'taller_pacheco_sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  })
);

function requireAuthPage(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login.html');
}

function requireAuthApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'No autenticado' });
}

app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get(['/', '/app.html'], requireAuthPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

app.use('/api/auth', authRouter);
app.use('/api/quote', requireAuthApi, quoteRouter);

app.listen(PORT, () => {
  console.log(`Taller Pacheco corriendo en http://localhost:${PORT}`);
});
