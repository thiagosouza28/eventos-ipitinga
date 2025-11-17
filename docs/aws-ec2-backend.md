# Deploy do backend no AWS (EC2 + RDS)

Este guia mostra como preparar uma instância EC2 (Ubuntu 22.04) para executar o backend do CATRE Ipitinga conectado a um banco MySQL hospedado na AWS (RDS/Aurora). Inclui pré‑requisitos, configuração do `.env`, build e automação de deploy.

> Adapte caminhos e usuários conforme sua infraestrutura. Os exemplos assumem que o código foi clonado em `/opt/eventos-ipitinga`.

---

## 1. Provisionar infraestrutura

- **Banco de dados**: MySQL 8.0 (RDS/Aurora) com collation `utf8mb4_unicode_ci`. Libere a porta 3306 para o security group da EC2.
- **EC2**: Ubuntu 22.04 LTS (t3.small ou superior), disco ≥ 20 GB, security group liberando 22 (SSH), 80/443 (HTTP/HTTPS) e 9001 (porta interna da API, caso queira expor diretamente).
- Associe Elastic IP e configure o DNS (`api.seudominio.com`, por exemplo).

## 2. Preparar a instância

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git build-essential unzip mysql-client

# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v   # 20.x
npm -v
```

Opcional: instale `nginx` + `certbot` para TLS.

## 3. Clonar o projeto e configurar o `.env`

```bash
sudo mkdir -p /opt/eventos-ipitinga
sudo chown $USER:$USER /opt/eventos-ipitinga
cd /opt/eventos-ipitinga

git clone https://github.com/<sua-org>/eventos-ipitinga.git .

cp backend/.env backend/.env.backup.$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
cp backend/.env backend/.env.sample 2>/dev/null || true
```

Edite `backend/.env` com valores reais:

| Variável | Descrição |
| --- | --- |
| `APP_URL` | URL pública do frontend (ex.: `https://eventos.seudominio.com`). |
| `API_URL` | URL pública da API (`https://api.seudominio.com/api`). |
| `PORT` | Porta interna (ex.: `9001`). |
| `DATABASE_URL` | `mysql://usuario:senha@host:3306/banco?sslaccept=strict`. |
| `JWT_SECRET`, `PDF_SIGN_SECRET`, `HMAC_SECRET` | Segredos com ≥32 caracteres. |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciais do Mercado Pago. |
| `STORAGE_DRIVER` + credenciais (`supabase` ou `s3`). |
| `CORS_ORIGINS` | URLs autorizadas (frontend, Admin, etc.). |
| `MP_WEBHOOK_PUBLIC_URL` | `https://api.seudominio.com/api/webhooks/mercadopago`. |

> Nunca faça commit do `.env`. Ele já está no `.gitignore`.

## 4. Build e migrações

```bash
cd /opt/eventos-ipitinga/backend
npm ci
npm run build
```

O `build` executa `prisma generate`, `prisma migrate deploy` e copia o Prisma Client para `dist/`.

## 5. Teste manual

```bash
PORT=9001 NODE_ENV=production npm run start:prod
```

A API responderá em `http://<ip>:9001/api`. Use `Ctrl+C` ao finalizar.

## 6. Configurar systemd

Crie `/etc/systemd/system/catre-backend.service`:

```ini
[Unit]
Description=CATRE Ipitinga Backend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/eventos-ipitinga/backend
Environment=NODE_ENV=production
Environment=PORT=9001
EnvironmentFile=/opt/eventos-ipitinga/backend/.env
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ative e monitore:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now catre-backend
sudo systemctl status catre-backend
sudo journalctl -fu catre-backend
```

## 7. Nginx + HTTPS (proxy reverso)

1. **Instale e habilite o Nginx**:

   ```bash
   sudo apt-get install -y nginx
   sudo systemctl enable --now nginx
   ```

2. **Crie o host virtual** `/etc/nginx/sites-available/catre-backend` apontando para o backend interno (ajuste domínio/porta conforme necessidade):

   ```nginx
   server {
     listen 80;
     server_name api.seudominio.com;

     location / {
       proxy_pass http://127.0.0.1:9001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

   Ative o site e recarregue o Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/catre-backend /etc/nginx/sites-enabled/catre-backend
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Emitir certificados TLS** com Certbot (modo Nginx):

   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.seudominio.com
   ```

   O Certbot ajusta o bloco para escutar em `443 ssl` e cria o redirecionamento 80 → 443 automaticamente. Verifique se o `proxy_pass` continua em `http://127.0.0.1:9001` ou na porta configurada no `.env`.

4. **Atualize as variáveis** `APP_URL` / `API_URL` (backend) e `VITE_APP_URL` / `VITE_API_URL` (frontend) para `https://api.seudominio.com`. Reinicie o serviço `catre-backend` e o build/servidor do frontend para usar as novas URLs.

## 8. Script de deploy

O repositório inclui `scripts/aws/deploy-backend.sh` que automatiza `npm ci`, `npm run build` e reinicia o serviço:

```bash
cd /opt/eventos-ipitinga
chmod +x scripts/aws/deploy-backend.sh
SERVICE_NAME=catre-backend ./scripts/aws/deploy-backend.sh
```

Use sempre após `git pull` para atualizar o backend. Caso não utilize systemd, adapte o trecho final (o script mostra instruções para PM2 ou execução manual).

## 9. Checklist pós-deploy

- Configure `nginx` + Certbot conforme a seção anterior.
- Atualize o webhook do Mercado Pago para a URL HTTPS definitiva.
- Execute `npm run prisma:seed` apenas se precisar de dados de exemplo.
- Habilite monitoração (CloudWatch, alarms de CPU/disco, uptime) e backups do RDS.

Seguindo estes passos o backend estará pronto para produção em uma instância EC2 com banco na AWS.
