# Deploy do backend em maquina virtual (AWS EC2)

Este guia cobre todas as etapas para executar o backend do CATRE Ipitinga em uma instancia EC2 (Ubuntu 22.04) usando um banco MySQL hospedado na AWS (RDS ou Aurora). Inclui os comandos para provisionar dependencias, construir o projeto, aplicar migracoes Prisma e expor o servico via `systemd`.

> Adapte nomes de usuario, caminhos e portas conforme o padrao da sua infraestrutura. Os exemplos abaixo assumem que os arquivos estao clonados em `/opt/catre-ipitinga`.

---

## 1. Provisionar infraestrutura

- **Banco de dados**: crie um MySQL 8.0 (RDS/Aurora) com collation `utf8mb4_unicode_ci`. Autorize a porta 3306 a partir do security group da EC2.
- **Instancia EC2**: Ubuntu 22.04 LTS t3.small (ou superior), disco de pelo menos 20 GB e security group liberando 22 (SSH), 80/443 (HTTP/HTTPS) e 3001 (API direta, opcional).
- Associe um Elastic IP e configure registros DNS para apontar para o IP publico.

## 2. Preparar o sistema operacional

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git build-essential unzip mysql-client

# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v
npm -v
```

Opcional: instale utilitarios como `nginx` (reverse proxy) e `certbot` para HTTPS.

## 3. Clonar o projeto e configurar variaveis

```bash
sudo mkdir -p /opt/catre-ipitinga
sudo chown $USER:$USER /opt/catre-ipitinga
cd /opt/catre-ipitinga

git clone https://github.com/<sua-org>/catre-ipitinga.git .

# Copie o template e ajuste as variaveis
cp .env.example backend/.env
nano backend/.env
```

Valores indispensaveis:

| Variavel | Descricao |
| --- | --- |
| `DATABASE_URL` | `mysql://usuario:senha@host:3306/catre_db?sslaccept=strict` (use `sslaccept=strict` para RDS). |
| `APP_URL` / `API_URL` | URLs publicas (ex.: `https://eventos.catredominio.com` e `https://api.catredominio.com/api`). |
| `JWT_SECRET`, `PDF_SIGN_SECRET`, `HMAC_SECRET` | Segredos fortes (>= 32 caracteres). |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciais do Mercado Pago. |
| `STORAGE_DRIVER` + credenciais (`supabase` ou `s3`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Primeiro usuario administrador. |
| `MP_WEBHOOK_PUBLIC_URL` | `https://api.catredominio.com/api/webhooks/mercadopago`. |

> Em ambientes de producao mantenha o arquivo `backend/.env` fora de commits (ja esta no `.gitignore`).

## 4. Construir e aplicar migracoes

```bash
cd /opt/catre-ipitinga/backend

npm ci
npm run build
```

O `npm run build` executa automaticamente `prisma generate` e `prisma migrate deploy`, gerando `dist/` pronto para produção.

## 5. Subir o backend manualmente (teste rapido)

```bash
cd /opt/catre-ipitinga/backend
PORT=3001 NODE_ENV=production npm run start:prod
```

A API ficara disponivel em `http://0.0.0.0:3001/api`. Interrompa com `Ctrl+C` apos validar.

Para processos em segundo plano/PM2:

```bash
pm2 start dist/main.js --name api
```

## 6. Configurar servico systemd

Crie `/etc/systemd/system/catre-backend.service`:

```ini
[Unit]
Description=CATRE Ipitinga Backend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/catre-ipitinga/backend
Environment=NODE_ENV=production
Environment=PORT=3001
EnvironmentFile=/opt/catre-ipitinga/backend/.env
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ative o servico:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now catre-backend
sudo systemctl status catre-backend
```

Logs em tempo real:

```bash
sudo journalctl -u catre-backend -f
```

## 7. Script de deploy e atualizacao

O repositorio inclui `scripts/aws/deploy-backend.sh`, que aplica as etapas de build/migracao e reinicia o servico:

```bash
cd /opt/catre-ipitinga
chmod +x scripts/aws/deploy-backend.sh

SERVICE_NAME=catre-backend ./scripts/aws/deploy-backend.sh
```

O script assume que `backend/.env` existe e reinicia o servico via `systemctl`. Use-o apos `git pull` para atualizar o backend em segundos (ou reinicie com `pm2 restart api` se estiver usando o process manager).

## 8. Checklist pos-deploy

- Abra a porta 443 no security group e configure HTTPS (Nginx + Certbot).
- Atualize o webhook do Mercado Pago com a URL publica exposta pelo proxy/reverso.
- Execute `npm run prisma:seed` apenas no primeiro deploy se quiser dados de demonstracao.
- Monitore `journalctl` e os alarmes da AWS (CPU, disco, memoria) para detectar gargalos.

Com esses comandos o backend estara pronto para operar em uma maquina virtual da AWS com atualizacoes rapidas diretamente no console.
