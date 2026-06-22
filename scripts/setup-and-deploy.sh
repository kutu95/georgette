#!/usr/bin/env bash
# One-time setup: copy deploy SSH key to the home server, then run deploy.
# You will be prompted for your Ubuntu server password once.
set -euo pipefail

SERVER_HOST="${DEPLOY_HOST:-192.168.0.146}"
SERVER_USER="${DEPLOY_USER:-john}"
KEY="$HOME/.ssh/georgette_deploy"

if [[ ! -f "${KEY}" ]]; then
  ssh-keygen -t ed25519 -f "${KEY}" -N "" -C "georgette-research-deploy"
fi

echo "==> Installing SSH key on ${SERVER_USER}@${SERVER_HOST}"
echo "    Enter your server password when prompted (runs in your terminal)."
ssh-copy-id -i "${KEY}.pub" -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no "${SERVER_USER}@${SERVER_HOST}"

echo "==> Deploying Georgette Research"
DEPLOY_HOST="${SERVER_HOST}" DEPLOY_USER="${SERVER_USER}" SSH_IDENTITY_FILE="${KEY}" \
  bash "$(dirname "$0")/deploy-server.sh" --remote

echo "==> Done. Open https://georgette.margies.app"
