# Proposta de Arquitetura — E-commerce com Microsserviços

## 1. Visão geral

O sistema é decomposto em **5 microsserviços independentes**. Cada serviço:

- Roda em seu **próprio processo** (porta dedicada).
- Possui seu **próprio banco SQLite** (isolamento de dados).
- Comunica-se com os demais **apenas via REST/HTTP** (baixo acoplamento).
- Pode ser **iniciado e executado separadamente** (independência de execução).

| Serviço           | Porta | Responsabilidade                           | Persistência   |
|-------------------|-------|--------------------------------------------|----------------|
| Product Service   | 3001  | Catálogo de produtos                       | `products.db`  |
| User Service      | 3002  | Clientes                                   | `users.db`     |
| Inventory Service | 3003  | Estoque                                    | `inventory.db` |
| Payment Service   | 3004  | Simulação de pagamento                     | `payments.db`  |
| Order Service     | 3005  | Orquestração dos pedidos                   | `orders.db`    |

## 2. Diagrama de arquitetura

```
                         ┌──────────────────┐
        POST /orders     │                  │
[Cliente] ─────────────► │   Order Service  │  (orquestrador) ── orders.db
                         │      :3005       │
                         └───┬───┬───┬───┬──┘
              GET /users/:id │   │   │   │ POST /payments
            ┌────────────────┘   │   │   └────────────────┐
            ▼                     │   │                    ▼
   ┌────────────────┐            │   │           ┌────────────────┐
   │  User Service  │  users.db  │   │           │ Payment Service│ payments.db
   │     :3002      │            │   │           │     :3004      │
   └────────────────┘            │   │           └────────────────┘
                  GET /products/:id   │ GET /inventory/:productId
                                 │    │ PUT /inventory/:productId
                                 ▼    ▼
                   ┌────────────────┐ ┌────────────────────┐
                   │ Product Service│ │ Inventory Service  │
                   │     :3001      │ │      :3003         │
                   │  products.db   │ │   inventory.db     │
                   └────────────────┘ └────────────────────┘
```

**Regra-chave:** nenhuma seta cruza diretamente para o banco de outro serviço.
Todas as interações são chamadas HTTP entre serviços.

## 3. Fluxo de comunicação (POST /orders)

1. Cliente envia `POST /orders` com `userId` e lista de `items` (`productId` + `quantity`).
2. Order Service valida o usuário no **User Service**.
3. Para cada item, consulta preço/dados no **Product Service**.
4. Verifica disponibilidade no **Inventory Service**.
   - Se estoque insuficiente → responde `422` e **não cria** o pedido.
5. Persiste o pedido com status **CRIADO**.
6. Chama o **Payment Service** com o valor total.
7. Conforme a resposta:
   - **APROVADO** → status **PAGO** + baixa no estoque (`PUT /inventory/:id`).
   - **RECUSADO** → status **CANCELADO**.
8. Retorna o pedido final ao cliente.

Estados possíveis do pedido: `CRIADO` → `PAGO` | `CANCELADO`.

## 4. Contratos das APIs

### Product Service — :3001
| Método | Rota             | Descrição                |
|--------|------------------|--------------------------|
| GET    | `/products`      | Lista todos os produtos  |
| GET    | `/products/:id`  | Detalhes de um produto   |
| POST   | `/products`      | Cadastra um produto      |

### User Service — :3002
| Método | Rota         | Descrição              |
|--------|--------------|------------------------|
| POST   | `/users`     | Cadastra um usuário    |
| GET    | `/users/:id` | Busca usuário por ID   |

### Inventory Service — :3003
| Método | Rota                     | Descrição                       |
|--------|--------------------------|---------------------------------|
| GET    | `/inventory/:productId`  | Consulta estoque (0 se ausente) |
| PUT    | `/inventory/:productId`  | Define a quantidade disponível  |

### Payment Service — :3004
| Método | Rota         | Descrição                                  |
|--------|--------------|--------------------------------------------|
| POST   | `/payments`  | Processa pagamento → `APROVADO`/`RECUSADO` |

### Order Service — :3005
| Método | Rota          | Descrição                |
|--------|---------------|--------------------------|
| POST   | `/orders`     | Cria um pedido           |
| GET    | `/orders/:id` | Consulta um pedido       |

## 5. Exemplos de requisição e resposta (JSON)

### Criar produto
```http
POST /products
{ "name": "Camiseta Tenzin", "description": "Algodão", "price": 50 }
```
```json
201 Created
{ "id": 1, "name": "Camiseta Tenzin", "description": "Algodão", "price": 50 }
```

### Criar usuário
```http
POST /users
{ "name": "Siddarta", "email": "sid@example.com" }
```
```json
201 Created
{ "id": 1, "name": "Siddarta", "email": "sid@example.com" }
```

### Cadastrar estoque
```http
PUT /inventory/1
{ "quantity": 10 }
```
```json
200 OK
{ "productId": 1, "quantity": 10 }
```

### Criar pedido (sucesso)
```http
POST /orders
{ "userId": 1, "items": [ { "productId": 1, "quantity": 2 } ] }
```
```json
201 Created
{
  "id": 1,
  "user_id": 1,
  "total": 100,
  "status": "PAGO",
  "items": [ { "product_id": 1, "name": "Camiseta Tenzin", "unit_price": 50, "quantity": 2 } ],
  "payment": { "status": "APROVADO", "amount": 100 }
}
```

### Criar pedido (estoque insuficiente)
```http
POST /orders
{ "userId": 1, "items": [ { "productId": 1, "quantity": 9999 } ] }
```
```json
422 Unprocessable Entity
{ "error": "Estoque insuficiente", "productId": 1, "requested": 9999, "available": 8 }
```

### Processar pagamento (direto)
```http
POST /payments
{ "orderId": 1, "amount": 100 }
```
```json
201 Created
{ "id": 1, "order_id": 1, "amount": 100, "status": "APROVADO", "created_at": "..." }
```

## 6. Decisões arquiteturais

- **Isolamento de dados:** cada serviço acessa exclusivamente seu próprio arquivo SQLite.
- **Order Service como orquestrador:** concentra a lógica do fluxo, mantendo os demais
  serviços coesos e sem dependências cruzadas (Product não conhece estoque nem pedidos).
- **Estoque inicial via PUT (opção A):** preserva o isolamento — o Product Service não
  precisa conhecer o Inventory Service.
- **Pagamento simulado e controlável:** aprova até um limite configurável, permitindo
  demonstrar tanto aprovação quanto recusa.
- **Tratamento de erros:** validações retornam `400`/`404`/`422`; falha de comunicação
  entre serviços retorna `502`.
