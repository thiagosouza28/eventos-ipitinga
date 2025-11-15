# CATRE Ipitinga ÔÇö Sistema de Inscri├º├Áes

Aplica├º├úo completa (backend + frontend) para gerenciar inscri├º├Áes de eventos da igreja CATRE Ipitinga com pagamentos Mercado Pago, recibos em PDF com QR Code e check-in presencial.

## Sum├írio

- [Principais recursos](#principais-recursos)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Configura├º├úo inicial](#configura├º├úo-inicial)
- [Vari├íveis de ambiente](#vari├íveis-de-ambiente)
- [Executando a aplica├º├úo](#executando-a-aplica├º├úo)
- [Banco de dados & Prisma](#banco-de-dados--prisma)
- [Pagamentos com Mercado Pago](#pagamentos-com-mercado-pago)
- [Fluxos cr├¡ticos](#fluxos-cr├¡ticos)
- [Testes](#testes)
- [Documenta├º├úo da API](#documenta├º├úo-da-api)
- [Seeds de exemplo](#seeds-de-exemplo)
- [Deploy na AWS (EC2)](#deploy-na-aws-ec2)
- [Deploy no Render](#deploy-no-render)
- [Próximos passos sugeridos](#próximos-passos-sugeridos)

## Principais recursos

- Inscri├º├Áes em lote com um ├║nico pagamento (PIX ou Cart├úo via Mercado Pago).
- Recupera├º├úo autom├ítica de pedidos pendentes pelo CPF do comprador.
- Painel administrativo com RBAC (`AdminGeral`, `AdminDistrital`, `DiretorLocal`, `Tesoureiro`).
- CRUD de eventos, distritos, igrejas e gest├úo de inscri├º├Áes/pedidos.
- Estorno parcial por inscri├º├úo mantendo o restante do pedido ativo.
- Recibos individuais em PDF com QR Code para check-in e verifica├º├úo por token.
- P├ígina p├║blica para consulta de comprovantes (CPF + data de nascimento).
- Check-in via leitura de QR Code ou busca manual.
- Webhook Mercado Pago idempotente com trilha de auditoria.
- Job autom├ítico para expira├º├úo/cancelamento de pedidos vencidos.
- Logs com mascaramento de CPF e registros de auditoria.

## Arquitetura

- **Frontend**: Vue 3 + Vite + TypeScript + TailwindCSS.
- **Backend**: Node.js + Express + TypeScript + Prisma ORM.
- **Banco de dados**: MySQL 8 (Docker incluso ou RDS).
- **Pagamentos**: Mercado Pago (Prefer├¬ncias, webhook, estorno parcial).
- **PDF/QR**: Playwright + `qrcode`.
- **Armazenamento de fotos**: Servi├ºo abstrato (Supabase/S3 simulados em disco local).
- **Autentica├º├úo**: JWT + RBAC baseado em roles.
- **Logs/observabilidade**: Pino + auditoria em tabela dedicada.

## Estrutura de pastas

```
Ôö£ÔöÇÔöÇ backend            # API Express + Prisma
Ôöé   Ôö£ÔöÇÔöÇ prisma         # Schema, migra├º├úo e seed
Ôöé   ÔööÔöÇÔöÇ src            # C├│digo-fonte (m├│dulos, servi├ºos, jobs, pdf etc.)
Ôö£ÔöÇÔöÇ frontend           # Aplica├º├úo Vue 3 + Tailwind
Ôöé   ÔööÔöÇÔöÇ src            # P├íginas p├║blicas/admin, stores e componentes
Ôö£ÔöÇÔöÇ docker-compose.yml # MySQL local
Ôö£ÔöÇÔöÇ .env.example
ÔööÔöÇÔöÇ README.md
```

## Configura├º├úo inicial

1. **Instale depend├¬ncias** (necess├írio ter Node 18+):

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

3. **Inicie o MySQL via Docker**:

   ```bash
   docker compose up -d db
   ```

4. **Rode as migra├º├Áes e gere o Prisma Client**:

   ```bash
   npm --workspace backend run prisma:generate
   npm --workspace backend run prisma:migrate
   npm --workspace backend run prisma:seed
   ```

   > A seed cria usu├írios de exemplo (Admin geral, distrital, diretores locais e tesouraria) usando o email/senha configurados em `.env`, al├®m dos dados b├ísicos.

## Vari├íveis de ambiente

O arquivo `.env.example` traz todos os valores necess├írios com descri├º├Áes. Ajuste os seguintes pontos antes de colocar em produ├º├úo:

- `DATABASE_URL`: URL do MySQL (RDS, PlanetScale, Render etc.).
- `JWT_SECRET`: m├¡nimo 32 caracteres.
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_INTEGRATOR_ID`: credenciais da conta Mercado Pago.
- `SUPABASE_...` ou `S3_...`: credenciais do provedor de armazenamento (caso substitua o driver local).
- `PDF_SIGN_SECRET`, `HMAC_SECRET`: usados na assinatura de recibos e QR Code.
- `APP_URL`, `API_URL`: apontam para o endere├ºo p├║blico das aplica├º├Áes.

## Executando a aplica├º├úo

### Ambiente de desenvolvimento (hot reload completo)

```bash
npm run dev
```

- API: http://localhost:3001 (Swagger dispon├¡vel em `backend/openapi.json`).
- Frontend: http://localhost:5173

> Rodar via `npm run dev` executa backend + frontend em paralelo (usar `npm run dev:backend` ou `npm run dev:frontend` para processos isolados).

### Build de produ├º├úo

```bash
npm run build
```

Os artefatos s├úo gerados em `backend/dist` e `frontend/dist`.

## Banco de dados & Prisma

- Schema: `backend/src/prisma/schema.prisma`
- Migra├º├úo inicial: `backend/src/prisma/migrations/0001_init/migration.sql`
- Seed: `backend/src/prisma/seed.ts`

Comandos ├║teis:

```bash
npm --workspace backend run prisma:generate   # gerar Prisma Client
npm --workspace backend run prisma:migrate   # aplicar migra├º├Áes localmente
npm --workspace backend run prisma:deploy    # aplicar migra├º├Áes em produ├º├úo
npm --workspace backend run prisma:seed      # inserir dados iniciais
```

## Pagamentos com Mercado Pago

1. Crie uma aplica├º├úo no Mercado Pago e configure:
   - Access token de teste ou produ├º├úo (`MP_ACCESS_TOKEN`).
   - Webhook apontando para `https://SEU_DOMINIO/api/webhooks/mercadopago`.
   - Assinatura secreta (`MP_WEBHOOK_SECRET`) para validar requests.
2. O backend cria uma **Prefer├¬ncia** com um item por inscri├º├úo, o que permite estornos parciais.
3. Metadados enviados ao MP: `orderId`, `registrationIds`, `buyerCpf`.
4. O webhook busca o pagamento pela `external_reference` (ID do pedido) e atualiza status localmente.
5. Estornos parciais s├úo disparados via `POST /api/admin/registrations/:id/refund`.

## Fluxos cr├¡ticos

### Inscri├º├úo p├║blica

1. Usu├írio acessa `/evento/:slug`.
2. Informa CPF do comprador ÔåÆ sistema verifica pedidos pendentes e redireciona se existir.
3. Informa n├║mero de inscri├º├Áes e preenche dados (foto opcional, distrito/igreja filtrados).
4. Pedido ├® criado como `PENDING` e prefer├¬ncia Mercado Pago gerada.
5. Webhook confirma `PAID` e recibos PDF s├úo gerados automaticamente (armazenados em `tmp/receipts`).

### Retomada de pedido pendente

- Endpoint `POST /api/inscriptions/start` retorna `orderPending` com dados do pagamento.
- O frontend redireciona para `/evento/:slug/pagamento/:orderId`.
- Se a prefer├¬ncia expirar, o backend gera uma nova mantendo `external_reference`.

### Estorno parcial

1. Admin (role Tesoureiro ou AdminGeral) aciona `POST /api/admin/registrations/:id/refund`.
2. O backend chama `paymentService.refundRegistration` com o valor da inscri├º├úo.
3. Registro muda para `REFUNDED` e pedido para `PARTIALLY_REFUNDED`. Auditoria ├® registrada.

### Check-in

- Recibos possuem QR Code com URL assinada (`/checkin/validate?rid=...&sig=...`).
- Check-in pode ser realizado via QR Code (webcam) ou busca manual (CPF + nascimento).
- Apenas inscri├º├Áes `PAID` s├úo aceitas; ao confirmar, status vai para `CHECKED_IN`.

## Testes

Backend:

```bash
npm --workspace backend run test
```

- **Integra├º├úo**: `test/integration/fullflow.spec.ts` cobre cria├º├úo de pedido, pagamento, check-in e estorno parcial (depend├¬ncias externas mockadas).
- **Unit├írios**: utilit├írios de CPF/HMAC e idempot├¬ncia de webhook.

Frontend:

```bash
npm --workspace frontend run test
```

- Teste de utilit├írio (`src/utils/__tests__/format.spec.ts`) garante formatos b├ísicos.

## Documenta├º├úo da API

- Arquivo OpenAPI em `backend/src/openapi/openapi.json`.
- Gera├º├úo r├ípida para distribui├º├úo:

  ```bash
  npm --workspace backend run openapi
  # arquivo exportado em backend/openapi.json
  ```

## Seeds de exemplo
- [Deploy na AWS (EC2)](#deploy-na-aws-ec2)

Ap├│s rodar `npm --workspace backend run prisma:seed` voc├¬ ter├í:

- Usu├írios admin/Distrital/Diretor/Tesouraria (todos usam a senha `ADMIN_PASSWORD` do `.env`):
  - `Admin Geral` (`AdminGeral`): email definido em `ADMIN_EMAIL`.
  - `distrital.norte@catre.local` (`AdminDistrital`) - associado ao Distrito Norte.
  - `distrital.sul@catre.local` (`AdminDistrital`) - associado ao Distrito Sul.
  - `diretora.central@catre.local` (`DiretorLocal`) - associado ├á Igreja Central.
  - `diretora.esperanca@catre.local` (`DiretorLocal`) - associado ├á Igreja Esperan├ºa.
  - `tesouraria@catre.local` (`Tesoureiro`).
- Distritos: "Distrito Norte", "Distrito Sul"
- Igrejas: "Igreja Central", "Igreja Esperan├ºa"
- Minist├®rios: "Ministerio Jovem" (ativo) e "Ministerio de Musica" (ativo)
- Evento: "Retiro Espiritual 2025" (`slug: retiro-espiritual-2025`) vinculado ao Minist├®rio Jovem

> Em desenvolvimento, fa├ºa login com esse usu├írio via `/admin`.

## Deploy na AWS (EC2)

- O documento `docs/aws-ec2-backend.md` detalha como preparar uma instancia EC2/Ubuntu, instalar Node 20, conectar no MySQL/RDS e liberar o backend via `systemd`.
- O guia lista os comandos de console (apt, git clone, npm ci, npm run build) e traz um exemplo de unit file pronto.
- O script `scripts/aws/deploy-backend.sh` automatiza a atualizacao (deps + build + restart) via `SERVICE_NAME=catre-backend ./scripts/aws/deploy-backend.sh`.
- Apos gerar o build execute `pm2 start dist/main.js --name api` (ou habilite o servico systemd sugerido).

## Deploy no Render

- O arquivo `render.yaml` j´┐¢ configura o servi´┐¢o `CATRE Ipitinga Backend` com Node/Express e um banco MySQL Starter. O Render respeita o `root: backend` e usa os comandos `npm run build` e `npm run start`.
- As etapas completas (vari´┐¢veis de ambiente, URLs, webhook e rotinas de observabilidade) est´┐¢o documentadas em `docs/render-backend.md`. Mantenha segredos (JWT, Mercado Pago, Supabase/S3) apenas no painel do Render e sincronize o `API_URL` com `https://<seu-backend>.onrender.com/api`.

## Pr├│ximos passos sugeridos

1. Configurar armazenamento real de fotos (Supabase Storage ou S3) e atualizar `STORAGE_DRIVER`.
2. Hospedar o backend atr├ís de HTTPS (necess├írio para Playwright + captura da webcam).
3. Publicar frontend est├ítico e apontar `VITE_API_URL`.
4. Automatizar deploy (CI/CD) executando testes, lint e migra├º├Áes.
5. Habilitar monitoramento/log centralizado (ex.: Logflare, Datadog) se for rodar em produ├º├úo.

---

Feito com ÔØñ´©Å para agilizar a gest├úo dos retiros do CATRE Ipitinga. Qualquer d├║vida ou melhoria, abra uma issue ou contribua!


