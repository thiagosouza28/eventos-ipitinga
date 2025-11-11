# Deploy do backend no Render

Este projeto já traz um `render.yaml` pronto para criar o serviço `CATRE Ipitinga Backend` (Node + Express) mantendo o código dentro da pasta `backend`. O Render irá compilar o TypeScript, gerar os artefatos em `dist` e expor a API em `https://<service>.onrender.com/api`.

## Serviço web recomendado

1. Faça o link do repositório com o Render e adicione o `render.yaml`.
2. O serviço usa `root: backend`, `buildCommand: npm run build` e `startCommand: npm run start`.
3. O Render já define `PORT` dinamicamente; o backend lê essa variável com prioridade sobre o `PORT` do `.env`.
4. O `NODE_ENV` é fixado em `production` no `render.yaml`, mas você pode sobrescrever caso precise de outro valor em ambientes especiais.
5. O backend roda a rotina `prisma migrate deploy` na inicialização graças ao `ensureDatabaseSchema`, então sempre que o deploy for bem-sucedido as migrações serão aplicadas automaticamente.

## Banco de dados MySQL

1. Use o bloco `databases` do `render.yaml` para provisionar um banco MySQL (starter ou hobby).
2. O Render exporta a variável `DATABASE_URL` com os dados do banco, basta colar esse valor nas variáveis de ambiente do serviço.
3. Garanta que o banco esteja no charset/collation corretos e execute `npm run prisma:seed` localmente para carregar dados iniciais antes do primeiro deploy.

## Variáveis de ambiente essenciais

| Chave | O que faz | Exemplo |
| --- | --- | --- |
| `APP_URL` | URL pública do frontend/portal público. Use `https://<front>.onrender.app` ou o domínio definitivo. | `https://eventos-ipitinga.onrender.app` |
| `API_URL` | Url da API (`APP_URL` + `/api`). Serve para assinar QR Codes e gerar links. | `https://catre-backend.onrender.com/api` |
| `DATABASE_URL` | String do MySQL fornecida pelo Render. | `mysql://...` |
| `JWT_SECRET` | Segredo mínimo de 32 caracteres para emitir tokens. | `uma-senha-super-segura-32+chars` |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciais da sua conta Mercado Pago. |  |
| `MP_WEBHOOK_PUBLIC_URL` | URL pública que o Mercado Pago chama (`https://<service>.onrender.com/api/webhooks/mercadopago`). | `https://catre-backend.onrender.com/api/webhooks/mercadopago` |
| `STORAGE_DRIVER` | Defina `supabase`, `s3` ou `in-memory`. Em produção, use Supabase/S3 e configure as credenciais correspondentes. | `supabase` |
| `CORS_ORIGINS` | Domínios autorizados (frontend + outros serviços). Separe por vírgula. | `https://eventos-ipitinga.onrender.app,https://cms-ipitinga.onrender.app` |
| `PDF_SIGN_SECRET`, `HMAC_SECRET` | Segredos usados nas assinaturas de recibos/QR Codes. | `secret-qr-123` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Primeiro acesso administrativo; pode ser trocado após login. | `admin@catre.local` |

Além dessas, mantenha `RATE_LIMIT`/`CRON_CANCEL_EXPIRED` conforme orientação do código se quiser ajustar os limites no Render.

## Webhooks e notificações

- Configure o webhook do Mercado Pago usando `MP_WEBHOOK_PUBLIC_URL`. Ele deve apontar para `https://<service>.onrender.com/api/webhooks/mercadopago`.
- Caso precise do webhook em múltiplas contas (teste/produ), use as mesmas variáveis `MP_WEBHOOK_SECRET` e `MP_ACCESS_TOKEN` específicas para cada projeto no Render (ambiente `branch` diferente).

## Considerações operacionais

- O backend gera PDFs via Playwright; o `postinstall` já executa `npm run playwright:install`, mas o Render disponibiliza as dependências do Chromium automaticamente.
- O diretório `tmp/` é efêmero: troque o `STORAGE_DRIVER` para `supabase` ou `s3` para receber arquivos (fotos e recibos) com persistência real.
- Logs e eventos ficam disponíveis no painel do Render. Procure por `stdout`/`stderr` para entender falhas de deploy, migrations e jobs agendados.

## Próximos passos

1. Lance o frontend (Vite) em um serviço estático separado no Render, Vercel, Netlify etc. Configure `VITE_API_URL` apontando para o domínio do backend.
2. Depois de testar localmente, rode `npm run build:backend` e `npm run build:frontend` para gerar os artefatos e garantir que o render também consegue construir sem erros.
3. Mantenha as credenciais sensíveis (JWT, Mercado Pago, Supabase/S3) fora do controle de versão usando apenas as variáveis de ambiente do Render.
