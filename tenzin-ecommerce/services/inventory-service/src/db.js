const path = require('path');
const Database = require('better-sqlite3');

// Banco de dados PRÓPRIO deste serviço (isolamento de dados).
const db = new Database(path.join(__dirname, '..', 'inventory.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    product_id INTEGER PRIMARY KEY,
    quantity   INTEGER NOT NULL DEFAULT 0
  )
`);

module.exports = db;
