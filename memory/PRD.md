# AutoGestão - PRD (Product Requirements Document)

## Descrição
SaaS multi-tenant para gestão de serviços de auto mecânicas com controle individual de mecânicos, privacidade de dados e cálculo automático de comissão.

## Data de Criação
2024-01 (implementado em 2026-03)

## Stack Tecnológica
- **Frontend**: React + Tailwind CSS + Recharts + Lucide Icons + Phosphor Icons
- **Backend**: FastAPI + MongoDB (Motor async)
- **Storage**: Emergent Object Storage (fotos dos serviços)
- **Pagamentos**: Asaas (sandbox - aguardando API key)
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

### Billing (Asaas)
- [x] Visualizar plano atual
- [x] Trocar de plano (upgrade/downgrade local)
- [x] Webhook Asaas para ativação automática
- [x] Checkout Asaas (aguarda API key)
- [ ] PENDENTE: ASAAS_API_KEY não configurada (sandbox walletId fornecido: 57dd2dd4-bc12-4777-8869-f5e70e83e84d)

## PWA (Progressive Web App)
- [x] manifest.json com nome, ícones, display standalone, shortcuts
- [x] Service Worker com cache estratégico (estáticos: cache-first, API: network-first, navegação: network-first)
- [x] Ícones para Android: 192x192 e 512x512 (normal + maskable)
- [x] Apple Touch Icon 180x180 para iOS
- [x] Meta tags iOS: apple-mobile-web-app-capable, status-bar-style, title
- [x] Theme color #2563EB (barra Android)
- [x] viewport-fit=cover (notch iOS)
- [x] Shortcuts no manifest (Registrar Serviço e Dashboard Admin)
- [x] Banner de instalação Android (beforeinstallprompt)
- [x] Banner de instruções iOS (como adicionar à tela inicial via Safari)
- Admin: admin@autogestao.com / admin123

## Configurações de Ambiente (backend/.env)
- MONGO_URL, DB_NAME=autogestao_db
- JWT_SECRET (gerado)
- EMERGENT_LLM_KEY (configurado)
- ASAAS_API_KEY (VAZIO - precisa ser preenchido)
- ASAAS_WALLET_ID=57dd2dd4-bc12-4777-8869-f5e70e83e84d
- ASAAS_BASE_URL=https://api-sandbox.asaas.com

## Backlog Priorizado

### P0 - Crítico
- [ ] ASAAS_API_KEY: usuário precisa fornecer a chave API do sandbox Asaas para ativar o pagamento recorrente

### P1 - Alta Prioridade
- [ ] Notificações por email (quando serviço registrado, quando comissão calculada)
- [ ] Página de perfil do mecânico (trocar senha)
- [ ] Histórico de pagamentos Asaas
- [ ] Múltiplas oficinas por superadmin

### P2 - Média Prioridade
- [ ] Gráfico de comissão no dashboard do mecânico
- [ ] Exportar relatório por mecânico individual
- [ ] Busca por número de serviço
- [ ] Tags/categorias de serviço

## Notas Técnicas
- Storage: Emergent Object Storage via EMERGENT_LLM_KEY
- Photos: upload multipart/form-data → PUT storage → URL path salvo no serviço
- Photo display: fetch blob com axios (respects httpOnly cookies)
- Commission calc: workspace.commission_type determines if fixed or individual
- Reports: reportlab para PDF, pandas+openpyxl para Excel
