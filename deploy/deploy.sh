#!/usr/bin/env bash
#
# Deploy the current branch. Run on the server:
#
#   bash /srv/rkl/app/deploy/deploy.sh
#
# Safe to re-run. It never touches /srv/rkl/uploads and never writes .env.

set -euo pipefail

# Deliberately NOT run with sudo. PM2 tracks processes per user: start the app
# as root once and every later deploy as the normal user will fail to find it,
# leaving two copies fighting over port 3000. Running the web process as root
# is also a bad idea in its own right.
if [ "$(id -u)" -eq 0 ]; then
  echo "Jangan jalankan dengan sudo. Jalankan sebagai pemilik /srv/rkl." >&2
  exit 1
fi

APP_DIR=/srv/rkl/app
WEB_DIR="${APP_DIR}/frontend"

cd "${APP_DIR}"

echo "==> Menarik perubahan"
# Discard any local change to the lockfile before pulling. npm install below
# may rewrite it with Linux-specific optional packages, and a dirty lockfile
# would make the next --ff-only pull refuse to run.
git checkout -- frontend/package-lock.json 2>/dev/null || true
git pull --ff-only

cd "${WEB_DIR}"

if [ ! -f .env ]; then
  echo "GAGAL: ${WEB_DIR}/.env tidak ada. Lihat deploy/README.md." >&2
  exit 1
fi

echo "==> Dependensi"
# npm ci first: it installs exactly what package-lock.json pins, so a deploy
# cannot quietly pick up a version that was never tested.
#
# It can legitimately fail here though. npm records platform-specific optional
# packages for the machine that generated the lock, so a lockfile written on
# Windows is missing the Linux-only variants (sharp pulls @emnapi/* on Linux).
# npm ci refuses to resolve them rather than guessing - correct, but it means
# a cross-platform lockfile needs npm install to fill the gaps.
if ! npm ci --no-audit --no-fund; then
  echo
  echo "  npm ci menolak lockfile ini (kemungkinan dibuat di OS berbeda)."
  echo "  Beralih ke npm install untuk melengkapi paket khusus Linux."
  echo
  npm install --no-audit --no-fund
fi

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
