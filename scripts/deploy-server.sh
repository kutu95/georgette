#!/usr/bin/env bash
# Deploy Georgette Research Manager on the home server (192.168.0.146).
# Usage:
#   ./scripts/deploy-server.sh              # run ON the server
#   ./scripts/deploy-server.sh --remote     # SSH from your Mac and deploy
#   ./scripts/setup-and-deploy.sh           # first-time: SSH key + deploy
set -euo pipefail

APP_DIR="/var/www/georgette-research"
REPO_URL="https://github.com/kutu95/georgette.git"
APP_PORT="3010"
SERVER_HOST="${DEPLOY_HOST:-192.168.0.146}"
SERVER_USER="${DEPLOY_USER:-john}"
SSH_IDENTITY="${SSH_IDENTITY_FILE:-$HOME/.ssh/georgette_deploy}"
SSH_OPTS=(-o StrictHostKeyChecking=no)
if [[ -f "${SSH_IDENTITY}" ]]; then
  SSH_OPTS+=(-i "${SSH_IDENTITY}")
fi

deploy_on_server() {
  echo "==> Deploying Georgette Research in ${APP_DIR}"

  if [[ ! -d "${APP_DIR}/.git" ]]; then
    sudo mkdir -p /var/www
    sudo git clone "${REPO_URL}" "${APP_DIR}"
    sudo chown -R "${USER}:${USER}" "${APP_DIR}"
  fi

  cd "${APP_DIR}"
  git pull --ff-only origin main

  if [[ ! -f .env ]]; then
    cp .env.production.example .env
    echo "Created .env from .env.production.example — review DATABASE_URL if needed."
  fi

  npm install
  npm run db:migrate
  npm run build

  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete georgette-research 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
  else
    echo "PM2 not installed. Install with: sudo npm install -g pm2"
    exit 1
  fi

  echo "==> Verifying app on port ${APP_PORT}"
  curl -sf "http://127.0.0.1:${APP_PORT}/api/health" | head -c 200
  echo
  echo "==> Done. Configure Cloudflare tunnel for georgette.margies.app → localhost:${APP_PORT}"
}

if [[ "${1:-}" == "--remote" ]]; then
  ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "bash -s" <<'REMOTE'
set -euo pipefail
APP_DIR="/var/www/georgette-research"
REPO_URL="https://github.com/kutu95/georgette.git"
APP_PORT="3010"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo mkdir -p /var/www
  sudo git clone "${REPO_URL}" "${APP_DIR}"
  sudo chown -R "${USER}:${USER}" "${APP_DIR}"
fi

cd "${APP_DIR}"
git pull --ff-only origin main

if [[ ! -f .env ]]; then
  cp .env.production.example .env
fi

npm install
npm run db:migrate
npm run build

pm2 delete georgette-research 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

curl -sf "http://127.0.0.1:${APP_PORT}/api/health"
echo

# Ensure Cloudflare tunnel routes georgette.margies.app → this app
if [[ -f /etc/cloudflared/config.yml ]] && ! grep -q "georgette.margies.app" /etc/cloudflared/config.yml; then
  echo "NOTE: Add georgette.margies.app → http://127.0.0.1:3010 to /etc/cloudflared/config.yml"
  echo "      See deploy/cloudflared-georgette.yml in the repo, then: sudo systemctl restart cloudflared"
fi
REMOTE
else
  deploy_on_server
fi
