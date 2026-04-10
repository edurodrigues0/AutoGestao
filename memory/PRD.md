# AutoGestão - PRD (Product Requirements Document)

## Descrição
SaaS multi-tenant para gestão de serviços de auto mecânicas com controle individual de mecânicos, privacidade de dados e cálculo automático de comissão.

## Data de Criação
2024-01 (implementado em 2026-03)

## Stack Tecnológica
- **Frontend**: React + Tailwind CSS + Recharts + Lucide Icons
- **Backend**: FastAPI + MongoDB (Motor async)
- **Storage**: Emergent Object Storage (fotos dos serviços)
- **Pagamentos**: Asaas (sandbox ativo)
- **Auth**: JWT com httpOnly cookies + bcrypt

## Arquitetura Multi-tenant
- Cada workspace = uma oficina mecânica
- Users pertencem a um workspace
- Isolamento total de dados por workspace_id
- Roles: admin (dono da oficina), mechanic (mecânico)

## Planos
| Plano | Preço | Mecânicos |
|-------|-------|-----------|
| Básico | R$ 69,90/mês | Até 2 |
| Pro | R$ 149,90/mês | Até 5 |
| Premium | R$ 249,90/mês | Ilimitado |

## Funcionalidades Implementadas

### Auth
- [x] Login com email/senha
- [x] Logout
- [x] Registro de novo workspace
- [x] JWT com refresh token
- [x] Proteção contra brute force (5 tentativas/15min)
- [x] Redirect automático por role

### Serviços
- [x] Registrar serviço (cliente, valor, descrição, foto)
- [x] Upload de foto via câmera (mobile) ou galeria
- [x] Storage na nuvem (Emergent Object Storage)
- [x] Visualizar foto em modal
- [x] Mecânicos veem apenas os próprios serviços
- [x] Admin vê todos os serviços
- [x] Filtros: mecânico, cliente, período

### Mecânicos (admin)
- [x] Listar mecânicos com stats mensais
- [x] Adicionar mecânico
- [x] Editar nome e comissão individual
- [x] Ativar/desativar mecânico
- [x] Limite por plano enforçado

### Comissão
- [x] Tipo: fixo (padrão para todos) ou individual por mecânico
- [x] Cálculo automático: total_mes × percentual / 100
- [x] Exibição no dashboard do mecânico
- [x] Exibição no ranking do admin

### Dashboards
- [x] Admin: KPIs, ranking mecânicos, gráfico mensal (6 meses), serviços recentes
- [x] Mecânico: Faturamento mês, comissão, total geral, serviços recentes

### Relatórios
- [x] Exportar Excel (.xlsx) com filtros
- [x] Exportar PDF com filtros
- [x] Filtros: mecânico, período

### Configurações
- [x] Alterar nome e telefone da oficina
- [x] Configurar tipo de comissão (fixo/individual)
- [x] Configurar percentual padrão

### Billing (Asaas) — COMPLETO
- [x] Visualizar plano atual
- [x] Trocar de plano (upgrade/downgrade local)
- [x] Webhook Asaas para ativação automática
- [x] Checkout nativo Asaas (redirect para https://sandbox.asaas.com/checkoutSession/show/{id})
- [x] Retorno do checkout: /billing/success (com polling de ativação) e /billing/failed
- [x] Payload correto: billingTypes: ["CREDIT_CARD"], chargeTypes: ["RECURRENT"], subscription com cycle MONTHLY
- [x] Asaas coleta dados do cliente diretamente no checkout (sem CPF/CNPJ obrigatório no nosso form)

## PWA (Progressive Web App)
- [x] manifest.json com nome, ícones, display standalone, shortcuts
- [x] Service Worker com cache estratégico
- [x] Ícones para Android e iOS
- [x] Banner de instalação Android e iOS

## Configurações de Ambiente (backend/.env)
- MONGO_URL, DB_NAME=autogestao_db
- JWT_SECRET (gerado)
- EMERGENT_LLM_KEY (configurado)
- ASAAS_API_KEY (configurado — sandbox aprovado)
- ASAAS_WALLET_ID=57dd2dd4-bc12-4777-8869-f5e70e83e84d
- ASAAS_BASE_URL=https://sandbox.asaas.com/api
- FRONTEND_URL=https://oficina-pro-4.preview.emergentagent.com

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Notificações por email (quando serviço registrado, quando comissão calculada)
- [ ] Página de perfil do mecânico (trocar senha)
- [ ] Histórico de pagamentos Asaas (listar faturas do workspace)
- [ ] Múltiplas oficinas por superadmin

### P2 - Média Prioridade
- [ ] Gráfico de comissão no dashboard do mecânico
- [ ] Exportar relatório por mecânico individual (PDF com foto)
- [ ] Busca por número de serviço
- [ ] Tags/categorias de serviço

### Refatoração
- [X] server.py com 1000+ linhas — separar em routes/, models/, services/

## Notas Técnicas
- Storage: Emergent Object Storage via EMERGENT_LLM_KEY
- Photos: upload multipart/form-data → PUT storage → URL path salvo no serviço
- Photo display: fetch blob com axios (respects httpOnly cookies)
- Commission calc: workspace.commission_type determines if fixed or individual
- Reports: reportlab para PDF, pandas+openpyxl para Excel
- Asaas Checkout: CREDIT_CARD é o único método para RECURRENT subscriptions
  PIX requer chave PIX cadastrada no Asaas; BOLETO tem restrições similares
- Webhook: correlação via asaas_checkout_id salvo no workspace na criação do checkout
