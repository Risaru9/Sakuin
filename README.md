# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang **mobile-friendly**, sederhana, cepat, dan nyaman digunakan di HP, tablet, laptop, maupun desktop.

Aplikasi ini membantu pengguna mencatat pemasukan dan pengeluaran, memantau saldo, mengelola kategori transaksi, membuat target tabungan, mengatur batas saldo aman, serta mengekspor laporan transaksi ke beberapa format.

Project ini menggunakan struktur **monorepo** agar frontend, backend, dan shared package dapat dikelola dalam satu repository secara rapi, modular, dan mudah dikembangkan.

---

## Production URL

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
GitHub   : https://github.com/Risaru9/Sakuin
Database : Supabase PostgreSQL
```

Health check backend:

```txt
GET https://sakuin-api.vercel.app/health
GET https://sakuin-api.vercel.app/api/health
```

Status production terakhir:

```txt
[✓] Frontend Vercel aktif
[✓] Backend Vercel aktif
[✓] Database Supabase aktif
[✓] CORS frontend-backend berjalan
[✓] Environment variable production terbaca
[✓] GitHub Actions CI berjalan
[✓] Vercel deployment berjalan
[✓] Semua fitur utama berjalan normal di production
```

---

## Rumusan Masalah

Banyak pengguna masih mencatat keuangan pribadi secara manual atau tersebar di banyak tempat, seperti catatan HP, spreadsheet, aplikasi bank, atau ingatan pribadi. Pola tersebut membuat pengguna sulit untuk:

- mengetahui kondisi saldo secara cepat;
- memantau pemasukan dan pengeluaran;
- mengelompokkan transaksi berdasarkan kategori;
- melihat ringkasan keuangan bulanan;
- menjaga saldo tetap berada di atas batas aman;
- membuat dan memantau target tabungan;
- menyimpan laporan transaksi dalam format yang mudah dianalisis.

Sakuin dibuat untuk menjawab masalah tersebut melalui webapp keuangan pribadi yang ringan, responsif, terstruktur, dan mudah digunakan.

---

## Tujuan Project

Tujuan utama Sakuin adalah menyediakan aplikasi keuangan pribadi yang:

- mudah digunakan oleh pengguna umum;
- nyaman diakses dari mobile maupun desktop;
- membantu pencatatan pemasukan dan pengeluaran;
- menyediakan ringkasan kondisi keuangan;
- mendukung kategori transaksi default dan custom;
- membantu pengguna membuat target tabungan;
- menyediakan export laporan transaksi;
- memiliki UX yang cepat melalui caching dan optimistic update;
- memiliki struktur kode yang rapi dan mudah dikembangkan.

---

## Fitur Utama

### Authentication

- Register akun baru
- Login
- Logout
- Protected route
- Token-based authentication menggunakan JWT
- Session disimpan di browser melalui local storage

### Dashboard

- Menampilkan total saldo
- Menampilkan total pemasukan
- Menampilkan total pengeluaran
- Menampilkan batas saldo aman
- Menampilkan status aman/waspada berdasarkan safe balance limit
- Menampilkan transaksi terbaru
- Menampilkan statistik/trend keuangan 6 bulan
- Menampilkan ringkasan goals
- Menampilkan goal prioritas
- Tambah transaksi langsung dari dashboard
- Data dashboard memakai cache agar tidak loading berulang saat pindah halaman

### Transactions

- Tambah transaksi pemasukan
- Tambah transaksi pengeluaran
- Edit transaksi
- Hapus transaksi
- Search transaksi berdasarkan catatan
- Filter berdasarkan tipe transaksi
- Filter berdasarkan kategori
- Filter berdasarkan rentang tanggal
- Sorting transaksi
- Pagination backend-driven
- Limit data per halaman
- Confirm dialog untuk hapus transaksi
- Toast notification untuk feedback aksi
- Cache dan background refetch menggunakan TanStack Query
- Optimistic/faster action UX untuk edit dan delete

Aturan validasi nominal transaksi:

```txt
Minimal  : Rp 1
Maksimal : Rp 1.000.000.000.000
Tidak boleh 0
Tidak boleh minus
Tidak boleh format angka tidak valid
Maksimal 2 angka desimal
```

Validasi dilakukan di frontend dan backend.

### Categories

- Melihat default category
- Membuat custom category
- Edit custom category
- Hapus custom category
- Filter category berdasarkan ALL, INCOME, dan EXPENSE
- Default category tidak bisa diedit
- Default category tidak bisa dihapus
- Category yang dipakai transaksi tidak bisa dihapus
- Cache category menggunakan TanStack Query
- Category langsung terintegrasi dengan Add/Edit Transaction

### Goals

- Membuat target tabungan
- Edit goal
- Hapus goal
- Tambah dana/progress ke goal
- Melihat progress goal
- Set goal prioritas untuk dashboard
- Validasi current amount tidak boleh melebihi target amount
- Confirm dialog untuk aksi hapus
- Toast notification untuk feedback aksi
- Cache dan optimistic/faster action UX menggunakan TanStack Query

### Profile

- Melihat profile user
- Update nama user
- Update safe balance limit
- Logout
- Nama user langsung sinkron ke AppShell/sidebar
- Safe balance limit langsung memengaruhi summary/dashboard setelah refresh cache
- Toast notification untuk feedback aksi

Aturan validasi safe balance limit:

```txt
Minimal  : Rp 0
Maksimal : Rp 1.000.000.000.000
Hanya angka
Tidak boleh minus
Tidak boleh huruf
Tidak boleh simbol
```

### Export

- Export transaksi ke JSON
- Export transaksi ke CSV
- Export transaksi ke XLSX
- Filter export berdasarkan tipe transaksi
- Filter export berdasarkan rentang tanggal
- Custom nama file export
- Preview nama file sebelum download
- Validasi rentang tanggal
- Tombol export disabled saat file sedang diproses
- Toast notification untuk feedback export
- Download memakai auth flow standar melalui API client

### UI/UX

- Responsive layout untuk mobile, tablet, laptop, dan desktop
- Sidebar desktop
- Bottom navigation mobile
- AppShell reusable untuk halaman utama
- Modal overlay konsisten
- ConfirmDialog custom
- ToastProvider global
- Loading state dan error state konsisten
- Caching global dengan TanStack Query
- Optimistic/faster action UX pada halaman utama
- Tampilan clean, sederhana, dan modern

---

## Tech Stack

### Monorepo

- pnpm workspace
- TypeScript

### Frontend

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- TanStack Query
- Recharts
- lucide-react
- clsx
- tailwind-merge
- Vitest
- Testing Library
- jsdom

### Backend

- Node.js
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase
- Zod
- JWT
- bcryptjs
- ExcelJS
- Vitest

### Database

- PostgreSQL
- Supabase PostgreSQL
- Prisma migration
- Prisma seed

### Deployment dan CI

- Vercel untuk frontend
- Vercel untuk backend Hono serverless function
- Supabase untuk database
- GitHub sebagai repository
- GitHub Actions untuk CI

---

## Struktur Project

```txt
sakuin/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ db/
│  │  │  ├─ middlewares/
│  │  │  ├─ modules/
│  │  │  ├─ types/
│  │  │  └─ utils/
│  │  ├─ tests/
│  │  ├─ package.json
│  │  └─ .env.example
│  │
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ components/
│     │  ├─ features/
│     │  │  ├─ auth/
│     │  │  ├─ categories/
│     │  │  ├─ dashboard/
│     │  │  ├─ export/
│     │  │  ├─ goals/
│     │  │  ├─ health/
│     │  │  ├─ profile/
│     │  │  ├─ summary/
│     │  │  └─ transactions/
│     │  ├─ lib/
│     │  ├─ types/
│     │  └─ main.tsx
│     ├─ package.json
│     └─ .env.example
│
├─ packages/
│  └─ shared/
│
├─ docs/
│  ├─ API.md
│  └─ HANDOFF.md
│
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ .gitignore
└─ README.md
```

---

## Dokumentasi Tambahan

Dokumentasi API tersedia di:

```txt
docs/API.md
```

Dokumen handoff untuk developer atau agent lanjutan tersedia di:

```txt
docs/HANDOFF.md
```

---

## Environment Variables

Project ini membutuhkan environment variable untuk backend dan frontend.

Jangan menyimpan file `.env` asli ke repository. Gunakan `.env.example` sebagai referensi.

---

### Backend Environment

Buat file:

```txt
apps/api/.env
```

Contoh isi:

```env
NODE_ENV="development"
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

