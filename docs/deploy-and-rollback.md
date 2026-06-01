# Prosedur Deployment dan Rollback Sakuin

Dokumen ini berisi Standard Operating Procedure (SOP) untuk melakukan deployment dan rollback pada aplikasi Sakuin (Frontend di Vercel, Backend/API di Vercel Serverless/Node.js, dan Database PostgreSQL dengan Prisma).

---

## 1. Alur Deployment (CI/CD & Manual)

### A. Deployment Otomatis (CI/CD via GitHub)
1. Setiap commit yang di-push atau di-merge ke branch `main` akan memicu workflow GitHub Actions dan alur deployment otomatis di Vercel.
2. Vercel secara otomatis mendeteksi perubahan di `apps/web` (Frontend) dan `apps/api` (Backend/API) lalu melakukan build dan deployment.
3. Database migrations dijalankan secara otomatis saat build backend via command `prisma migrate deploy` yang didefinisikan pada script `vercel-build` / `build` backend.

### B. Deployment Manual via Vercel CLI
Jika CI/CD mengalami kendala, deployment dapat dilakukan secara manual menggunakan Vercel CLI dari root workspace:

```bash
# 1. Pastikan dependencies terinstal dan workspace bersih
pnpm install
pnpm build

# 2. Deploy Backend API ke Production
cd apps/api
vercel --prod

# 3. Deploy Frontend Web ke Production
cd ../web
vercel --prod
```

---

## 2. Eksekusi Migrasi Database (Prisma)

Migrasi skema database PostgreSQL menggunakan **Prisma ORM**.
1. **Aturan Migrasi**: Migrasi skema database harus bersifat *backward-compatible* (tidak merusak versi aplikasi yang sedang berjalan sebelum deployment selesai). Hindari menghapus kolom atau me-rename kolom secara langsung. Lakukan dalam 2 fase: tambah kolom baru, migrasikan data, kemudian hapus kolom lama pada deployment berikutnya.
2. **Eksekusi Otomatis**: Dijalankan pada fase build backend di Vercel menggunakan perintah:
   ```bash
   prisma migrate deploy
   ```
   *Catatan: Perintah `migrate deploy` hanya menjalankan migrasi baru yang belum diaplikasikan tanpa menyentuh data existing (non-destructive jika migrasi ditulis dengan benar).*

---

## 3. Panduan Verifikasi Deployment (Sync Check)

Setelah deployment berhasil dilaporkan oleh GitHub Actions atau Vercel Dashboard, lakukan langkah verifikasi berikut:

1. **Cek Versi Aplikasi Terkini**:
   Akses endpoint health check dan versi pada Backend API:
   - URL: `https://sakuin-api.vercel.app/api/app-version` (atau domain API Anda)
   - Pastikan commit hash atau versi yang dikembalikan sesuai dengan rilis terbaru.
   - Verifikasi status health check di `https://sakuin-api.vercel.app/health`.

2. **Cek File Sinkronisasi Versi**:
   Periksa isi file `latest-version.json` di root atau CDN frontend untuk memastikan nomor versi client sudah tersinkronisasi dengan build backend terbaru.

3. **Jalankan Smoke Test Lokal / Production**:
   Jalankan script smoke check produksi untuk memvalidasi endpoint utama secara otomatis:
   ```bash
   pnpm smoke:production
   ```

---

## 4. Strategi dan Prosedur Rollback

Jika ditemukan bug kritis di production setelah deployment, ikuti prosedur rollback di bawah ini dengan segera.

### A. Rollback Kode Aplikasi (Frontend & API)
Vercel mendukung Instant Rollback tanpa perlu melakukan build ulang:
1. Buka **Vercel Dashboard** untuk project yang bermasalah (`sakuin-web` atau `sakuin-api`).
2. Masuk ke tab **Deployments**.
3. Cari deployment stabil sebelumnya (yang berjalan dengan baik sebelum rilis bermasalah).
4. Klik tombol **tiga titik (...)** di sebelah deployment tersebut dan pilih **Promote to Production**.
5. Vercel akan langsung mengalihkan traffic ke deployment stabil tersebut dalam waktu kurang dari 5 detik.

### B. Rollback Skema Database (Prisma Migration Rollback)
Jika deployment menyertakan migrasi database yang bermasalah atau menyebabkan error pada data:

> [!CAUTION]
> Lakukan rollback database dengan sangat hati-hati untuk menghindari kehilangan data transaksi pengguna.

1. **Identifikasi Migrasi yang Bermasalah**:
   Cek status migrasi terakhir yang gagal atau bermasalah dengan perintah:
   ```bash
   npx prisma migrate status
   ```

2. **Tandai Migrasi Tersebut Sebagai Gagal / Ter-resolve**:
   Jika migrasi gagal di tengah jalan dan menyisakan state database yang tidak konsisten, tandai migrasi tersebut sebagai dibatalkan (rolled back) agar Prisma tidak mencoba menjalankannya kembali:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

3. **Kembalikan Skema Database Secara Manual/Script**:
   Tulis file SQL rollback manual (misalnya berisi `ALTER TABLE ... DROP COLUMN ...` atau sebaliknya) untuk mengembalikan skema ke state sebelumnya, lalu eksekusi langsung ke database production:
   ```bash
   # Menggunakan psql atau client database untuk menjalankan SQL rollback
   psql -h <db_host> -U <db_user> -d <db_name> -f path/to/rollback.sql
   ```

4. **Revert Commit Code**:
   Revert commit git yang memperkenalkan migrasi tersebut di branch `main` agar skema Prisma lokal (`schema.prisma`) kembali sinkron dengan database:
   ```bash
   git revert <commit_hash>
   git push origin main
   ```
