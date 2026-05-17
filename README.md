# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang **mobile-friendly**, sederhana, cepat, aman secara bertahap, dan nyaman digunakan di HP, tablet, laptop, maupun desktop.

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
[✓] Webapp sudah bisa diinstall sebagai PWA
[✓] Semua fitur utama berjalan normal di production
[✓] Manual production regression terakhir aman
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
- menyimpan laporan transaksi dalam format yang mudah dianalisis;
- menggunakan aplikasi keuangan yang nyaman di perangkat mobile dan desktop.

Sakuin dibuat untuk menjawab masalah tersebut melalui webapp keuangan pribadi yang ringan, responsif, terstruktur, dan mudah digunakan.

---

## Tujuan Project

Tujuan utama Sakuin adalah menyediakan aplikasi keuangan pribadi yang:

- mudah digunakan oleh pengguna umum;
- nyaman diakses dari mobile, tablet, laptop, maupun desktop;
- membantu pencatatan pemasukan dan pengeluaran;
- menyediakan ringkasan kondisi keuangan;
- mendukung kategori transaksi default dan custom;
- membantu pengguna membuat dan memantau target tabungan;
- menyediakan export laporan transaksi;
- memiliki UX yang cepat melalui caching dan optimistic/faster update;
- bisa diinstall sebagai PWA;
- memiliki dasar security hardening untuk API;
- memiliki struktur kode yang rapi dan mudah dikembangkan.

---

## Fitur Utama

### Authentication

- Register akun baru
- Login
- Logout
- Protected route
- Token-based authentication menggunakan JWT Bearer Token
- Auth context di frontend
- Token disimpan di browser melalui localStorage

Catatan security:

```txt
Token saat ini masih disimpan di localStorage.
Ini cukup untuk MVP/production awal, tetapi untuk security tingkat lanjut sebaiknya dipertimbangkan migrasi ke httpOnly secure cookie.
```

---

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
- Background refetch menggunakan TanStack Query

---

### Transactions

- Tambah transaksi pemasukan
- Tambah transaksi pengeluaran
- Edit transaksi
- Hapus transaksi
- Search transaksi berdasarkan catatan
- Filter berdasarkan tipe transaksi
- Filter berdasarkan kategori
- Filter berdasarkan rentang tanggal
- UX filter tanggal mobile sudah diperjelas dengan label dan helper text
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

---

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

---

### Goals

- Membuat target tabungan
- Edit goal
- Hapus goal
- Tambah dana/progress ke goal
- Melihat progress goal
- Set goal prioritas untuk dashboard
- Clear invalid priority goal jika goal dihapus
- Validasi current amount tidak boleh melebihi target amount
- Confirm dialog untuk aksi hapus
- Toast notification untuk feedback aksi
- Cache dan optimistic/faster action UX menggunakan TanStack Query

Aturan validasi goal:

```txt
name wajib diisi
targetAmount harus lebih dari 0
currentAmount tidak boleh negatif
currentAmount tidak boleh lebih besar dari targetAmount
```

---

### Profile

- Melihat profile user
- Update nama user
- Update safe balance limit
- Logout
- Nama user langsung sinkron ke AppShell/sidebar
- Safe balance limit langsung memengaruhi summary/dashboard setelah refresh cache
- Toast notification untuk feedback aksi
- Cache profile menggunakan TanStack Query

Aturan validasi safe balance limit:

```txt
Minimal  : Rp 0
Maksimal : Rp 1.000.000.000.000
Hanya angka
Tidak boleh minus
Tidak boleh huruf
Tidak boleh simbol
```

---

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

---

### PWA

Sakuin sudah memiliki basic PWA installable support.

Yang sudah tersedia:

- `manifest.webmanifest`
- PWA icons
- Maskable icons
- `offline.html`
- `sw.js`
- Service worker registration
- Meta tag PWA di `index.html`
- Tombol install aplikasi
- Fallback instruksi manual jika browser tidak menyediakan install prompt
- Webapp bisa diinstall seperti aplikasi

File terkait PWA:

```txt
apps/web/public/manifest.webmanifest
apps/web/public/offline.html
apps/web/public/sw.js
apps/web/public/icons/
apps/web/src/lib/pwa.ts
apps/web/src/components/pwa/InstallAppButton.tsx
apps/web/src/main.tsx
apps/web/index.html
apps/web/src/app/router.tsx
```

Catatan PWA:

```txt
Browser tidak selalu mengizinkan website membuka dialog install secara langsung.
Jika beforeinstallprompt tersedia, tombol Install Sakuin bisa memunculkan dialog install.
Jika tidak tersedia, tombol menampilkan instruksi manual melalui toast.
```

Behavior update PWA:

```txt
PWA yang sudah diinstall tetap mengambil versi terbaru dari domain production.
Jika ada fitur/perbaikan baru dan sudah deploy ke Vercel, installed webapp umumnya akan update ketika user membuka ulang atau refresh aplikasi.
Karena ada service worker/cache, pada sebagian kondisi user mungkin perlu menutup dan membuka ulang aplikasi agar update aktif sepenuhnya.
```

