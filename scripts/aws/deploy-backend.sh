#!/usr/bin/env bash

# Automatiza o deploy do backend no servidor (install, build, migracao, restart).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
SERVICE_NAME="${SERVICE_NAME:-catre-backend}"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Nao foi possivel localizar backend/ em ${BACKEND_DIR}" >&2
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Crie o arquivo ${BACKEND_DIR}/.env antes de realizar o deploy." >&2
  exit 1
fi

pushd "$BACKEND_DIR" >/dev/null

echo "[deploy] Instalando dependencias (npm ci)..."
npm ci

echo "[deploy] Construindo e aplicando migracoes (npm run build)..."
npm run build

popd >/dev/null

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  echo "[deploy] Reiniciando servico systemd ${SERVICE_NAME}..."
  sudo systemctl restart "${SERVICE_NAME}"
  sudo systemctl status "${SERVICE_NAME}" --no-pager --lines 10
else
  cat <<'EOF'
[deploy] Servico systemd nao encontrado ou systemctl indisponivel.
Inicie manualmente executando (dentro de backend/):
  PORT=${PORT:-9001} NODE_ENV=production npm run start:prod

Ou utilize PM2:
  pm2 restart api || pm2 start dist/main.js --name api
EOF
fi