JWT_SECRET="replace_with_minimum_32_characters_secret"

FRONTEND_URL="http://localhost:3000"
```

Keterangan:

```txt
NODE_ENV      : mode environment, misalnya development atau production
PORT          : port backend lokal
DATABASE_URL  : connection string PostgreSQL untuk aplikasi
DIRECT_URL    : direct connection string PostgreSQL untuk Prisma migration
JWT_SECRET    : secret key minimal 32 karakter untuk JWT
FRONTEND_URL  : URL frontend yang diizinkan oleh CORS
```

---

### Frontend Environment

Buat file:

```txt
apps/web/.env
```

Contoh isi untuk lokal:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

Contoh isi untuk production:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

Catatan penting:

```txt
VITE_API_BASE_URL tidak boleh diakhiri slash /
```

Benar:

```txt
https://sakuin-api.vercel.app
```

Salah:

```txt
https://sakuin-api.vercel.app/
```

---

## Cara Menjalankan Project Secara Lokal

Pastikan sudah berada di root project:

```bash
cd sakuin
```

### 1. Install Dependency

```bash
pnpm install
```

### 2. Generate Prisma Client

```bash
pnpm --filter @sakuin/api db:generate
```

### 3. Jalankan Database Migration

```bash
pnpm --filter @sakuin/api db:migrate
```

### 4. Seed Database

```bash
pnpm --filter @sakuin/api db:seed
```

Seed digunakan untuk membuat data awal seperti default category.

### 5. Jalankan Backend

```bash
pnpm --filter @sakuin/api dev
```

Backend berjalan di:

```txt
http://127.0.0.1:5000
```

Cek backend:

```txt
http://127.0.0.1:5000/health
http://127.0.0.1:5000/api/health
```

### 6. Jalankan Frontend

Buka terminal baru, lalu jalankan:

```bash
pnpm --filter @sakuin/web dev
```

Frontend berjalan di:

```txt
http://127.0.0.1:3000
```

---

## Script Penting

### Root Script

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm dev:api
pnpm dev:web
```

