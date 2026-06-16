const path = require('path');
const Database = require('better-sqlite3');

// Banco de dados PRÓPRIO deste serviço (isolamento de dados).
const db = new Database(path.join(__dirname, '..', 'orders.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    total       REAL    NOT NULL,
    status      TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  INTEGER NOT NULL,
    name        TEXT,
    unit_price  REAL    NOT NULL,
    quantity    INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

module.exports = db;
