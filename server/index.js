const path = require('path');
const express = require('express');

const quoteRouter = require('./routes/quote');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '5mb' }));

app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

app.use('/api/quote', quoteRouter);

app.listen(PORT, () => {
  console.log(`Taller Pacheco corriendo en http://localhost:${PORT}`);
});