Catatan:

```txt
Script root "dev" saat ini menjalankan backend.
Untuk menjalankan frontend, gunakan pnpm dev:web.
```

---

### Frontend Script

```bash
pnpm --filter @sakuin/web dev
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web test:watch
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/web preview
```

Keterangan:

```txt
dev        : menjalankan frontend lokal
typecheck  : mengecek TypeScript frontend
test       : menjalankan frontend automated test
test:watch : menjalankan frontend test mode watch
build      : build frontend untuk production
preview    : preview hasil build frontend
```

---

### Backend Script

```bash
pnpm --filter @sakuin/api dev
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api test:watch
pnpm --filter @sakuin/api build
pnpm --filter @sakuin/api start
```

Keterangan:

```txt
dev        : menjalankan backend lokal
typecheck  : mengecek TypeScript backend dan test config
test       : menjalankan backend test dengan timeout 20 detik
test:watch : menjalankan backend test mode watch
build      : build backend
start      : menjalankan hasil build backend
```

---

### Prisma Script

```bash
pnpm --filter @sakuin/api db:generate
pnpm --filter @sakuin/api db:migrate
pnpm --filter @sakuin/api db:seed
pnpm --filter @sakuin/api db:studio
pnpm --filter @sakuin/api db:reset
```

Keterangan:

