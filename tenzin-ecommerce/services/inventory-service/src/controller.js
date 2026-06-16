const db = require('./db');

// GET /inventory/:productId - consultar o estoque de um produto.
// Se o produto ainda não tem estoque cadastrado, retorna quantity = 0.
function getInventory(req, res) {
  const productId = Number(req.params.productId);
  const row = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  res.json({ productId, quantity: row ? row.quantity : 0 });
}

// PUT /inventory/:productId - define a quantidade disponível (valor absoluto).
// Usado para cadastrar o estoque inicial (opção A) e para dar baixa após o pedido.
function setInventory(req, res) {
  const productId = Number(req.params.productId);
  const { quantity } = req.body;

  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'Campo obrigatório: quantity (inteiro >= 0)' });
  }

  db.prepare(`
    INSERT INTO inventory (product_id, quantity) VALUES (?, ?)
    ON CONFLICT(product_id) DO UPDATE SET quantity = excluded.quantity
  `).run(productId, quantity);

  res.json({ productId, quantity });
}

module.exports = { getInventory, setInventory };
