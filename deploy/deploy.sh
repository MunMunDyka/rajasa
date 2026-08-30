#!/usr/bin/env bash
#
# Deploy the current branch. Run on the server:
#
#   bash /srv/rkl/app/deploy/deploy.sh
#
# Safe to re-run. It never touches /srv/rkl/uploads and never writes .env.

set -euo pipefail

APP_DIR=/srv/rkl/app
WEB_DIR="${APP_DIR}/frontend"

cd "${APP_DIR}"

echo "==> Menarik perubahan"
git pull --ff-only

cd "${WEB_DIR}"

if [ ! -f .env ]; then
  echo "GAGAL: ${WEB_DIR}/.env tidak ada. Lihat deploy/README.md." >&2
  exit 1
fi

echo "==> Dependensi"
# npm ci, not npm install: it installs exactly what package-lock.json pins, so
# a deploy can never quietly pick up a different version than the one tested.
npm ci

echo "==> Migrasi database"
# migrate deploy, not migrate dev: it only applies existing migrations and will
# never generate a new one or prompt to reset the database.
npx prisma migrate deploy

echo "==> Build"
npm run build

echo "==> Restart"
if pm2 describe rkl >/dev/null 2>&1; then
  pm2 reload rkl --update-env
else
  pm2 start "${APP_DIR}/deploy/ecosystem.config.js"
  pm2 save
  echo "  Jalankan sekali agar hidup lagi setelah reboot: pm2 startup"
fi

echo "==> Cek"
sleep 3
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login || echo 000)
if [ "${CODE}" = "200" ]; then
  echo "  /login menjawab 200. Deploy selesai."
else
  echo "  PERINGATAN: /login menjawab ${CODE}. Cek: pm2 logs rkl --lines 50" >&2
  exit 1
fi
