require('dotenv').config();
const express = require('express');
const { createUser, getUser } = require('./controller');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'user-service', status: 'ok' }));

app.post('/users', createUser);
app.get('/users/:id', getUser);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`[user-service] rodando em http://localhost:${PORT}`));
