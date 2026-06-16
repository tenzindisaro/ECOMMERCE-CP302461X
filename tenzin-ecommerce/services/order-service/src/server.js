require('dotenv').config();
const express = require('express');
const { createOrder, getOrder } = require('./controller');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'order-service', status: 'ok' }));

// Wrapper para capturar erros de funções async e devolver 500 com mensagem.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.post('/orders', asyncHandler(createOrder));
app.get('/orders/:id', getOrder);

// Tratamento centralizado de erros (ex.: serviço dependente fora do ar).
app.use((err, req, res, next) => {
  console.error('[order-service] erro:', err.message);
  res.status(502).json({ error: 'Falha ao comunicar com um serviço dependente', detail: err.message });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`[order-service] rodando em http://localhost:${PORT}`));
