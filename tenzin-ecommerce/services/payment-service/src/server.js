require('dotenv').config();
const express = require('express');
const { processPayment } = require('./controller');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'payment-service', status: 'ok' }));

app.post('/payments', processPayment);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`[payment-service] rodando em http://localhost:${PORT}`));
