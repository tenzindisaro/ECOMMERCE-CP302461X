# E-commerce com Arquitetura de Microsserviços

Sistema simplificado de e-commerce composto por **5 microsserviços independentes**,
cada um com seu **próprio banco de dados SQLite** e comunicando-se **exclusivamente via REST (HTTP)**.

Stack: **Node.js 22 · Express · SQLite (better-sqlite3)**.

## Pré-requisitos

- **Node.js 22.x** (use a mesma versão major no macOS e no Windows).
- **npm 10+** (já vem com o Node).
- Nenhuma ferramenta de build extra é necessária: `better-sqlite3` instala via binário pré-compilado
  (Windows x64/arm64 e macOS), então `npm install` **não exige Visual Studio Build Tools**.

> Funciona em **Windows e macOS** sem alterações: caminhos via `path`, configuração via `.env`
> e inicialização via `concurrently` (sem comandos específicos de shell).

## Serviços e portas

| Serviço             | Porta | Responsabilidade                              | Banco           |
|---------------------|-------|-----------------------------------------------|-----------------|
| product-service     | 3001  | Catálogo de produtos                          | `products.db`   |
| user-service        | 3002  | Clientes do sistema                           | `users.db`      |
| inventory-service   | 3003  | Controle de estoque                           | `inventory.db`  |
| payment-service     | 3004  | Simulação de pagamento (APROVADO/RECUSADO)    | `payments.db`   |
| order-service       | 3005  | Orquestração e ciclo de vida dos pedidos      | `orders.db`     |

Cada banco é um arquivo SQLite criado automaticamente na pasta do respectivo serviço.
**Nenhum serviço acessa o banco de outro** — toda interação é via HTTP.

## Instalação

Na raiz do projeto:

```bash
npm install          # instala o concurrently (orquestrador de start)
npm run install:all  # instala as dependências dos 5 serviços
```

## Como executar

### Todos os serviços de uma vez (recomendado)

```bash
npm run start:all
```

### Cada serviço separadamente (independência de execução)

Em terminais distintos:

```bash
npm run start:product     # porta 3001
npm run start:user        # porta 3002
npm run start:inventory   # porta 3003
npm run start:payment     # porta 3004
npm run start:order       # porta 3005
```

Ou diretamente dentro da pasta de cada serviço: `npm start`.

### Configuração (opcional)

Cada serviço lê variáveis de um arquivo `.env` (veja o `.env.example` de cada um).
Sem `.env`, são usados os valores padrão (portas acima e URLs `localhost`).
Para customizar, copie o exemplo:

```bash
cp services/order-service/.env.example services/order-service/.env   # macOS/Linux
copy services\order-service\.env.example services\order-service\.env  # Windows (cmd)
```

## Endpoints (contratos REST)

### product-service (3001)
- `GET /products` — lista todos os produtos
- `GET /products/:id` — detalhes de um produto
- `POST /products` — cadastra produto · body: `{ "name", "description", "price" }`

### user-service (3002)
- `POST /users` — cadastra usuário · body: `{ "name", "email" }`
- `GET /users/:id` — busca usuário por ID

### inventory-service (3003)
- `GET /inventory/:productId` — consulta o estoque (retorna `quantity: 0` se não cadastrado)
- `PUT /inventory/:productId` — define a quantidade · body: `{ "quantity" }`

### payment-service (3004)
- `POST /payments` — processa pagamento · body: `{ "orderId", "amount" }` → `status: APROVADO | RECUSADO`
  - Regra de simulação: aprova se `amount > 0` e `amount <= PAYMENT_APPROVAL_LIMIT` (padrão `10000`).

### order-service (3005)
- `POST /orders` — cria pedido · body: `{ "userId", "items": [{ "productId", "quantity" }] }`
- `GET /orders/:id` — consulta pedido (com itens e status)

Todos os serviços expõem também `GET /health`.

## Fluxo de criação de pedido (`POST /orders`)

1. Valida o **usuário** (`user-service`).
2. Para cada item: consulta o **produto/preço** (`product-service`).
3. Verifica a **disponibilidade** (`inventory-service`).
   - Estoque insuficiente → `422` e **nenhum pedido é criado**.
4. Persiste o pedido com status **CRIADO**.
5. Solicita o **pagamento** (`payment-service`) com o valor total.
6. Atualiza o status: **PAGO** (aprovado) ou **CANCELADO** (recusado).
7. Em caso de aprovação, dá **baixa no estoque** (`PUT /inventory`).

## Cadastro de estoque inicial (opção A)

Como o `product-service` **não conhece estoque**, o estoque inicial de cada produto é
cadastrado manualmente no `inventory-service` via `PUT /inventory/:productId`, preservando
o isolamento entre os serviços.

## Coleção de requisições (Insomnia)

Importe `insomnia_collection.json` no Insomnia. A coleção reproduz:

- **Cenário 1 (sucesso):** cria produto → usuário → estoque → pedido (PAGO) → consulta status.
- **Cenário 2 (falha):** pedido com estoque insuficiente → rejeição (`422`).

## Arquitetura

Diagrama, contratos detalhados e exemplos JSON em [`docs/arquitetura.md`](docs/arquitetura.md).
