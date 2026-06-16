const path = require('path');
const Database = require('better-sqlite3');

// Banco de dados PRÓPRIO deste serviço (isolamento de dados).
const db = new Database(path.join(__dirname, '..', 'products.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL
  )
`);

module.exports = db;