---

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
- Transactions mobile date range filter sudah dipoles
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
- PWA basic support

### Backend

- Node.js
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase PostgreSQL
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
│  │  │  │  ├─ auth/
│  │  │  │  ├─ categories/
│  │  │  │  ├─ export/
│  │  │  │  ├─ goals/
│  │  │  │  ├─ summary/
│  │  │  │  ├─ transactions/
│  │  │  │  └─ users/
│  │  │  ├─ types/
│  │  │  └─ utils/
│  │  ├─ tests/
│  │  ├─ package.json
│  │  └─ .env.example
│  │
│  └─ web/
│     ├─ public/
│     │  ├─ icons/
│     │  ├─ manifest.webmanifest
│     │  ├─ offline.html
│     │  └─ sw.js
│     ├─ src/
│     │  ├─ app/
│     │  ├─ components/
│     │  │  ├─ layout/
│     │  │  ├─ pwa/
│     │  │  ├─ toast/
│     │  │  └─ ui/
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
NODE_ENV      : mode environment, misalnya development, test, atau production
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
test       : menjalankan backend test
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

Catatan build frontend:

```txt
Build frontend bisa memunculkan warning chunk size > 500 kB.
Itu warning, bukan error.
Optimasi bundle bisa dilakukan nanti dengan lazy loading route/code splitting.
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

## Security

Sakuin menyimpan data keuangan pribadi, sehingga security harus dikembangkan secara bertahap dan hati-hati.

### Security yang Sudah Ada

Fondasi security yang sudah diterapkan:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation untuk validasi request
[✓] JWT Bearer Token authentication
[✓] bcryptjs untuk password hashing
[✓] Protected endpoint
[✓] User ownership check pada data user
[✓] CORS production dibatasi
[✓] Secret tidak disimpan di repository
[✓] Security headers middleware
[✓] Request body size limit basic
[✓] Production error handling lebih aman
```

### Security Headers

Backend sudah menambahkan basic security headers:

```txt
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
X-Permitted-Cross-Domain-Policies
Strict-Transport-Security pada production
```

Tujuannya:

```txt
[✓] Mengurangi risiko MIME sniffing
[✓] Mencegah clickjacking melalui frame protection
[✓] Membatasi referrer leakage
[✓] Membatasi browser permission yang tidak dibutuhkan
[✓] Memberikan basic CSP untuk response API
[✓] Mengaktifkan HSTS pada production
```

### Request Body Size Limit

Backend sudah menambahkan basic request size limit berbasis `Content-Length`.

Limit saat ini:

```txt
1 MB
```

Alasan:

```txt
Payload Sakuin saat ini kecil: auth, profile, categories, transactions, goals, dan export request tidak membutuhkan body besar.
Limit ini membantu mengurangi risiko request payload berlebihan.
```

### Production Error Handling

Error handler backend sudah diperketat.

Behavior:

```txt
Development:
- Error message masih bisa membantu debugging.

Production:
- Error internal 500 tidak membocorkan detail error.
- Response menggunakan pesan umum "Internal server error".
- HttpError yang aman untuk user tetap dapat mengirim pesan valid seperti token invalid, route tidak ditemukan, atau validasi gagal.
```

Format error tetap mengikuti standar:

```json
{
  "success": false,
  "message": "Pesan error",
  "errors": null
}
```

### Security yang Belum Dikerjakan

Beberapa hal yang belum diterapkan dan perlu direncanakan:

```txt
[ ] Rate limiting login/register
[ ] Stronger password policy
[ ] Better JWT expiration strategy
[ ] Refresh token strategy
[ ] Migrasi auth ke httpOnly secure cookie
[ ] CSRF strategy jika pindah ke cookie
[ ] XSS hardening lanjutan
[ ] CSP lanjutan untuk frontend
[ ] Audit localStorage token risk
[ ] Optional audit logging
[ ] Privacy policy jika nanti ada fitur sensitif
```

Catatan penting:

```txt
Jangan membuat fitur email/e-wallet/m-banking transaction detection sebelum security matang.
Fitur tersebut sensitif dan membutuhkan OAuth resmi, scope minimal, token encryption, dan privacy policy.
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
Jika CI gagal karena environment/database, cek repository secrets GitHub Actions.
```

---

## Status Project

Status project saat ini:

```txt
Production Ready
PWA Installable Support Completed
Transactions Mobile Date Range UX Completed
Basic API Security Hardening Completed
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
[✓] Transactions mobile date filter UX sudah diperbaiki
[✓] Categories berjalan
[✓] Goals berjalan
[✓] Profile berjalan
[✓] Export berjalan
[✓] PWA installable support berjalan
[✓] Toast notification berjalan
[✓] Confirm dialog berjalan
[✓] AppShell responsive berjalan
[✓] Frontend automated tests berjalan
[✓] Backend automated tests berjalan
[✓] TanStack Query cache diterapkan
[✓] Performance/UX optimization diterapkan di semua page utama
[✓] Basic API security headers diterapkan
[✓] Request body size limit diterapkan
[✓] Production error handling diperketat
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
[✓] Summary dashboard muncul
[✓] Tambah transaksi
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Filter/search/sort/pagination transaksi
[✓] Filter tanggal transaksi di mobile tampil lebih jelas
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
[✓] Tombol install PWA berjalan atau menampilkan instruksi manual
[✓] Logout
[✓] Login ulang
[✓] Refresh route protected tidak 404
[✓] CI passed
[✓] Vercel deployment passed
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
13. Jangan commit secret.
14. Jangan mengubah Prisma schema tanpa migration dan test.
15. Jangan mengubah auth flow tanpa regression test register/login/me/logout/protected route.
16. Jangan mengubah CORS/deployment config tanpa validasi production.
17. Jangan cache data private user di service worker.
18. Jangan membuat fitur sensitif seperti email/e-wallet detection sebelum security matang.
```

