#!/usr/bin/env bash
#
# First-time server setup for RKL ProjectHub on a fresh Ubuntu VPS.
# Run once, as root:
#
#   bash setup-server.sh
#
# Idempotent: safe to re-run. It installs packages, creates the directory
# layout, and sets up Postgres. It does NOT deploy the app - deploy.sh does
# that, and it does not touch .env, which you write by hand.

set -euo pipefail

APP_ROOT=/srv/rkl
DB_NAME=rkl
DB_USER=rkl
NODE_MAJOR=22

echo "==> Paket sistem"
apt-get update -qq
apt-get install -y -qq \
  curl git ca-certificates gnupg \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  rsync cron

echo "==> Node ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v

echo "==> PM2"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

echo "==> Swap"
# next build memuncak sekitar 1.5-2 GB. Di VPS 2 GB, build akan dibunuh OOM
# di tengah jalan sementara Postgres juga memegang memori. Swap menampung
# puncak itu; ia lambat, tapi build hanya sesekali dan tidak perlu cepat.
# Runtime aplikasinya sendiri hanya ~250 MB, jadi swap tidak akan terpakai
# saat melayani permintaan.
TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
if [ "${TOTAL_MB}" -lt 3500 ] && [ "${SWAP_MB}" -lt 1024 ]; then
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Pakai swap hanya saat benar-benar mendesak, bukan sebagai cadangan rutin.
    sysctl -qw vm.swappiness=10
    grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "  Swap 4 GB dibuat (RAM terdeteksi ${TOTAL_MB} MB)."
  fi
else
  echo "  Tidak perlu (RAM ${TOTAL_MB} MB, swap ${SWAP_MB} MB)."
fi

echo "==> Struktur direktori"
# uploads sits OUTSIDE the code directory on purpose: a deploy replaces app/,
# and client documents must never be inside anything a deploy can overwrite.
mkdir -p "${APP_ROOT}"/{app,uploads,backups,logs}

echo "==> PostgreSQL"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  sudo -u postgres psql -qc "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
  sudo -u postgres psql -qc "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  echo
  echo "  Database dibuat. SIMPAN baris ini - hanya ditampilkan sekali:"
  echo
  echo "  DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}\""
  echo "  DIRECT_URL=\"postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}\""
  echo
else
  echo "  User ${DB_USER} sudah ada, dilewati."
fi

# Postgres must not be reachable from the internet. The app talks to it over
# localhost; anything else is an open door.
PG_CONF="$(sudo -u postgres psql -tAc 'SHOW config_file')"
if ! grep -qE "^listen_addresses *= *'localhost'" "${PG_CONF}"; then
  sed -i "s/^#\?listen_addresses.*/listen_addresses = 'localhost'/" "${PG_CONF}"
  systemctl restart postgresql
  echo "  listen_addresses dikunci ke localhost."
fi

echo "==> Backup harian"
cat > /etc/cron.daily/rkl-backup <<'CRON'
#!/bin/sh
# Daily dump + uploads snapshot. Keeps 14 days.
set -e
STAMP=$(date +%F)
sudo -u postgres pg_dump rkl | gzip > /srv/rkl/backups/db-${STAMP}.sql.gz
tar czf /srv/rkl/backups/uploads-${STAMP}.tar.gz -C /srv/rkl uploads
find /srv/rkl/backups -type f -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/rkl-backup

echo "==> Firewall"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  echo "  Aturan ditambahkan. Aktifkan sendiri dengan: ufw enable"
fi

echo
echo "Selesai. Berikutnya:"
echo "  1. git clone <repo> /srv/rkl/app"
echo "  2. tulis /srv/rkl/app/frontend/.env (lihat deploy/README.md)"
echo "  3. bash /srv/rkl/app/deploy/deploy.sh"
echo "  4. pasang nginx.conf, arahkan DNS, lalu certbot --nginx -d <domain>"
