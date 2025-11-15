#!/usr/bin/env bash

# Automates backend deploy steps (install deps, build, migrate, restart service).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
SERVICE_NAME="${SERVICE_NAME:-catre-backend}"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Nao foi possivel localizar a pasta backend em ${BACKEND_DIR}." >&2
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Crie o arquivo ${BACKEND_DIR}/.env antes de rodar o deploy (copie de docs/aws-ec2-backend.md)." >&2
  exit 1
fi

pushd "$BACKEND_DIR" >/dev/null

echo "Instalando dependencias do backend..."
npm ci

echo "Construindo artefatos de producao..."
npm run build

popd >/dev/null

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  echo "Reiniciando servico systemd ${SERVICE_NAME}..."
  sudo systemctl restart "${SERVICE_NAME}"
  sudo systemctl status "${SERVICE_NAME}" --no-pager --lines 10
else
  cat <<'EOF'
Servico systemd nao encontrado ou systemctl indisponivel.
Para iniciar manualmente execute (ja dentro de backend/):
  PORT=3001 NODE_ENV=production npm run start:prod
ou inicie via PM2:
  pm2 start dist/main.js --name api
EOF
fi
