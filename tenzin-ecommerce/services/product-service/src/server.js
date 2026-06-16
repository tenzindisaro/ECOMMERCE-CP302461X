require('dotenv').config();
const express = require('express');
const { listProducts, getProduct, createProduct } = require('./controller');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'product-service', status: 'ok' }));

app.get('/products', listProducts);
app.get('/products/:id', getProduct);
app.post('/products', createProduct);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[product-service] rodando em http://localhost:${PORT}`));
