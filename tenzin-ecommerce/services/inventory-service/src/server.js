require('dotenv').config();
const express = require('express');
const { getInventory, setInventory } = require('./controller');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'inventory-service', status: 'ok' }));

app.get('/inventory/:productId', getInventory);
app.put('/inventory/:productId', setInventory);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`[inventory-service] rodando em http://localhost:${PORT}`));
