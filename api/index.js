const path = require('path');
const express = require('express');

const quoteRouter = require('../server/routes/quote');

const app = express();

app.use(express.json({ limit: '5mb' }));

app.get(['/', '/app.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'app.html'));
});

app.use('/api/quote', quoteRouter);

module.exports = app;
