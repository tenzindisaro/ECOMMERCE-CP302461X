const db = require('./db');

// GET /products - listar todos os produtos
function listProducts(req, res) {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
}

// GET /products/:id - obter detalhes de um produto
function getProduct(req, res) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  res.json(product);
}

// POST /products - cadastrar um novo produto
function createProduct(req, res) {
  const { name, description, price } = req.body;

  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'Campos obrigatórios: name (string) e price (number)' });
  }

  const result = db
    .prepare('INSERT INTO products (name, description, price) VALUES (?, ?, ?)')
    .run(name, description ?? null, price);

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
}

module.exports = { listProducts, getProduct, createProduct };
