# AutoGestão

SaaS **multi-tenant** para gestão de serviços de **oficinas mecânicas**: cada workspace representa uma oficina, com isolamento de dados por `workspace_id`, papéis **admin** (dono) e **mecânico**, controle de serviços, comissões (fixa ou por mecânico), dashboards, relatórios (Excel/PDF), integração de **pagamentos com Asaas** (assinaturas) e **PWA** no frontend.

Documentação de requisitos e backlog mais detalhada: [`memory/PRD.md`](memory/PRD.md).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 19, Create React App (Craco), Tailwind CSS, Recharts, Lucide, React Router |
| Backend | FastAPI, Uvicorn, Motor (MongoDB assíncrono) |
| Dados | MongoDB |
| Armazenamento de fotos | MinIO (S3-compatible, via `boto3`; ver `MINIO_*` no `.env`) |
| Pagamentos | API Asaas (sandbox/produção conforme variáveis) |
| Auth | JWT em cookies httpOnly, bcrypt |

## Estrutura do repositório

```
AutoGestao/
├── backend/          # API FastAPI (server.py)
│   ├── docker-compose.yaml   # MongoDB + MinIO local
│   ├── requirements.txt
│   └── tests/        # Testes pytest
├── frontend/         # SPA React
│   ├── public/       # PWA (manifest, service worker)
│   └── src/
└── memory/           # PRD e notas do produto
```

## Pré-requisitos

- **Python** 3.10 ou superior (recomendado)
- **Node.js** LTS e **Yarn** 1.x (o projeto declara `packageManager: yarn@1.22.22`)
- **MongoDB** acessível (local via Docker ou instância remota, ex.: Atlas)
- Contas/chaves opcionais conforme o que você for usar: **Asaas** (billing)

## 1. MongoDB e MinIO locais (Docker)

Na pasta `backend`:

```bash
docker compose -f docker-compose.yaml up -d
```

O compose sobe **MongoDB 7** na porta **27017** (usuário/senha de exemplo `admin` / `admin`) e **MinIO** nas portas **9000** (API S3) e **9001** (console web). Ajuste a `MONGO_URL` no `.env` do backend (ex.: `mongodb://admin:admin@localhost:27017/?authSource=admin`). Configure `MINIO_*` conforme [`backend/env.example`](backend/env.example) (por padrão: `localhost:9000`, credenciais `minioadmin` / `minioadmin`).

## 2. Configurar o backend

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual (Windows PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Instale dependências:

```bash
pip install -r requirements.txt
```

Crie o arquivo **`backend/.env`** (não commite segredos). Variáveis usadas pela aplicação:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `MONGO_URL` | Sim | URI de conexão do MongoDB |
| `DB_NAME` | Sim | Nome do banco (ex.: `autogestao_db`) |
| `JWT_SECRET` | Recomendada | Chave secreta para assinar JWT (em produção, use valor forte e aleatório) |
| `FRONTEND_URL` | Não | URL do frontend para CORS e redirects (padrão: `http://localhost:3000`) |
| `BACKEND_URL` | Não | URL pública da API (ex.: Asaas/webhooks; padrão: `http://localhost:8001`) |
| `MINIO_ENDPOINT` | Não | Host:porta do MinIO (padrão: `localhost:9000`) |
| `MINIO_ACCESS_KEY` | Não | Usuário root do MinIO |
| `MINIO_SECRET_KEY` | Não | Senha root do MinIO |
| `MINIO_BUCKET` | Não | Nome do bucket (padrão: `autogestao`; criado na subida da API) |
| `MINIO_USE_SSL` | Não | `true`/`false` — HTTPS para o endpoint MinIO |
| `ASAAS_API_KEY` | Para billing | Chave da API Asaas |
| `ASAAS_BASE_URL` | Não | Ex.: `https://sandbox.asaas.com/api` ou produção |
| `ASAAS_WALLET_ID` | Para Asaas | ID da carteira Asaas |
| `ADMIN_EMAIL` | Não | Email do usuário admin seed (padrão: `admin@autogestao.com`) |
| `ADMIN_PASSWORD` | Não | Senha do admin seed (padrão: `admin123`) |
| `CORS_ORIGINS` | Não | Origem extra para CORS, se necessário |

Exemplo mínimo para desenvolvimento local (ajuste `MONGO_URL` ao seu MongoDB):

```env
MONGO_URL=mongodb://admin:admin@localhost:27017/?authSource=admin
DB_NAME=autogestao_db
JWT_SECRET=altere-em-producao
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8001
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=autogestao
MINIO_USE_SSL=false
```

### Subir a API

Na pasta `backend`, com o venv ativo:

```bash
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

Alternativa (porta padrão do Uvicorn é **8000**):

```bash
python server.py
```

Se usar a porta **8000**, defina `BACKEND_URL=http://localhost:8000` e o mesmo host no `REACT_APP_BACKEND_URL` do frontend.

A documentação interativa da API fica em `http://127.0.0.1:8001/docs` (ou `:8000` conforme a porta).

## 3. Configurar o frontend

```bash
cd frontend
yarn install
```

Crie **`frontend/.env`**:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

O valor deve coincidir com a URL onde o FastAPI está escutando (incluindo porta e `http`/`https`).

### Executar em desenvolvimento

```bash
yarn start
```

O app costuma abrir em **http://localhost:3000**.

### Build de produção

```bash
yarn build
```

Sirva a pasta `frontend/build` com o servidor estático da sua preferência; configure `REACT_APP_BACKEND_URL` no momento do build para apontar para a API em produção.

## Testes automatizados (backend)

Com a API no ar e o mesmo usuário admin configurado (`ADMIN_EMAIL` / `ADMIN_PASSWORD` ou padrões), na pasta `backend`:

```bash
set REACT_APP_BACKEND_URL=http://127.0.0.1:8001
pytest tests/ -v
```

No PowerShell, use `$env:REACT_APP_BACKEND_URL="http://127.0.0.1:8001"` antes do `pytest`.

## Notas

- **Asaas**: checkout e webhooks dependem de URLs públicas em produção; em ambiente local, ferramentas como túnel HTTPS podem ser necessárias para testar webhooks.
- **MinIO**: o backend precisa alcançar o endpoint configurado em `MINIO_*` (subir o serviço com Docker ou apontar para um MinIO remoto). As fotos são salvas em WebP (máx. 1600 px) para economizar espaço.
- Mais detalhes de planos, fluxos e backlog: [`memory/PRD.md`](memory/PRD.md).
