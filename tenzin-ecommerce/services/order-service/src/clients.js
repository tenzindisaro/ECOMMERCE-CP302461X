// Clientes HTTP para os demais serviços. Toda comunicação ocorre via REST.
// Usa o fetch nativo do Node 22 (sem dependências extras).

const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
const USER_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';

async function getUser(userId) {
  const res = await fetch(`${USER_URL}/users/${userId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`user-service respondeu ${res.status}`);
  return res.json();
}

async function getProduct(productId) {
  const res = await fetch(`${PRODUCT_URL}/products/${productId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`product-service respondeu ${res.status}`);
  return res.json();
}

async function getInventory(productId) {
  const res = await fetch(`${INVENTORY_URL}/inventory/${productId}`);
  if (!res.ok) throw new Error(`inventory-service respondeu ${res.status}`);
  return res.json();
}

async function setInventory(productId, quantity) {
  const res = await fetch(`${INVENTORY_URL}/inventory/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error(`inventory-service (PUT) respondeu ${res.status}`);
  return res.json();
}

async function processPayment(orderId, amount) {
  const res = await fetch(`${PAYMENT_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount }),
  });
  if (!res.ok) throw new Error(`payment-service respondeu ${res.status}`);
  return res.json();
}

module.exports = { getUser, getProduct, getInventory, setInventory, processPayment };