```txt
db:generate : generate Prisma Client
db:migrate  : menjalankan migration development
db:seed     : menjalankan seed database
db:studio   : membuka Prisma Studio
db:reset    : reset database development
```

---

## Testing dan Build

### Frontend

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

Frontend test terakhir yang tercatat:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

### Backend

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Backend test terakhir yang tercatat:

```txt
Test Files : 7 passed
Tests      : 63 passed
```

### Full Regression

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Target regression:

```txt
Frontend typecheck : passed
Frontend test      : passed
Frontend build     : passed
Backend typecheck  : passed
Backend test       : passed
Backend build      : passed
```

---

## Backend API Summary

Base URL production:

```txt
https://sakuin-api.vercel.app
```

Base URL local:

```txt
http://127.0.0.1:5000
```

Public endpoints:

```txt
GET  /health
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Protected endpoints:

```txt
GET    /api/auth/me

GET    /api/users/profile
PATCH  /api/users/profile

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/summary

GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PUT    /api/goals/:id
DELETE /api/goals/:id

GET    /api/export/transactions
```

Endpoint protected wajib mengirim header:

```txt
Authorization: Bearer <token>
```

Detail endpoint tersedia di:

```txt
docs/API.md
```

---

## Deployment

### Frontend

Frontend dideploy ke Vercel:

```txt
https://sakuin-web.vercel.app
```

Environment production frontend:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

### Backend

Backend dideploy ke Vercel:

```txt
https://sakuin-api.vercel.app
```

Backend menggunakan Hono app sebagai Vercel serverless function.

Environment production backend:

```env
NODE_ENV="production"
DATABASE_URL="<Supabase PostgreSQL URL>"
DIRECT_URL="<Supabase Direct URL>"
JWT_SECRET="<production secret>"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

### Database

Database production menggunakan Supabase PostgreSQL.

Jangan menyimpan value asli berikut di repository:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
```

---

## Catatan Deployment Penting

Beberapa hal penting yang perlu diperhatikan saat deployment:

1. Environment variable Vercel harus diset pada environment yang benar.
2. Untuk production domain seperti `https://sakuin-api.vercel.app`, variable harus tersedia di environment `Production`.
3. Setelah mengubah environment variable di Vercel, lakukan redeploy.
4. Frontend Vite hanya membaca environment variable dengan prefix `VITE_`.
5. `VITE_API_BASE_URL` tidak boleh diakhiri slash `/`.
6. Backend CORS harus mengizinkan URL frontend production.
7. Jangan menggunakan URL dashboard Vercel sebagai API URL.
8. Jangan menggunakan preview URL yang terkena Vercel Authentication sebagai API production.
9. Jangan menyimpan secret production di repository.
10. Pastikan GitHub Actions secrets tetap tersedia untuk CI.

---

## GitHub Actions CI

CI digunakan untuk menjaga project tetap aman sebelum perubahan masuk ke main branch.

Validasi CI mencakup:

```txt
[✓] pnpm install dengan frozen lockfile
[✓] Prisma client/schema sync
[✓] Frontend test
[✓] Frontend typecheck
[✓] Frontend build
[✓] Backend typecheck
[✓] Backend test
[✓] Backend build
```

Catatan:

```txt
Jika package.json berubah, jalankan pnpm install agar pnpm-lock.yaml ikut sinkron.
Jika lockfile tidak sinkron, CI akan gagal pada tahap frozen install.
```

---

## Status Project

Status project saat ini:

```txt
Production Ready
App-wide UX/cache optimization completed
```

Yang sudah selesai:

