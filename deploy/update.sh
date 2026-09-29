#!/usr/bin/env bash
# Pull the latest code from GitHub and restart the services.
# Run from the project folder on the server:  bash deploy/update.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies"
for s in auth-service family-service health-service api-gateway; do
  (cd "$s" && (npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund))
done

echo "==> Restarting services"
sudo docker compose up -d mysql redis
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
pm2 status
