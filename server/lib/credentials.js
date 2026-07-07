const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'data', 'credentials.json');
const DEFAULT_EMAIL = 'jahn@taller.com';
const DEFAULT_PASSWORD = 'tallerpacheco+';

function ensureCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    const initial = {
      email: DEFAULT_EMAIL,
      passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    };
    fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(initial, null, 2));
  }
}

function getCredentials() {
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
}

function saveCredentials(credentials) {
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

module.exports = { ensureCredentials, getCredentials, saveCredentials, DEFAULT_EMAIL };
