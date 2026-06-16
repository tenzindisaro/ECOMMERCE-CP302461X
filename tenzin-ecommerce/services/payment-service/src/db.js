const path = require('path');
const Database = require('better-sqlite3');

// Banco de dados PRÓPRIO deste serviço (isolamento de dados).
const db = new Database(path.join(__dirname, '..', 'payments.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER,
    amount     REAL    NOT NULL,
    status     TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
