const db = require('./db');

// Limite de aprovação: pagamentos acima desse valor são RECUSADOS.
// Permite demonstrar de forma controlada um pagamento recusado (basta um pedido caro).
const APPROVAL_LIMIT = Number(process.env.PAYMENT_APPROVAL_LIMIT || 10000);

// POST /payments - simula o processamento de pagamento.
// Saída esperada: status APROVADO ou RECUSADO.
function processPayment(req, res) {
  const { orderId, amount } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Campo obrigatório: amount (number > 0)' });
  }

  const status = amount <= APPROVAL_LIMIT ? 'APROVADO' : 'RECUSADO';

  const result = db
    .prepare('INSERT INTO payments (order_id, amount, status) VALUES (?, ?, ?)')
    .run(orderId ?? null, amount, status);

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(payment);
}

module.exports = { processPayment };
