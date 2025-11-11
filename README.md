# CATRE Ipitinga — Sistema de Inscrições

Aplicação completa (backend + frontend) para gerenciar inscrições de eventos da igreja CATRE Ipitinga com pagamentos Mercado Pago, recibos em PDF com QR Code e check-in presencial.

## Sumário

- [Principais recursos](#principais-recursos)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Configuração inicial](#configuração-inicial)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Executando a aplicação](#executando-a-aplicação)
- [Banco de dados & Prisma](#banco-de-dados--prisma)
- [Pagamentos com Mercado Pago](#pagamentos-com-mercado-pago)
- [Fluxos críticos](#fluxos-críticos)
- [Testes](#testes)
- [Documentação da API](#documentação-da-api)
- [Seeds de exemplo](#seeds-de-exemplo)
- [Deploy no Render](#deploy-no-render)
- [Pr�ximos passos sugeridos](#pr�ximos-passos-sugeridos)

## Principais recursos

- Inscrições em lote com um único pagamento (PIX ou Cartão via Mercado Pago).
- Recuperação automática de pedidos pendentes pelo CPF do comprador.
- Painel administrativo com RBAC (`AdminGeral`, `AdminDistrital`, `DiretorLocal`, `Tesoureiro`).
- CRUD de eventos, distritos, igrejas e gestão de inscrições/pedidos.
- Estorno parcial por inscrição mantendo o restante do pedido ativo.
- Recibos individuais em PDF com QR Code para check-in e verificação por token.
- Página pública para consulta de comprovantes (CPF + data de nascimento).
- Check-in via leitura de QR Code ou busca manual.
- Webhook Mercado Pago idempotente com trilha de auditoria.
- Job automático para expiração/cancelamento de pedidos vencidos.
- Logs com mascaramento de CPF e registros de auditoria.

## Arquitetura

- **Frontend**: Vue 3 + Vite + TypeScript + TailwindCSS.
- **Backend**: Node.js + Express + TypeScript + Prisma ORM.
- **Banco de dados**: PostgreSQL (Docker incluso).
- **Pagamentos**: Mercado Pago (Preferências, webhook, estorno parcial).
- **PDF/QR**: Playwright + `qrcode`.
- **Armazenamento de fotos**: Serviço abstrato (Supabase/S3 simulados em disco local).
- **Autenticação**: JWT + RBAC baseado em roles.
- **Logs/observabilidade**: Pino + auditoria em tabela dedicada.

## Estrutura de pastas

```
├── backend            # API Express + Prisma
│   ├── prisma         # Schema, migração e seed
│   └── src            # Código-fonte (módulos, serviços, jobs, pdf etc.)
├── frontend           # Aplicação Vue 3 + Tailwind
│   └── src            # Páginas públicas/admin, stores e componentes
├── docker-compose.yml # Postgres local
├── .env.example
└── README.md
```

## Configuração inicial

1. **Instale dependências** (necessário ter Node 18+):

   ```bash
   npm install
   npm --workspace backend install
   npm --workspace frontend install
   ```

2. **Copie o arquivo de ambiente**:

   ```bash
   cp .env.example .env
   cp backend/test/.env.test backend/.env.test   # opcional para rodar testes locais
   ```

3. **Inicie o PostgreSQL via Docker**:

   ```bash
   docker compose up -d
   ```

4. **Rode as migrações e gere o Prisma Client**:

   ```bash
   npm --workspace backend run prisma:generate
   npm --workspace backend run prisma:migrate
   npm --workspace backend run prisma:seed
   ```

   > A seed cria usuários de exemplo (Admin geral, distrital, diretores locais e tesouraria) usando o email/senha configurados em `.env`, além dos dados básicos.

## Variáveis de ambiente

O arquivo `.env.example` traz todos os valores necessários com descrições. Ajuste os seguintes pontos antes de colocar em produção:

- `DATABASE_URL`: URL do PostgreSQL.
- `JWT_SECRET`: mínimo 32 caracteres.
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_INTEGRATOR_ID`: credenciais da conta Mercado Pago.
- `SUPABASE_...` ou `S3_...`: credenciais do provedor de armazenamento (caso substitua o driver local).
- `PDF_SIGN_SECRET`, `HMAC_SECRET`: usados na assinatura de recibos e QR Code.
- `APP_URL`, `API_URL`: apontam para o endereço público das aplicações.

## Executando a aplicação

### Ambiente de desenvolvimento (hot reload completo)

```bash
npm run dev
```

- API: http://localhost:3001 (Swagger disponível em `backend/openapi.json`).
- Frontend: http://localhost:5173

> Rodar via `npm run dev` executa backend + frontend em paralelo (usar `npm run dev:backend` ou `npm run dev:frontend` para processos isolados).

### Build de produção

```bash
npm run build
```

Os artefatos são gerados em `backend/dist` e `frontend/dist`.

## Banco de dados & Prisma

- Schema: `backend/prisma/schema.prisma`
- Migração inicial: `backend/prisma/migrations/0001_init/migration.sql`
- Seed: `backend/prisma/seed.ts`

Comandos úteis:

```bash
npm --workspace backend run prisma:generate   # gerar Prisma Client
npm --workspace backend run prisma:migrate   # aplicar migrações localmente
npm --workspace backend run prisma:deploy    # aplicar migrações em produção
npm --workspace backend run prisma:seed      # inserir dados iniciais
```

## Pagamentos com Mercado Pago

1. Crie uma aplicação no Mercado Pago e configure:
   - Access token de teste ou produção (`MP_ACCESS_TOKEN`).
   - Webhook apontando para `https://SEU_DOMINIO/api/webhooks/mercadopago`.
   - Assinatura secreta (`MP_WEBHOOK_SECRET`) para validar requests.
2. O backend cria uma **Preferência** com um item por inscrição, o que permite estornos parciais.
3. Metadados enviados ao MP: `orderId`, `registrationIds`, `buyerCpf`.
4. O webhook busca o pagamento pela `external_reference` (ID do pedido) e atualiza status localmente.
5. Estornos parciais são disparados via `POST /api/admin/registrations/:id/refund`.

## Fluxos críticos

### Inscrição pública

1. Usuário acessa `/evento/:slug`.
2. Informa CPF do comprador → sistema verifica pedidos pendentes e redireciona se existir.
3. Informa número de inscrições e preenche dados (foto opcional, distrito/igreja filtrados).
4. Pedido é criado como `PENDING` e preferência Mercado Pago gerada.
5. Webhook confirma `PAID` e recibos PDF são gerados automaticamente (armazenados em `tmp/receipts`).

### Retomada de pedido pendente

- Endpoint `POST /api/inscriptions/start` retorna `orderPending` com dados do pagamento.
- O frontend redireciona para `/evento/:slug/pagamento/:orderId`.
- Se a preferência expirar, o backend gera uma nova mantendo `external_reference`.

### Estorno parcial

1. Admin (role Tesoureiro ou AdminGeral) aciona `POST /api/admin/registrations/:id/refund`.
2. O backend chama `paymentService.refundRegistration` com o valor da inscrição.
3. Registro muda para `REFUNDED` e pedido para `PARTIALLY_REFUNDED`. Auditoria é registrada.

### Check-in

- Recibos possuem QR Code com URL assinada (`/checkin/validate?rid=...&sig=...`).
- Check-in pode ser realizado via QR Code (webcam) ou busca manual (CPF + nascimento).
- Apenas inscrições `PAID` são aceitas; ao confirmar, status vai para `CHECKED_IN`.

## Testes

Backend:

```bash
npm --workspace backend run test
```

- **Integração**: `test/integration/fullflow.spec.ts` cobre criação de pedido, pagamento, check-in e estorno parcial (dependências externas mockadas).
- **Unitários**: utilitários de CPF/HMAC e idempotência de webhook.

Frontend:

```bash
npm --workspace frontend run test
```

- Teste de utilitário (`src/utils/__tests__/format.spec.ts`) garante formatos básicos.

## Documentação da API

- Arquivo OpenAPI em `backend/src/openapi/openapi.json`.
- Geração rápida para distribuição:

  ```bash
  npm --workspace backend run openapi
  # arquivo exportado em backend/openapi.json
  ```

## Seeds de exemplo

Após rodar `npm --workspace backend run prisma:seed` você terá:

- Usuários admin/Distrital/Diretor/Tesouraria (todos usam a senha `ADMIN_PASSWORD` do `.env`):
  - `Admin Geral` (`AdminGeral`): email definido em `ADMIN_EMAIL`.
  - `distrital.norte@catre.local` (`AdminDistrital`) - associado ao Distrito Norte.
  - `distrital.sul@catre.local` (`AdminDistrital`) - associado ao Distrito Sul.
  - `diretora.central@catre.local` (`DiretorLocal`) - associado à Igreja Central.
  - `diretora.esperanca@catre.local` (`DiretorLocal`) - associado à Igreja Esperança.
  - `tesouraria@catre.local` (`Tesoureiro`).
- Distritos: "Distrito Norte", "Distrito Sul"
- Igrejas: "Igreja Central", "Igreja Esperança"
- Ministérios: "Ministerio Jovem" (ativo) e "Ministerio de Musica" (ativo)
- Evento: "Retiro Espiritual 2025" (`slug: retiro-espiritual-2025`) vinculado ao Ministério Jovem

> Em desenvolvimento, faça login com esse usuário via `/admin`.

## Deploy no Render

- O arquivo `render.yaml` j� configura o servi�o `CATRE Ipitinga Backend` com Node/Express e um banco PostgreSQL Starter. O Render respeita o `root: backend` e usa os comandos `npm run build` e `npm run start`.
- As etapas completas (vari�veis de ambiente, URLs, webhook e rotinas de observabilidade) est�o documentadas em `docs/render-backend.md`. Mantenha segredos (JWT, Mercado Pago, Supabase/S3) apenas no painel do Render e sincronize o `API_URL` com `https://<seu-backend>.onrender.com/api`.

## Próximos passos sugeridos

1. Configurar armazenamento real de fotos (Supabase Storage ou S3) e atualizar `STORAGE_DRIVER`.
2. Hospedar o backend atrás de HTTPS (necessário para Playwright + captura da webcam).
3. Publicar frontend estático e apontar `VITE_API_URL`.
4. Automatizar deploy (CI/CD) executando testes, lint e migrações.
5. Habilitar monitoramento/log centralizado (ex.: Logflare, Datadog) se for rodar em produção.

---

Feito com ❤️ para agilizar a gestão dos retiros do CATRE Ipitinga. Qualquer dúvida ou melhoria, abra uma issue ou contribua!
