const db = require('./db');
const clients = require('./clients');

// Monta o objeto completo do pedido (com itens) a partir do banco.
function loadOrder(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT product_id, name, unit_price, quantity FROM order_items WHERE order_id = ?').all(orderId);
  return { ...order, items };
}

// POST /orders - cria um novo pedido orquestrando os demais serviços.
// Body esperado: { userId, items: [{ productId, quantity }] }
async function createOrder(req, res) {
  const { userId, items } = req.body;

  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Campos obrigatórios: userId e items (lista não vazia)' });
  }

  // 1. Valida o usuário no Serviço de Usuários.
  const user = await clients.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: `Usuário ${userId} não encontrado` });
  }

  // 2 e 3. Consulta produtos (Catálogo) e verifica disponibilidade (Estoque).
  const resolvedItems = [];
  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'Cada item precisa de productId e quantity (inteiro > 0)' });
    }

    const product = await clients.getProduct(item.productId);
    if (!product) {
      return res.status(404).json({ error: `Produto ${item.productId} não encontrado` });
    }

    const inventory = await clients.getInventory(item.productId);
    if (inventory.quantity < item.quantity) {
      // Cenário 2: estoque insuficiente -> pedido REJEITADO, nada é persistido.
      return res.status(422).json({
        error: 'Estoque insuficiente',
        productId: item.productId,
        requested: item.quantity,
        available: inventory.quantity,
      });
    }

    resolvedItems.push({
      productId: item.productId,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      stockBefore: inventory.quantity,
    });
  }

  // 4. Persiste o pedido com status CRIADO.
  const total = resolvedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const orderId = db.transaction(() => {
    const result = db
      .prepare('INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)')
      .run(userId, total, 'CRIADO');
    const newId = result.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    for (const i of resolvedItems) {
      insertItem.run(newId, i.productId, i.name, i.unitPrice, i.quantity);
    }
    return newId;
  })();

  // 5. Solicita o pagamento ao Serviço de Pagamento.
  const payment = await clients.processPayment(orderId, total);

  // 6. Atualiza o status conforme o resultado do pagamento.
  if (payment.status === 'APROVADO') {
    // 7. Pagamento aprovado: dá baixa no estoque (PUT no Serviço de Estoque).
    for (const i of resolvedItems) {
      await clients.setInventory(i.productId, i.stockBefore - i.quantity);
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('PAGO', orderId);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('CANCELADO', orderId);
  }

  const finalOrder = loadOrder(orderId);
  res.status(201).json({ ...finalOrder, payment: { status: payment.status, amount: payment.amount } });
}

// GET /orders/:id - consulta um pedido.
function getOrder(req, res) {
  const order = loadOrder(Number(req.params.id));
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }
  res.json(order);
}

module.exports = { createOrder, getOrder };
