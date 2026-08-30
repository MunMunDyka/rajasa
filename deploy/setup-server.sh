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

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan dengan sudo:  sudo bash $0" >&2
  exit 1
fi

# The account that will own the app and run PM2. Deploys and the Node process
# run as this user, never as root: a web process with root privileges turns any
# code-execution bug into a full machine compromise.
APP_USER="${SUDO_USER:-ubuntu}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "User ${APP_USER} tidak ada." >&2
  exit 1
fi
echo "==> Aplikasi akan dimiliki dan dijalankan oleh: ${APP_USER}"

echo "==> Paket sistem"
apt-get update -qq
apt-get install -y -qq \
  curl git ca-certificates gnupg \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  rsync cron

echo "==> Node"
# Never replace a Node that is already here. A VPS often runs more than one
# app, and installing a different major version from NodeSource swaps the
# global binary out from under whatever else is on the box. Anything from 20
# up runs this project, so an existing newer Node is left exactly as it is.
NODE_MIN_MAJOR=20
if command -v node >/dev/null 2>&1; then
  # cut and tr rather than a sed capture group: no backslashes, so nothing
  # can mangle the escape on its way into this file. `node -v` prints
  # v24.16.0; strip the v, keep the first dot-separated field.
  CURRENT_MAJOR="$(node -v | tr -d 'v' | cut -d. -f1)"
  if [ "${CURRENT_MAJOR}" -ge "${NODE_MIN_MAJOR}" ]; then
    echo "  Node $(node -v) sudah ada dan memenuhi syarat - dilewati."
  else
    echo "  Node $(node -v) terlalu lama (minimal ${NODE_MIN_MAJOR})." >&2
    echo "  Upgrade manual dulu, lalu jalankan skrip ini lagi." >&2
    echo "  Tidak kuganti otomatis karena aplikasi lain di mesin ini mungkin bergantung padanya." >&2
    exit 1
  fi
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
  echo "  Node $(node -v) dipasang."
fi

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
COMBINED=$((TOTAL_MB + SWAP_MB))
# next build peaks near 2 GB on top of whatever else the box is running.
# Judge on RAM + swap combined, not RAM alone: a machine with 2 GB of each has
# room, one with 2 GB and no swap does not.
if [ "${COMBINED}" -lt 5000 ]; then
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Pakai swap hanya saat benar-benar mendesak, bukan sebagai cadangan rutin.
    sysctl -qw vm.swappiness=10
    grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "  Swap 4 GB ditambahkan (RAM ${TOTAL_MB} MB + swap lama ${SWAP_MB} MB)."
  else
    echo "  /swapfile sudah ada; total RAM+swap ${COMBINED} MB."
    echo "  Kalau build nanti mati dengan pesan 'Killed', besarkan swap ini."
  fi
else
  echo "  Cukup (RAM ${TOTAL_MB} MB + swap ${SWAP_MB} MB = ${COMBINED} MB)."
fi

echo "==> Struktur direktori"
# uploads sits OUTSIDE the code directory on purpose: a deploy replaces app/,
# and client documents must never be inside anything a deploy can overwrite.
mkdir -p "${APP_ROOT}"/{app,uploads,backups,logs}
# Owned by the app user so deploy.sh and PM2 need no privileges at all.
chown -R "${APP_USER}:${APP_USER}" "${APP_ROOT}"

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
echo "Selesai. Berikutnya, SEBAGAI ${APP_USER} (tanpa sudo):"
echo "  1. git clone https://github.com/MunMunDyka/rajasa.git /srv/rkl/app"
echo "  2. nano /srv/rkl/app/frontend/.env      (lihat deploy/README.md)"
echo "  3. bash /srv/rkl/app/deploy/deploy.sh"
echo "  4. sudo: pasang nginx.conf, lalu certbot --nginx -d <domain>"
