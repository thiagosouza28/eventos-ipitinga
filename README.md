# Eventos Ipitinga

Projeto completo para inscri√ß√µes, pagamentos e gest√£o administrativa do **Eventos Ipitinga**.

## Vis√£o geral

- **Backend**: Express + TypeScript + Prisma + Mercado Pago. Exp√µe a API REST sob `/api`, inclui autentica√ß√£o JWT, auditoria, gerenciamento de eventos/inscri√ß√µes e integra√ß√µes financeiras.
- **Frontend**: Aplica√ß√£o Vue 3 + Vite + Pinia que consome a API p√∫blica/admin e fornece interface de check-in, relat√≥rios e formul√°rios de inscri√ß√£o.
- **Docs**: A pasta `docs/` guarda artefatos como a cole√ß√£o Postman usada para testar a API.

## Estrutura do reposit√≥rio

```
‚îú‚îÄ‚îÄ backend/        # API Express (TypeScript + Prisma + Mercado Pago + auditoria)
‚îú‚îÄ‚îÄ frontend/       # SPA em Vue 3 + Vite + Tailwind
‚îú‚îÄ‚îÄ docs/           # Documenta√ß√£o anexada (Postman, etc.)
‚îî‚îÄ‚îÄ scripts/         # Utilit√°rios e scripts auxiliares
```

## Pr√©-requisitos

- Node.js >= 20 (recomendado via NVM)
- npm
- MySQL 8+ (ou usar o banco remoto configurado via `DATABASE_URL`)
- Para o frontend: ajusta o `.env` com `VITE_API_URL`/`VITE_APP_URL` ou deixar apontando para o backend de desenvolvimento.

## Backend (Express + Prisma)

1. V√° para o diret√≥rio `backend` e instale as depend√™ncias:
   ```bash
   cd backend
   npm install
   ```
2. Configure o `.env` (j√° h√° um arquivo `.env` com valores de exemplo). Ajuste `API_URL`, `APP_URL`, `DATABASE_URL`, `JWT_SECRET`, `MP_ACCESS_TOKEN` etc.
3. Gere o cliente Prisma e execute migra√ß√µes:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
4. Para desenvolvimento:
   ```bash
   npm run dev
   ```
5. Para build/produ√ß√£o:
   ```bash
   npm run build
   npm run start
   ```
   Ou use `npm run start:prod` para habilitar `NODE_ENV=production`.

### Scripts principais do backend

| Script | Descri√ß√£o |
| --- | --- |
| `npm run dev` | Inicia servidor com `ts-node-dev` e mapeamento de caminhos. |
| `npm run dev:win` | Mesma coisa com suporte ao `code page` do Windows. |
| `npm run build` | Compila TypeScript (usa `tsconfig.build.json`). |
| `npm run start` / `npm run start:prod` | Executa a vers√£o compilada de `dist/`. |
| `npm run prisma:migrate` | Executa migra√ß√µes (apenas no ambiente dev). |
| `npm run prisma:deploy` | Aplica migra√ß√µes em ambiente de produ√ß√£o. |
| `npm run prisma:seed` | Popula dados b√°sicos. |
| `npm run lint`, `npm run test`, `npm run test:watch` | Qualidade e testes com ESLint/Jest. |
| `npm run openapi` | Gera documenta√ß√£o OpenAPI via script. |

### Observa√ß√µes de ambiente

- `APP_URL`/`API_URL`: endere√ßo p√∫blico da API.
- `PORT`: porta do servidor (`3001` por padr√£o no `.env` de dev).
- Torne `DATABASE_URL` v√°lido para seu MySQL (pode usar `docker` ou RDS).
- Configure chaves Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`), SMTP (`SMTP_*`) e vari√°veis de seguran√ßa (`JWT_SECRET`, `PASSWORD_SALT_ROUNDS`, `CHECKIN_CONFIRM_PASSWORD`, etc.).
- `CORS_ORIGINS` deve incluir o dom√≠nio da aplica√ß√£o Vue (`http://localhost:5173`, `https://eventos-ipitinga.vercel.app`, etc.).

## Frontend (Vue 3 + Vite)

1. Entre em `frontend` e instale depend√™ncias:
   ```bash
   cd frontend
   npm install
   ```
2. Ajuste o `.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   VITE_APP_URL=http://localhost:5173
   ```
   Ou aponte para as URLs de produ√ß√£o hospedadas.
3. Plataformas padr√£o:
   - Desenvolvimento: `npm run dev` (usa Vite).
   - Build: `npm run build`.
   - Testes: `npm run test` (Vitest).
   - Lint: `npm run lint`.