---

## Hal yang Harus Dijaga

Jangan mengubah hal berikut sembarangan:

```txt
[!] Auth flow
[!] Prisma schema
[!] CORS production
[!] Environment variable production
[!] API response format
[!] Query key dan invalidation TanStack Query
[!] AppShell layout
[!] ToastProvider
[!] ConfirmDialog
[!] Service worker caching strategy
[!] Security middleware global
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Update backend tests
[ ] Jalankan backend typecheck/test/build
[ ] Cek CI
[ ] Cek production
```

Jika mengubah auth:

```txt
[ ] Test register
[ ] Test login
[ ] Test /api/auth/me
[ ] Test logout
[ ] Test protected route
[ ] Evaluasi token/session security
```

Jika mengubah service worker:

```txt
[ ] Jangan cache API private user sembarangan
[ ] Jangan cache endpoint auth/transactions/summary/profile
[ ] Test install PWA
[ ] Test reload production
[ ] Test behavior update aplikasi
```

---

## Release Notes

Release yang sudah tercatat:

```txt
v0.1.0 - Sakuin MVP release
v0.1.1 - Sakuin production deployment release
v0.2.0 - Category management release
v0.4.0 - App-wide caching and UX performance optimization
```

Catatan:

```txt
Tag hanya dibuat ketika ada penambahan fitur besar, perbaikan penting, atau milestone release.
Jangan membuat tag hanya untuk perubahan kecil yang belum layak release.
```

Untuk perubahan dokumentasi/security kecil-menengah, cukup commit biasa kecuali memang diputuskan sebagai release milestone.

---

## Backlog Lanjutan

Fitur dan improvement yang belum dibuat:

```txt
[ ] Security documentation lanjutan di docs/API.md dan docs/HANDOFF.md
[ ] PWA update prompt
[ ] Bundle size optimization
[ ] Budgeting per kategori
[ ] Recurring transaction
[ ] Advanced auth security / cookie migration
[ ] Rate limiting login/register
[ ] Dark mode
[ ] Chat/command input transaksi, contoh: /pengeluaran makan 20000
[ ] Data visualization enhancement
[ ] Import transaksi dari CSV/XLSX
[ ] Multi-account wallet
[ ] Notification/reminder untuk goal atau recurring transaction
[ ] Email/e-wallet transaction detection research
[ ] AI assistant
```

---

## Rekomendasi Pengembangan Berikutnya

Urutan pengembangan yang disarankan dari kondisi terbaru:

```txt
1. Selesaikan Security Documentation
2. Update docs/API.md
3. Update docs/HANDOFF.md
4. Jalankan validasi dokumentasi minimal
5. Commit/push dokumentasi
6. Cek CI dan deploy
7. Lanjut PWA Update Prompt
8. Lanjut Bundle Size Optimization jika diperlukan
9. Lanjut Budgeting per Category
10. Lanjut Recurring Transaction
11. Riset Advanced Security/Auth Cookie Migration
12. Riset Email/e-wallet Transaction Detection setelah security matang
```

Prioritas paling aman:

```txt
1. Security Documentation
2. PWA Update Prompt
3. Bundle Size Optimization
4. Budgeting per Category
5. Recurring Transaction
```

Alasan:

```txt
Security documentation penting karena backend baru saja mendapat basic hardening.
PWA update prompt membuat installed webapp lebih nyaman saat ada versi baru.
Bundle optimization mengurangi warning chunk size.
Budgeting per category adalah ekstensi paling natural dari category + transaction.
Recurring transaction berguna untuk transaksi rutin seperti gaji, kos, cicilan, dan langganan.
```

---

## Validasi Setelah Update Dokumentasi

Jika hanya `README.md` yang berubah, jalankan minimal:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Jika ingin full confidence sebelum commit:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

---

## Suggested Commit untuk README

Setelah mengganti README dan validasi aman:

```bash
git status
git diff -- README.md
git add README.md
git commit -m "Update README with security and PWA status"
git push
```

Setelah push:

```txt
[ ] Cek GitHub Actions CI
[ ] Cek Vercel deployment
[ ] Cek production smoke test singkat
```

---

## License

Project ini dibuat sebagai project pengembangan aplikasi web pengelola keuangan pribadi.

Lisensi dapat ditentukan kemudian sesuai kebutuhan pemilik repository.