```txt
[✓] Frontend production aktif
[✓] Backend production aktif
[✓] Database Supabase aktif
[✓] GitHub repository aktif
[✓] GitHub Actions CI aktif
[✓] Vercel deployment aktif
[✓] Auth berjalan
[✓] Dashboard berjalan
[✓] Transactions berjalan
[✓] Categories berjalan
[✓] Goals berjalan
[✓] Profile berjalan
[✓] Export berjalan
[✓] Toast notification berjalan
[✓] Confirm dialog berjalan
[✓] AppShell responsive berjalan
[✓] Frontend automated tests berjalan
[✓] Backend automated tests berjalan
[✓] TanStack Query cache diterapkan
[✓] Performance/UX optimization diterapkan di semua page utama
```

---

## Manual Production Smoke Test

Checklist production terakhir:

```txt
[✓] Buka frontend production
[✓] Backend /health aktif
[✓] Backend /api/health aktif
[✓] Register
[✓] Login
[✓] Dashboard tampil normal
[✓] Tambah transaksi
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Filter/search/sort/pagination transaksi
[✓] Tambah category custom
[✓] Edit category custom
[✓] Hapus category custom
[✓] Tambah goal
[✓] Edit goal
[✓] Tambah dana goal
[✓] Hapus goal
[✓] Set goal prioritas dashboard
[✓] Update profile
[✓] Update safe balance limit
[✓] Export JSON
[✓] Export CSV
[✓] Export XLSX
[✓] Logout
[✓] Login ulang
[✓] Refresh route protected tidak 404
```

---

## Prinsip Pengembangan

Prinsip yang digunakan selama pengembangan Sakuin:

```txt
1. Jangan mengubah logic stabil tanpa alasan kuat.
2. Perubahan dilakukan bertahap per fase.
3. Setelah perubahan besar, jalankan typecheck/test/build.
4. Validasi penting harus ada di frontend dan backend.
5. Aksi destructive menggunakan ConfirmDialog.
6. Feedback user menggunakan ToastProvider.
7. Layout halaman protected menggunakan AppShell.
8. Modal overlay harus konsisten.
9. Hindari window.confirm() dan alert().
10. Dokumentasi harus jelas, ringkas, dan bisa dipakai developer lain.
11. Cache dipakai untuk mengurangi blank loading berulang.
12. Optimistic/faster action UX dipakai dengan rollback jika gagal.
```

---

## Release Notes

Release yang sudah tercatat:

```txt
v0.1.0 - Sakuin MVP release
v0.1.1 - Sakuin production deployment release
v0.2.0 - Category management release
```

Rencana release berikutnya:

```txt
v0.4.0 - App-wide caching and UX performance optimization
```

Gunakan release tag baru setelah final regression dan dokumentasi selesai.

---

## Backlog Lanjutan

Fitur yang belum dibuat dan bisa dikembangkan selanjutnya:

```txt
[ ] Budgeting per kategori
[ ] Recurring transaction
[ ] PWA installable
[ ] Dark mode
[ ] Chat/command input transaksi, contoh: /pengeluaran makan 20000
[ ] AI assistant
[ ] Data visualization enhancement
[ ] Import transaksi dari CSV/XLSX
[ ] Multi-account wallet
[ ] Notification/reminder untuk goal atau recurring transaction
```

---

## Rekomendasi Pengembangan Berikutnya

Urutan pengembangan yang disarankan setelah optimasi app-wide:

```txt
1. Final regression dan update dokumentasi.
2. Tag release app-wide performance optimization.
3. Tambahkan budgeting per kategori.
4. Tambahkan recurring transaction.
5. Tambahkan PWA support.
6. Tambahkan dark mode.
7. Tambahkan chat/command input transaksi.
8. Tambahkan AI assistant setelah fitur utama semakin matang.
```

---

## License

Project ini dibuat sebagai project pengembangan aplikasi web pengelola keuangan pribadi.

Lisensi dapat ditentukan kemudian sesuai kebutuhan pemilik repository.