### Conex√£o com a API

- As chamadas HTTP usam `API_BASE_URL` calculado em `frontend/src/config/api.ts`. Garanta que `VITE_API_URL` termine em `/api`.
- O frontend consome rotas como `GET /api/events`, `POST /api/inscriptions/start`, `GET /api/admin/...` (autenticadas via token JWT).
- A autentica√ß√£o armazena o token no Pinia e o injeta nos headers via `useApi` (`frontend/src/composables/useApi.ts`).

## Endpoints principais

A API exposta est√° detalhada em `backend/src/routes/index.ts`. Os principais caminhos s√£o:

- **P√∫blicos**: `/system/config`, `/events`, `/inscriptions/start`, `/orders/pending`, `/payments/...`, `/receipts/...`, `/checkin/...`, cat√°logos (districts/churches/ministries), Webhook Mercado Pago.
- **Admin**: `/admin/login`, `/admin/password/recover`, CRUD completo de districts/ministries/users/profiles/churches/events/orders/registrations/checkin/expenses/financial`.

Para uma vis√£o completa em Markdown ou Postman, consulte `docs/eventos-ipitinga.postman_collection.json`.

## Documenta√ß√£o adicional

- `docs/eventos-ipitinga.postman_collection.json`: cole√ß√£o Postman/Insomnia com todas as rotas HTTP e payloads.
- Os controladores descritos em `backend/src/modules/*/*.controller.ts` usam `zod` para validar os campos de corpo/payload.

## Sugest√µes de fluxo

1. Incluir credenciais v√°lidas no backend `.env`.
2. Rodar `npm run prisma:generate` e `npm run prisma:seed`.
3. Subir backend (`npm run dev` / `npm run start`), depois frontend (`npm run dev`).
4. Use `/admin/login` para obter o token e interaja com rotas protegidas.

## Contato

Caso precise de ajuda com as vari√°veis de produ√ß√£o (chaves Mercado Pago, SMTP ou banco) consulte o time respons√°vel ou revise o README interno da organiza√ß√£o.

## API para app Android (rotas e fun«ı«Êes)

- Prefixo base: `/api` (configurado em `backend/src/app.ts`).
- Autentica«ı«úo: JWT via header `Authorization: Bearer <token>` nas rotas `/api/admin/...`; rotas p«ßblicas n«úo exigem token.
- Permiss«µes: RBAC definido em `backend/src/config/permissions.ts` e aplicado por `authorizePermission`.
- Formatos: JSON por padr«úo; uploads usam `multipart/form-data` (campo `file`); relat«¸rios/recibos geram PDF.

### Funcionalidades chave

- Inscri«ı«Êes individuais ou em lote com cria«ı«úo de pedido.
- Pagamentos Mercado Pago (PIX, link) incluindo pagamentos em lote, marca«ı«úes manuais e estornos.
- Cat«≠logos e cadastros (distritos, igrejas, minist«©rios, eventos, lotes, usu«¸rios e perfis).
- Recibos/relat«¸rios em PDF (inscri«ı«Êes, finan«ıas, recibo individual).
- Check-in por QR/link com confirma«ı«úo por senha e dashboard em tempo real.
- Gest«úo financeira (despesas, resumos por evento/distrito/igreja, transfer«¶ncias para distritos/respons«Ìveis).

### Rotas p«ßblicas (sem token)

- GET `/api/system/config`: configura«ı«úo p«ßblica do sistema (textos/cores/links).
- GET `/api/events`: lista eventos p«ßblicos ativos.
- GET `/api/events/:slug`: detalhes de evento pelo slug.
- POST `/api/inscriptions/start`: inicia fluxo e retorna pedidos pendentes para um CPF em um evento.
- POST `/api/inscriptions/check`: verifica se um CPF j«≠ possui inscri«ı«úo/perfil.
- GET `/api/orders/pending`: lista pedidos pendentes por CPF (`cpf` na query).
- POST `/api/orders/bulk-payment`: gera prefer«¶ncia de pagamento em lote para pedidos existentes.
- POST `/api/inscriptions/batch`: cria pedido e inscri«ı«Êes (fluxo p«ßblico).
- GET `/api/payments/order/:orderId`: dados/links de pagamento do pedido.
- GET `/api/payments/preference/:preferenceId`: consulta uma prefer«¶ncia Mercado Pago.
- POST `/api/payments/pix/create`: gera prefer«¶ncia PIX (QR/copia-e-cola) para um pedido.
- POST `/api/receipts/lookup`: busca recibos por CPF ou inscri«ı«ú.
- GET `/api/receipts/:registrationId.pdf`: download do recibo em PDF.
- GET `/api/checkin/validate`: valida«ı«ú de link/QR de check-in.
- POST `/api/checkin/confirm`: confirma check-in via link com senha.
- POST `/api/webhooks/mercadopago`: webhook oficial do Mercado Pago.
- POST `/api/webhooks/pix`: webhook unificado de pagamentos PIX.
- GET `/api/catalog/districts`: cat«≠logo de distritos.
- GET `/api/catalog/churches`: cat«≠logo de igrejas.
- GET `/api/catalog/churches/director`: localiza igreja pelo CPF do diretor.
- GET `/api/catalog/ministries`: cat«≠logo de minist«©rios.
- GET `/api/public/districts`: alias p«ßblico para distritos.
- GET `/api/public/churches`: alias p«ßblico para igrejas.

### Autentica«ı«ú

- POST `/api/admin/login`: login (CPF/e-mail + senha) e emiss«úo de token/permiss«µes.
- POST `/api/admin/password/recover`: envia senha tempor«¸ria por e-mail.
- POST `/api/admin/profile/change-password`: troca de senha autenticada.

### Configura«ı«ú do sistema e PIX (admin)

- GET `/api/admin/system/config`: leitura da configura«ı«ú do sistema (AdminGeral + `system:view`).
- PUT `/api/admin/system/config`: atualiza«ı«ú do sistema (AdminGeral + `system:edit`).
- GET `/api/admin/payments/pix-config`: consulta integra«ı«ú PIX (AdminGeral).
- PUT `/api/admin/payments/pix-config`: cria/atualiza integra«ı«ú PIX (AdminGeral).

### Cadastros territoriais (admin)

- GET `/api/admin/districts`: lista distritos (`districts:view`).
- POST `/api/admin/districts`: cria distrito (`districts:create`).
- PATCH `/api/admin/districts/:id`: edita distrito (`districts:edit`).
- DELETE `/api/admin/districts/:id`: remove distrito (`districts:delete`).
- GET `/api/admin/ministries`: lista minist«©rios (`ministries:view`).
- POST `/api/admin/ministries`: cria minist«©rio (`ministries:create`).
- PATCH `/api/admin/ministries/:id`: edita minist«©rio (`ministries:edit`).
- DELETE `/api/admin/ministries/:id`: remove minist«©rio (`ministries:delete`).
- GET `/api/admin/churches`: lista igrejas (`churches:view`).
- POST `/api/admin/churches`: cria igreja (`churches:create`).
- PATCH `/api/admin/churches/:id`: edita igreja (`churches:edit`).
- DELETE `/api/admin/churches/:id`: remove igreja (`churches:delete`).

### Usu«¸rios e perfis (admin)

- GET `/api/admin/users`: lista usu«¸rios (AdminGeral + `users:view`).
- POST `/api/admin/users`: cria usu«¸rio (AdminGeral + `users:create`).
- PATCH `/api/admin/users/:id`: edita usu«¸rio (AdminGeral + `users:edit`).
- POST `/api/admin/users/:id/reset-password`: reseta senha (AdminGeral + `users:edit`).
- PATCH `/api/admin/users/:id/status`: ativa/desativa usu«¸rio (AdminGeral + `users:edit`).
- DELETE `/api/admin/users/:id`: remove usu«¸rio (AdminGeral + `users:delete`).
- GET `/api/admin/profiles`: lista perfis (`profiles:view`).
- POST `/api/admin/profiles`: cria perfil (`profiles:create`).
- PATCH `/api/admin/profiles/:id`: edita perfil (`profiles:edit`).
- PATCH `/api/admin/profiles/:id/status`: ativa/desativa perfil (`profiles:edit`).
- DELETE `/api/admin/profiles/:id`: remove perfil (`profiles:delete`).

### Eventos, lotes e uploads (admin)

- GET `/api/admin/events`: lista eventos (`events:view`).
- POST `/api/admin/events`: cria evento (`events:create`).
- PATCH `/api/admin/events/:id`: atualiza evento (`events:edit`).
- DELETE `/api/admin/events/:id`: exclui evento (`events:delete`).
- POST `/api/admin/uploads`: upload de imagem/arquivo (campo `file`, `events:edit`).
- GET `/api/admin/events/:eventId/lots`: lista lotes (`events:view`).
- POST `/api/admin/events/:eventId/lots`: cria lote (`events:edit`).
- PATCH `/api/admin/events/:eventId/lots/:lotId`: edita lote (`events:edit`).
- DELETE `/api/admin/events/:eventId/lots/:lotId`: remove lote (`events:delete`).

### Pedidos, pagamentos e inscri«ı«Êes (admin)

- POST `/api/admin/inscriptions/batch`: cria pedido/inscri«ı«Êes em modo administrativo (`registrations:create`).
- GET `/api/admin/orders`: lista pedidos com filtros (`orders:view`).
- POST `/api/admin/orders/:id/mark-paid`: marca pedido como pago (`orders:financial`).
- GET `/api/admin/registrations`: lista inscri«ı«Êes (`registrations:view`).
- GET `/api/admin/registrations/report`: dados agregados (`registrations:reports`).
- GET `/api/admin/registrations/report.pdf`: relat«¸rio em PDF (`registrations:reports`).
- PATCH `/api/admin/registrations/:id`: atualiza inscri«ı«ú (`registrations:edit`).
- DELETE `/api/admin/registrations/:id`: remove inscri«ı«ú (`registrations:delete`).
- POST `/api/admin/registrations/:id/cancel`: cancela inscri«ı«ú (`registrations:deactivate`).
- POST `/api/admin/registrations/:id/reactivate`: reativa inscri«ı«ú (`registrations:approve`).
- POST `/api/admin/registrations/:id/refund`: estorna inscri«ı«ú (`registrations:financial`).
- POST `/api/admin/registrations/mark-paid`: marca inscri«ı«Êes como pagas (`registrations:financial`).
- POST `/api/admin/registrations/:id/payment-link`: regenera link de pagamento (`registrations:edit`).
- GET `/api/admin/registrations/:id/history`: hist«¸rico de eventos da inscri«ı«ú (`registrations:view`).
- GET `/api/admin/registrations/:id/receipt-link`: link do recibo (`registrations:view`).

### Check-in (p«ßblico e admin)

- GET `/api/checkin/validate`: valida QR/link.
- POST `/api/checkin/confirm`: confirma«ı«ú via link com senha.
- GET `/api/admin/checkin/:eventId`: dashboard do evento (`checkin:view`).
- POST `/api/admin/checkin/scan`: valida QR/assinatura (`checkin:approve`).
- POST `/api/admin/checkin/manual`: busca por CPF + data de nascimento (`checkin:approve`).
- POST `/api/admin/checkin/confirm`: confirma check-in administrativo (`checkin:approve`).

### Despesas (admin)

- GET `/api/admin/events/:eventId/expenses`: lista despesas do evento (`financial:view`).
- POST `/api/admin/events/:eventId/expenses`: cria despesa (`financial:create`).
- GET `/api/admin/expenses/:id`: detalha despesa (`financial:view`).
- PATCH `/api/admin/expenses/:id`: edita despesa (`financial:edit`).
- DELETE `/api/admin/expenses/:id`: remove despesa (`financial:delete`).

### Financeiro e relat«¸rios (admin)

- GET `/api/admin/financial/summary`: resumo geral (`financial:view`).
- GET `/api/admin/financial/events/:eventId`: resumo por evento (`financial:view`).
- GET `/api/admin/financial/events/:eventId/districts/:districtId`: resumo do distrito (`financial:view`).
- GET `/api/admin/financial/events/:eventId/churches/:churchId`: resumo da igreja (`financial:view`).
- GET `/api/admin/financial/events/:eventId/report.pdf`: relat«¸rio financeiro em PDF (`financial:reports`).

### Transfer«¶ncias e cobran«ı«Êes por distrito/respons«Ìvel (admin)

- GET `/api/admin/finance/districts`: painel de distritos (`financial:view`).
- GET `/api/admin/finance/districts/:id/pending-orders`: pedidos pendentes do distrito (`financial:view`).
- GET `/api/admin/finance/districts/:id/transfers`: hist«¸rico de transfer«¶ncias (`financial:view`).
- POST `/api/admin/finance/districts/:districtId/transfer`: registra transfer«ı«ú/baixa (`financial:financial`).
- GET `/api/admin/finance/responsibles`: painel por respons«Ìvel (`financial:view`).
- GET `/api/admin/finance/responsibles/:id/pending-orders`: pedidos pendentes por respons«Ìvel (`financial:view`).
- GET `/api/admin/finance/responsibles/:id/transfers`: hist«¸rico de transfer«¶ncias do respons«Ìvel (`financial:view`).
- POST `/api/admin/finance/responsibles/:responsibleUserId/transfer`: registra transfer«ı«ú para respons«Ìvel (`financial:financial`).
