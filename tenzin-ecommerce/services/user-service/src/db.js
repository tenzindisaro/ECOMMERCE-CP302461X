const path = require('path');
const Database = require('better-sqlite3');

// Banco de dados PRÓPRIO deste serviço (isolamento de dados).
const db = new Database(path.join(__dirname, '..', 'users.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    email TEXT    NOT NULL UNIQUE
  )
`);

module.exports = db;
