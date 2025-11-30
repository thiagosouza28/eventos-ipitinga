# Eventos Ipitinga

Projeto completo para inscrições, pagamentos e gestão administrativa do **Eventos Ipitinga**.

## Visão geral

- **Backend**: Express + TypeScript + Prisma + Mercado Pago. Expõe a API REST sob `/api`, inclui autenticação JWT, auditoria, gerenciamento de eventos/inscrições e integrações financeiras.
- **Frontend**: Aplicação Vue 3 + Vite + Pinia que consome a API pública/admin e fornece interface de check-in, relatórios e formulários de inscrição.
- **Docs**: A pasta `docs/` guarda artefatos como a coleção Postman usada para testar a API.

## Estrutura do repositório

```
├── backend/        # API Express (TypeScript + Prisma + Mercado Pago + auditoria)
├── frontend/       # SPA em Vue 3 + Vite + Tailwind
├── docs/           # Documentação anexada (Postman, etc.)
└── scripts/         # Utilitários e scripts auxiliares
```

## Pré-requisitos

- Node.js >= 20 (recomendado via NVM)
- npm
- MySQL 8+ (ou usar o banco remoto configurado via `DATABASE_URL`)
- Para o frontend: ajusta o `.env` com `VITE_API_URL`/`VITE_APP_URL` ou deixar apontando para o backend de desenvolvimento.

## Backend (Express + Prisma)

1. Vá para o diretório `backend` e instale as dependências:
   ```bash
   cd backend
   npm install
   ```
2. Configure o `.env` (já há um arquivo `.env` com valores de exemplo). Ajuste `API_URL`, `APP_URL`, `DATABASE_URL`, `JWT_SECRET`, `MP_ACCESS_TOKEN` etc.
3. Gere o cliente Prisma e execute migrações:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
4. Para desenvolvimento:
   ```bash
   npm run dev
   ```
5. Para build/produção:
   ```bash
   npm run build
   npm run start
   ```
   Ou use `npm run start:prod` para habilitar `NODE_ENV=production`.

### Scripts principais do backend

| Script | Descrição |
| --- | --- |
| `npm run dev` | Inicia servidor com `ts-node-dev` e mapeamento de caminhos. |
| `npm run dev:win` | Mesma coisa com suporte ao `code page` do Windows. |
| `npm run build` | Compila TypeScript (usa `tsconfig.build.json`). |
| `npm run start` / `npm run start:prod` | Executa a versão compilada de `dist/`. |
| `npm run prisma:migrate` | Executa migrações (apenas no ambiente dev). |
| `npm run prisma:deploy` | Aplica migrações em ambiente de produção. |
| `npm run prisma:seed` | Popula dados básicos. |
| `npm run lint`, `npm run test`, `npm run test:watch` | Qualidade e testes com ESLint/Jest. |
| `npm run openapi` | Gera documentação OpenAPI via script. |

### Observações de ambiente

- `APP_URL`/`API_URL`: endereço público da API.
- `PORT`: porta do servidor (`3001` por padrão no `.env` de dev).
- Torne `DATABASE_URL` válido para seu MySQL (pode usar `docker` ou RDS).
- Configure chaves Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`), SMTP (`SMTP_*`) e variáveis de segurança (`JWT_SECRET`, `PASSWORD_SALT_ROUNDS`, `CHECKIN_CONFIRM_PASSWORD`, etc.).
- `CORS_ORIGINS` deve incluir o domínio da aplicação Vue (`http://localhost:5173`, `https://eventos-ipitinga.vercel.app`, etc.).

## Frontend (Vue 3 + Vite)

1. Entre em `frontend` e instale dependências:
   ```bash
   cd frontend
   npm install
   ```
2. Ajuste o `.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   VITE_APP_URL=http://localhost:5173
   ```
   Ou aponte para as URLs de produção hospedadas.
3. Plataformas padrão:
   - Desenvolvimento: `npm run dev` (usa Vite).
   - Build: `npm run build`.
   - Testes: `npm run test` (Vitest).
   - Lint: `npm run lint`.

### Conexão com a API

- As chamadas HTTP usam `API_BASE_URL` calculado em `frontend/src/config/api.ts`. Garanta que `VITE_API_URL` termine em `/api`.
- O frontend consome rotas como `GET /api/events`, `POST /api/inscriptions/start`, `GET /api/admin/...` (autenticadas via token JWT).
- A autenticação armazena o token no Pinia e o injeta nos headers via `useApi` (`frontend/src/composables/useApi.ts`).

## Endpoints principais

A API exposta está detalhada em `backend/src/routes/index.ts`. Os principais caminhos são:

- **Públicos**: `/system/config`, `/events`, `/inscriptions/start`, `/orders/pending`, `/payments/...`, `/receipts/...`, `/checkin/...`, catálogos (districts/churches/ministries), Webhook Mercado Pago.
- **Admin**: `/admin/login`, `/admin/password/recover`, CRUD completo de districts/ministries/users/profiles/churches/events/orders/registrations/checkin/expenses/financial`.

Para uma visão completa em Markdown ou Postman, consulte `docs/eventos-ipitinga.postman_collection.json`.

## Documentação adicional

- `docs/eventos-ipitinga.postman_collection.json`: coleção Postman/Insomnia com todas as rotas HTTP e payloads.
- Os controladores descritos em `backend/src/modules/*/*.controller.ts` usam `zod` para validar os campos de corpo/payload.

## Sugestões de fluxo

1. Incluir credenciais válidas no backend `.env`.
2. Rodar `npm run prisma:generate` e `npm run prisma:seed`.
3. Subir backend (`npm run dev` / `npm run start`), depois frontend (`npm run dev`).
4. Use `/admin/login` para obter o token e interaja com rotas protegidas.

## Contato

Caso precise de ajuda com as variáveis de produção (chaves Mercado Pago, SMTP ou banco) consulte o time responsável ou revise o README interno da organização.
