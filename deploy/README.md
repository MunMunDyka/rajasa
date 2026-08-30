# Deploy ke VPS

Untuk Ubuntu di Sumopod (atau VPS mana pun dengan akses root).
Sekali jalan penuh: sekitar 45 menit, sebagian besar menunggu DNS.

## Yang perlu disiapkan lebih dulu

```text
VPS Ubuntu, 2 vCPU, RAM 2 GB atau lebih
Akses root lewat SSH
Sebuah domain atau subdomain   diarahkan ke IP VPS (A record)
```

**Soal RAM 2 GB.** Cukup, asalkan ada swap. `next build` memuncak sekitar
1.5-2 GB, dan tanpa swap prosesnya dibunuh OOM di tengah jalan sementara
Postgres juga memegang memori. `setup-server.sh` membuat swap 4 GB otomatis
kalau RAM di bawah 3.5 GB, jadi hal ini terurus sendiri.

Runtime aplikasinya jauh lebih ringan - sekitar 250 MB untuk proses Node
ditambah 150 MB untuk Postgres. Yang berat hanya saat build, dan build hanya
sesekali.

**Kenapa domain wajib:** HTTPS lewat Let's Encrypt hanya bisa untuk nama domain,
tidak bisa untuk IP telanjang. Tanpa HTTPS, browser menandai halaman login
sebagai tidak aman, dan aplikasi tidak bisa dipasang ke home screen HP.
Subdomain gratis pun cukup.

---

## 1. Siapkan server

```bash
ssh root@<ip-vps>
git clone https://github.com/MunMunDyka/rajasa.git /srv/rkl/app
bash /srv/rkl/app/deploy/setup-server.sh
```

Skrip ini memasang Node, PM2, Nginx, Certbot dan PostgreSQL; membuat
`/srv/rkl/{app,uploads,backups,logs}`; membuat database beserta usernya; mengunci
Postgres agar hanya bisa diakses dari localhost; dan memasang cron backup harian.

**Simpan `DATABASE_URL` yang dicetaknya.** Hanya ditampilkan sekali.

---

## 2. Tulis `.env`

```bash
nano /srv/rkl/app/frontend/.env
```

```ini
DATABASE_URL="postgresql://rkl:<password-dari-langkah-1>@localhost:5432/rkl"
DIRECT_URL="postgresql://rkl:<password-dari-langkah-1>@localhost:5432/rkl"

# Wajib dibuat baru. Jangan pernah memakai secret dari mesin pengembangan.
AUTH_SECRET="<hasil: openssl rand -base64 32>"
AUTH_URL="https://projecthub.domainmu.co.id"
AUTH_TRUST_HOST="true"

# Di luar direktori kode, supaya deploy tidak pernah menimpanya.
UPLOAD_ROOT="/srv/rkl/uploads"
MAX_UPLOAD_BYTES="20971520"

# false untuk penggunaan nyata: mematikan pengalih peran, petunjuk akun demo,
# dan membuat npm run db:seed menolak jalan.
DEMO_MODE="true"

NEXT_PUBLIC_APP_NAME="RKL ProjectHub"
```

```bash
chmod 600 /srv/rkl/app/frontend/.env
```

**Soal `DEMO_MODE`:** biarkan `"true"` selama masih tahap demo ke client - itu
yang menyalakan tombol akun demo dan pengalih peran. Ubah ke `"false"` sebelum
sistem dipakai sungguhan.

---

## 3. Deploy

```bash
bash /srv/rkl/app/deploy/deploy.sh
```

Menarik kode, `npm ci`, `prisma migrate deploy`, build, lalu menjalankan PM2 dan
memastikan `/login` menjawab 200.

Agar hidup lagi setelah VPS reboot, jalankan sekali:

```bash
pm2 startup     # lalu jalankan perintah yang ditampilkannya
pm2 save
```

### Isi data demo (opsional)

Hanya saat masih tahap demo. **Perintah ini menghapus seluruh isi database:**

```bash
cd /srv/rkl/app/frontend && npm run db:seed
```

Ini juga yang membuat berkas PDF/PNG contoh di `/srv/rkl/uploads` - tanpa itu,
setiap pratinjau dokumen menjawab 410.

---

## 4. Nginx dan HTTPS

Arahkan A record domainmu ke IP VPS, tunggu propagasi, lalu:

```bash
cp /srv/rkl/app/deploy/nginx.conf /etc/nginx/sites-available/rkl
nano /etc/nginx/sites-available/rkl        # ganti server_name
ln -sf /etc/nginx/sites-available/rkl /etc/nginx/sites-enabled/rkl
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d projecthub.domainmu.co.id
```

Certbot menulis ulang berkas itu untuk menambahkan blok TLS dan pengalihan dari
port 80. Perpanjangan otomatis sudah terpasang sebagai timer systemd.

---

## Deploy berikutnya

```bash
bash /srv/rkl/app/deploy/deploy.sh
```

Tidak pernah menyentuh `/srv/rkl/uploads` maupun `.env`.

---

## Sebelum diserahkan ke pengguna sungguhan

```text
[ ] DEMO_MODE="false"
[ ] AUTH_SECRET dibuat baru, bukan salinan dari mesin pengembangan
[ ] Akun demo dinonaktifkan, akun asli dibuat dengan password sungguhan
[ ] Uji pulihkan backup sekali - backup yang belum pernah diuji bukan backup
[ ] Pastikan Postgres tidak mendengarkan di 0.0.0.0
[ ] ufw enable
```

---

## Kalau bermasalah

**Build kehabisan memori (`Killed`, atau build berhenti tanpa pesan).**
Swap belum aktif. Periksa:

```bash
free -m          # baris Swap harus bukan 0
swapon --show
```

Kalau kosong, jalankan ulang `setup-server.sh` - ia membuat swap 4 GB saat RAM
di bawah 3.5 GB. Kalau masih gagal, batasi heap Node saat build:

```bash
NODE_OPTIONS=--max-old-space-size=1536 npm run build
```

**Login mengarah ke 127.0.0.1.** Header proxy di `nginx.conf` belum terpasang,
atau `AUTH_URL` masih salah. Keduanya harus menunjuk domain asli.

**Pratinjau dokumen menjawab 410.** Baris di database ada, berkasnya tidak.
Biasanya karena `UPLOAD_ROOT` salah, atau seed belum dijalankan.

**Cek log:**

```bash
pm2 logs rkl --lines 50
tail -50 /var/log/nginx/error.log
```
