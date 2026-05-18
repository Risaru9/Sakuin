# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang **mobile-friendly**, sederhana, cepat, aman secara bertahap, dan nyaman digunakan di HP, tablet, laptop, maupun desktop.

Sakuin awalnya dikembangkan sebagai aplikasi pencatatan pemasukan dan pengeluaran pribadi. Namun arah produknya sekarang mulai dikembangkan lebih jauh agar tidak hanya menjadi pengganti spreadsheet, melainkan menjadi aplikasi yang membantu user:

- mencatat transaksi lebih cepat;
- memahami kondisi keuangan pribadi;
- memantau saldo dan pengeluaran;
- mengelola kategori;
- membuat target tabungan;
- mengekspor laporan;
- dan ke depannya berpotensi menjadi financial assistant/advisor yang aman.

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
[✓] Quick Transaction / Catat Cepat berjalan
[✓] Security hardening baseline berjalan
[✓] Security tests tambahan berjalan
[✓] Semua fitur utama berjalan normal di production
[✓] Manual production regression terakhir aman
```

---

## Product Direction

Sakuin tidak diarahkan hanya menjadi aplikasi catatan keuangan biasa.

Arah produk saat ini:

```txt
Sakuin harus membantu user mengurangi effort pencatatan transaksi.
Sakuin harus terasa lebih praktis daripada spreadsheet/manual tracking.
Sakuin harus menjaga keamanan data keuangan pribadi.
Sakuin harus mengutamakan review user untuk fitur otomatisasi.
Sakuin harus memiliki fondasi security sebelum masuk ke fitur sensitif.
```

Fitur pembeda yang sudah mulai dikembangkan:

```txt
[✓] Quick Transaction / Catat Cepat
[✓] Inline category creation saat input transaksi
[✓] Dashboard ringkas
[✓] Goals tracking
[✓] Export data
[✓] PWA installable support
[✓] Security hardening baseline
```

Rencana jangka panjang:

```txt
[ ] Financial insight/advisor
[ ] Budgeting per category
[ ] Recurring transaction
[ ] Google Login
[ ] Gmail/e-wallet/mobile banking transaction detection
```

Catatan penting:

```txt
Fitur Gmail/e-wallet/mobile banking transaction detection tidak boleh langsung dibuat sebelum security, privacy, consent, token storage, audit log, dan draft-first review flow dirancang dengan matang.
```

---

## Rumusan Masalah

Banyak pengguna masih mencatat keuangan pribadi secara manual atau tersebar di banyak tempat, seperti catatan HP, spreadsheet, aplikasi bank, chat, atau ingatan pribadi. Pola tersebut membuat pengguna sulit untuk:

- mengetahui kondisi saldo secara cepat;
- memantau pemasukan dan pengeluaran;
- mengelompokkan transaksi berdasarkan kategori;
- mencatat banyak transaksi kecil secara konsisten;
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
- mempercepat input transaksi melalui Quick Transaction;
- mendukung kategori transaksi default dan custom;
- membantu pengguna membuat dan memantau target tabungan;
- menyediakan export laporan transaksi;
- memiliki UX yang cepat melalui caching dan optimistic/faster update;
- bisa diinstall sebagai PWA;
- memiliki dasar security hardening untuk API;
- memiliki automated tests untuk fitur inti dan security baseline;
- memiliki struktur kode yang rapi dan mudah dikembangkan.

---

## Fitur Utama

### Authentication

Fitur authentication yang sudah tersedia:

```txt
[✓] Register akun baru
[✓] Login
[✓] Logout
[✓] Protected route
[✓] Auth context di frontend
[✓] Token-based authentication menggunakan JWT Bearer Token
[✓] GET current user/profile
[✓] Generic login error message
```

Catatan security:

```txt
Token saat ini masih disimpan di localStorage.
Ini cukup untuk MVP/production awal, tetapi untuk security tingkat lanjut sebaiknya dipertimbangkan migrasi ke httpOnly secure cookie.
```

Risiko yang perlu dicatat:

```txt
Jika terjadi XSS, token di localStorage berisiko dicuri.
Migrasi ke httpOnly secure cookie harus dilakukan sebagai fase security tersendiri karena berdampak ke backend auth, frontend API client, CORS credentials, logout, CSRF strategy, dan testing.
```

---

### Dashboard

Fitur dashboard yang sudah tersedia:

```txt
[✓] Menampilkan total saldo
[✓] Menampilkan total pemasukan
[✓] Menampilkan total pengeluaran
[✓] Menampilkan batas saldo aman
[✓] Menampilkan status aman/waspada berdasarkan safe balance limit
[✓] Menampilkan transaksi terbaru
[✓] Menampilkan statistik/trend keuangan 6 bulan
[✓] Menampilkan ringkasan goals
[✓] Menampilkan goal prioritas
[✓] Tambah transaksi langsung dari dashboard
[✓] Tombol Catat Cepat dari dashboard
[✓] Data dashboard memakai cache agar tidak loading berulang saat pindah halaman
[✓] Background refetch menggunakan TanStack Query
```

---

### Transactions

Fitur transaksi yang sudah tersedia:

```txt
[✓] Tambah transaksi pemasukan
[✓] Tambah transaksi pengeluaran
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Search transaksi berdasarkan catatan
[✓] Filter berdasarkan tipe transaksi
[✓] Filter berdasarkan kategori
[✓] Filter berdasarkan rentang tanggal
[✓] UX filter tanggal mobile sudah diperjelas dengan label dan helper text
[✓] Sorting transaksi
[✓] Pagination backend-driven
[✓] Limit data per halaman
[✓] Confirm dialog untuk hapus transaksi
[✓] Toast notification untuk feedback aksi
[✓] Cache dan background refetch menggunakan TanStack Query
[✓] Optimistic/faster action UX untuk edit dan delete
[✓] Ownership protection berdasarkan user login
```

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

### Quick Transaction / Catat Cepat

Quick Transaction adalah fitur input transaksi cepat berbasis teks natural sederhana.

Tujuan fitur:

```txt
Mengurangi effort user saat mencatat transaksi.
Membuat Sakuin terasa lebih praktis daripada spreadsheet.
Memungkinkan user memasukkan banyak transaksi sekaligus.
```

Contoh input yang didukung:

```txt
makan 15000
kopi 18000
bensin 30000
gaji 3000000
dikasih uang kakak 100000
di kasih uang kakak 100000
uang dari orang tua 500000
```

Fitur yang sudah tersedia:

```txt
[✓] Tombol Catat Cepat muncul di Dashboard
[✓] Tombol Catat Cepat muncul di TransactionsPage
[✓] User bisa mengetik banyak transaksi sekaligus
[✓] Parser rule-based membaca nominal dan konteks sederhana
[✓] Parser membedakan INCOME dan EXPENSE untuk pola umum
[✓] Parser mengenali beberapa variasi bahasa Indonesia informal
[✓] Parser menggunakan kategori existing/custom jika cocok
[✓] Fallback ke kategori Lain jika kategori tidak cocok
[✓] Draft bisa diedit sebelum disimpan
[✓] Draft bisa dihapus sebelum disimpan
[✓] User bisa simpan semua draft setelah review
[✓] Low confidence/warning dapat ditampilkan untuk draft yang perlu dicek
[✓] UI draft review dibuat collapsed agar tidak terlalu berat di mobile
```

Prinsip penting:

```txt
Quick Transaction tidak langsung menyimpan transaksi final.
Parser hanya membuat draft.
User harus review dan approve sebelum transaksi disimpan.
```

Batasan saat ini:

```txt
Parser masih rule-based, bukan AI/LLM.
Parser tidak ditargetkan memahami semua kemungkinan bahasa natural.
Peningkatan NLP/AI parser dapat dilakukan nanti, tetapi tetap harus draft-first.
```

---

### Categories

Fitur kategori yang sudah tersedia:

```txt
[✓] Melihat default category
[✓] Membuat custom category
[✓] Edit custom category
[✓] Hapus custom category
[✓] Filter category berdasarkan ALL, INCOME, dan EXPENSE
[✓] Default category tidak bisa diedit
[✓] Default category tidak bisa dihapus
[✓] Category yang dipakai transaksi tidak bisa dihapus
[✓] Category ownership protection
[✓] Cache category menggunakan TanStack Query
[✓] Category langsung terintegrasi dengan Add/Edit Transaction
[✓] Inline category creation dari AddTransactionModal
[✓] Inline category creation dari EditTransactionModal
```

UX terbaru:

```txt
Kategori tidak lagi diprioritaskan sebagai menu utama mobile.
User bisa membuat kategori baru langsung saat membuat/edit transaksi.
Kategori Lain/Other diposisikan di bawah agar user tetap diarahkan memakai kategori yang lebih spesifik terlebih dahulu.
Jika nama kategori sudah ada, sistem memakai kategori existing dan tidak membuat duplikat.
```

---

### Goals

Fitur goals yang sudah tersedia:

```txt
[✓] Membuat target tabungan
[✓] Edit goal
[✓] Hapus goal
[✓] Tambah dana/progress ke goal
[✓] Melihat progress goal
[✓] Set goal prioritas untuk dashboard
[✓] Clear invalid priority goal jika goal dihapus
[✓] Validasi current amount tidak boleh melebihi target amount
[✓] Ownership protection
[✓] Confirm dialog untuk aksi hapus
[✓] Toast notification untuk feedback aksi
[✓] Cache dan optimistic/faster action UX menggunakan TanStack Query
```

Aturan validasi goal:

```txt
name wajib diisi
targetAmount harus lebih dari 0
currentAmount tidak boleh negatif
currentAmount tidak boleh lebih besar dari targetAmount
```

---

### Profile

Fitur profile yang sudah tersedia:

```txt
[✓] Melihat profile user
[✓] Update nama user
[✓] Update safe balance limit
[✓] Logout
[✓] Nama user langsung sinkron ke AppShell/sidebar
[✓] Safe balance limit langsung memengaruhi summary/dashboard setelah refresh cache
[✓] Toast notification untuk feedback aksi
[✓] Cache profile menggunakan TanStack Query
```

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

Fitur export yang sudah tersedia:

```txt
[✓] Export transaksi ke JSON
[✓] Export transaksi ke CSV
[✓] Export transaksi ke XLSX
[✓] Filter export berdasarkan tipe transaksi
[✓] Filter export berdasarkan kategori
[✓] Filter export berdasarkan rentang tanggal
[✓] Custom nama file export
[✓] Preview nama file sebelum download
[✓] Validasi rentang tanggal
[✓] Tombol export disabled saat file sedang diproses
[✓] Toast notification untuk feedback export
[✓] Download memakai auth flow standar melalui API client
[✓] Export hanya memuat data user login
[✓] Export isolation sudah diuji untuk JSON/CSV/XLSX
```

---

### PWA

Sakuin sudah memiliki basic PWA installable support.

Yang sudah tersedia:

```txt
[✓] manifest.webmanifest
[✓] PWA icons
[✓] Maskable icons
[✓] offline.html
[✓] sw.js
[✓] Service worker registration
[✓] Meta tag PWA di index.html
[✓] Tombol install aplikasi
[✓] Fallback instruksi manual jika browser tidak menyediakan install prompt
[✓] Webapp bisa diinstall seperti aplikasi
```

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

Hal yang belum dibuat:

```txt
[ ] PWA update prompt
[ ] Better offline mode
[ ] App version display
[ ] Install guide modal/page
```

Catatan penting:

```txt
Service worker tidak boleh cache API private user seperti auth, transactions, summary, profile, goals, export, atau endpoint lain yang memuat data personal.
```

---

### UI/UX

Status UI/UX:

```txt
[✓] Responsive layout untuk mobile, tablet, laptop, dan desktop
[✓] Sidebar desktop
[✓] Bottom navigation mobile
[✓] AppShell reusable untuk halaman utama
[✓] Modal overlay konsisten
[✓] ConfirmDialog custom
[✓] ToastProvider global
[✓] Loading state dan error state konsisten
[✓] Caching global dengan TanStack Query
[✓] Optimistic/faster action UX pada halaman utama
[✓] Transactions mobile date range filter sudah dipoles
[✓] Tampilan clean, sederhana, dan modern
[✓] Quick Transaction draft review dibuat lebih ringkas untuk mobile
```

---

## Tech Stack

### Monorepo

```txt
pnpm workspace
TypeScript
```

### Frontend

```txt
React
Vite
TypeScript
React Router
Tailwind CSS
TanStack Query
Recharts
lucide-react
clsx
tailwind-merge
Vitest
Testing Library
jsdom
PWA basic support
```

### Backend

```txt
Node.js
Hono
TypeScript
Prisma ORM
PostgreSQL / Supabase PostgreSQL
Zod
JWT
bcryptjs
ExcelJS
Vitest
```

### Database

```txt
PostgreSQL
Supabase PostgreSQL
Prisma migration
Prisma seed
```

### Deployment dan CI

```txt
Vercel untuk frontend
Vercel untuk backend Hono serverless function
Supabase untuk database
GitHub sebagai repository
GitHub Actions untuk CI
```

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

Catatan:

```txt
docs/SECURITY.md belum ada pada saat README ini diperbarui.
File tersebut akan dibuat pada fase Security Documentation.
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

Dokumen security khusus belum tersedia dan akan dibuat pada fase berikutnya:

```txt
docs/SECURITY.md
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

Frontend test terakhir yang pernah tercatat:

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

Catatan:

```txt
Jumlah backend test dapat bertambah seiring security hardening.
Gunakan output test lokal/CI terbaru sebagai sumber kebenaran.
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

Security bukan kondisi absolut. Project ini tidak boleh diklaim "aman 100%". Target realistis security Sakuin adalah mengurangi risiko melalui validasi, authentication, authorization, data isolation, rate limiting, safe error handling, dan dokumentasi yang jelas.

---

### Security yang Sudah Ada

Fondasi security yang sudah diterapkan:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation untuk validasi request body/query/params
[✓] JWT Bearer Token authentication
[✓] bcryptjs untuk password hashing
[✓] Protected endpoint
[✓] User ownership check pada data user
[✓] CORS production dibatasi
[✓] Secret tidak disimpan di repository
[✓] Security headers middleware
[✓] Request body size limit basic
[✓] Production error handling lebih aman
[✓] Login rate limiting
[✓] Register rate limiting
[✓] General API rate limiting
[✓] Data isolation tests
[✓] Auth/token edge case tests
[✓] Rate limit/API abuse edge case tests
```

---

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

---

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

---

### CORS

CORS production dibatasi.

Allowed origin utama:

```txt
http://127.0.0.1:3000
http://localhost:3000
FRONTEND_URL dari environment
https://sakuin-web.vercel.app
Vercel preview domain dari account yang diizinkan
```

Allowed headers:

```txt
Content-Type
Authorization
```

Allowed methods:

```txt
GET
POST
PUT
PATCH
DELETE
OPTIONS
```

Catatan:

```txt
Jangan mengubah CORS production tanpa regression test dan production verification.
```

---

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

---

### Rate Limiting

Backend sudah memiliki rate limit baseline.

Rate limit yang sudah tersedia:

```txt
[✓] Login rate limit
[✓] Register rate limit
[✓] General API rate limit
```

Header rate limit:

```txt
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After saat 429
```

Rate limit tests yang sudah dibuat:

```txt
[✓] Login rate limit memblok IP + email yang sama
[✓] Login rate limit tidak memblok email berbeda dari IP berbeda
[✓] Register rate limit memblok spam register dari IP yang sama
[✓] General API rate limit memblok request berlebihan dari IP yang sama
[✓] 429 response memiliki Retry-After
[✓] 429 response memiliki RateLimit-Limit
[✓] 429 response memiliki RateLimit-Remaining
[✓] 429 response memiliki RateLimit-Reset
[✓] Rate limit store bisa di-reset antar test
```

Catatan penting:

```txt
Rate limit saat ini menggunakan in-memory store.
Ini cukup untuk baseline/MVP dan low-scale usage.
Namun untuk production serverless/multi-instance, in-memory store tidak ideal karena setiap instance bisa memiliki state berbeda.
Jika traffic meningkat, pertimbangkan Redis/Upstash/KV-based rate limiting.
```

---

### Data Isolation

Data isolation adalah prinsip utama karena Sakuin menyimpan data keuangan pribadi.

Proteksi yang sudah ada:

```txt
[✓] User hanya bisa membaca transaksi miliknya sendiri
[✓] User hanya bisa update transaksi miliknya sendiri
[✓] User hanya bisa delete transaksi miliknya sendiri
[✓] User tidak bisa memakai custom category milik user lain
[✓] User tidak bisa update/delete category milik user lain
[✓] User tidak bisa akses/update/delete goal milik user lain
[✓] Summary hanya menghitung data user login
[✓] Export hanya memuat data user login
```

Data isolation tests yang sudah tersedia:

```txt
[✓] Summary hanya menghitung transaksi user login
[✓] Summary recent transactions tidak memuat transaksi user lain
[✓] Summary category breakdown tidak memuat custom category user lain
[✓] Export JSON hanya memuat transaksi user login
[✓] Export JSON dengan categoryId milik user lain menghasilkan data kosong dan tidak bocor
[✓] Export CSV tidak memuat catatan/transaksi/custom category user lain
[✓] Export XLSX tidak memuat catatan/transaksi/custom category user lain
[✓] Export filter type tetap hanya menghitung transaksi user login
```

---

### Auth & Token Edge Case Testing

Auth/token edge cases yang sudah diuji:

```txt
[✓] Authorization: Bearer tanpa token valid ditolak
[✓] Token signature salah ditolak
[✓] Token expired ditolak
[✓] Token tanpa userId ditolak
[✓] Token dengan userId bukan string ditolak
[✓] Token valid milik user yang sudah dihapus tidak bisa mengambil profile
[✓] Register dengan password lemah ditolak
[✓] Login dengan email tidak valid ditolak sebelum masuk auth service
```

---

### Security yang Belum Dikerjakan

Beberapa hal yang belum diterapkan dan perlu direncanakan:

```txt
[ ] Dedicated docs/SECURITY.md
[ ] Security logging dan audit trail
[ ] Request ID untuk observability
[ ] Failed login logging tanpa data sensitif
[ ] Rate limit hit logging tanpa data sensitif
[ ] Better JWT expiration strategy
[ ] Refresh token strategy
[ ] Migrasi auth ke httpOnly secure cookie
[ ] CSRF strategy jika pindah ke cookie
[ ] XSS hardening lanjutan
[ ] CSP lanjutan untuk frontend
[ ] Audit localStorage token risk
[ ] Distributed rate limit dengan Redis/Upstash/KV
[ ] Privacy policy jika nanti ada fitur sensitif
[ ] Token encryption untuk OAuth integration
[ ] Revoke/disconnect mechanism untuk integration sensitif
```

---

### Sensitive Integration Policy

Fitur sensitif seperti Gmail/e-wallet/mobile banking transaction detection belum boleh langsung dibuat.

Prinsip wajib untuk integrasi sensitif:

```txt
[ ] Jangan pernah meminta password email/user banking
[ ] Gunakan OAuth resmi jika integrasi provider dibutuhkan
[ ] Gunakan scope minimal
[ ] Jangan meminta Gmail scope saat user hanya ingin login dengan Google
[ ] Jangan membaca semua email tanpa alasan kuat
[ ] Parsing hanya email transaksi yang relevan
[ ] Jangan menyimpan raw email
[ ] Simpan hanya hasil ekstraksi transaksi yang diperlukan
[ ] Hasil deteksi harus menjadi draft transaksi
[ ] User wajib review dan approve sebelum transaksi disimpan
[ ] User harus bisa disconnect akses
[ ] User harus bisa revoke/delete token
[ ] User harus bisa menghapus data hasil parsing
[ ] Token OAuth harus dienkripsi jika disimpan
[ ] Jangan log access token, refresh token, raw email, atau isi email sensitif
[ ] Buat privacy policy yang jelas
[ ] Buat audit log untuk connect/disconnect/sync
```

Urutan yang benar sebelum implementasi Gmail/e-wallet detection:

```txt
1. Security Documentation
2. Gmail/e-wallet integration architecture
3. Google Cloud/OAuth consent planning
4. Scope decision
5. Token storage design
6. Privacy/disclosure planning
7. Draft detection design
8. Review UI design
9. Disconnect/revoke flow
10. Baru implement kecil bertahap
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

Catatan penting:

```txt
Jangan commit secret.
Jangan memakai URL dashboard Vercel sebagai API URL.
Jangan memakai preview URL yang terkena Vercel Authentication sebagai production API URL.
Setelah mengubah environment variable di Vercel, lakukan redeploy.
```

---

## GitHub Actions CI

CI berjalan melalui GitHub Actions.

Validasi CI mencakup:

```txt
[✓] pnpm install dengan frozen lockfile
[✓] Prisma client/schema sync
[✓] Frontend tests
[✓] Frontend typecheck
[✓] Frontend build
[✓] Backend typecheck
[✓] Backend tests
[✓] Backend build
```

Jika CI gagal pada tahap install:

```txt
Kemungkinan package.json dan pnpm-lock.yaml tidak sinkron.
Jalankan pnpm install, commit pnpm-lock.yaml, lalu push ulang.
```

Jika CI gagal karena environment/database:

```txt
Cek repository secrets GitHub Actions.
Pastikan DATABASE_URL, DIRECT_URL, JWT_SECRET, dan environment terkait tersedia.
```

---

## Status Project

Status project saat ini:

```txt
Production Ready
PWA Installable Support Completed
Transactions Mobile Date Range UX Completed
Quick Transaction MVP Completed
Security Hardening Baseline Completed
Security Extended Tests Completed
Data Isolation Tests Completed
Auth Token Edge Case Tests Completed
Rate Limit Abuse Edge Case Tests Completed
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
[✓] Quick Transaction berjalan
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
[✓] Rate limiting diterapkan
[✓] Security baseline tests diterapkan
[✓] Data isolation tests diterapkan
[✓] Auth/token edge case tests diterapkan
[✓] Rate limit/API abuse edge case tests diterapkan
```

---

## Manual Production Smoke Test

Checklist production yang perlu dicek setelah perubahan besar:

```txt
[ ] Buka frontend production
[ ] Backend /health aktif
[ ] Backend /api/health aktif
[ ] Register
[ ] Login
[ ] Dashboard tampil normal
[ ] Summary dashboard muncul
[ ] Tambah transaksi manual
[ ] Edit transaksi
[ ] Hapus transaksi
[ ] Catat Cepat dari Dashboard
[ ] Catat Cepat dari TransactionsPage
[ ] Review draft Catat Cepat
[ ] Save draft Catat Cepat
[ ] Filter/search/sort/pagination transaksi
[ ] Filter tanggal transaksi di mobile tampil jelas
[ ] Tambah category custom
[ ] Edit category custom
[ ] Hapus category custom
[ ] Tambah category inline dari modal transaksi
[ ] Tambah goal
[ ] Edit goal
[ ] Tambah dana goal
[ ] Hapus goal
[ ] Set goal prioritas dashboard
[ ] Update profile
[ ] Update safe balance limit
[ ] Export JSON
[ ] Export CSV
[ ] Export XLSX
[ ] Tombol install PWA berjalan atau menampilkan instruksi manual
[ ] Logout
[ ] Login ulang
[ ] Refresh route protected tidak 404
[ ] CI passed
[ ] Vercel deployment passed
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
19. Jangan auto-save transaksi hasil parser natural language tanpa user review.
20. Jangan mengklaim security 100% aman.
```

---

## Hal yang Harus Dijaga

Jangan mengubah hal berikut sembarangan:

```txt
[!] Auth flow
[!] JWT payload format
[!] Prisma schema
[!] CORS production
[!] Environment variable production
[!] API response format
[!] Query key dan invalidation TanStack Query
[!] AppShell layout
[!] ToastProvider
[!] ConfirmDialog
[!] Service worker caching strategy
[!] Export response format
[!] Ownership/data isolation checks
[!] Rate limit middleware tanpa test
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Update Prisma Client
[ ] Update backend tests
[ ] Test lokal
[ ] Cek CI
```

Jika mengubah auth:

```txt
[ ] Test register
[ ] Test login
[ ] Test logout
[ ] Test /api/auth/me
[ ] Test protected route frontend
[ ] Test token invalid/expired
[ ] Pertimbangkan risiko CSRF jika pindah ke cookie
```

Jika mengubah service worker:

```txt
[ ] Jangan cache endpoint private user
[ ] Jangan cache auth response
[ ] Jangan cache transactions/summary/profile/export
[ ] Test installed PWA
[ ] Test refresh app setelah deploy
```

---

## Roadmap Berikutnya

Prioritas paling aman dari kondisi saat ini:

```txt
1. Phase 24C - Security Documentation
2. Phase 24D - Security Logging & Audit Trail Design
3. Phase 24E - Google Login Design, bukan Gmail reading
4. Phase 24F - Gmail Transaction Detection Architecture
5. Phase 24G - Distributed Rate Limit / Production Hardening
6. PWA Update Prompt
7. Bundle Size Optimization
8. Budgeting per Category
9. Recurring Transaction
```

---

### Phase 24C — Security Documentation

Status:

```txt
[ ] Belum selesai
```

Target:

```txt
Membuat dokumentasi security/privacy sebelum fitur Gmail/e-wallet/mobile banking transaction detection dibuat.
```

File yang akan dibuat:

```txt
docs/SECURITY.md
```

File yang mungkin diupdate:

```txt
README.md
docs/API.md
docs/HANDOFF.md
```

Isi utama `docs/SECURITY.md`:

```txt
[ ] Current security baseline
[ ] Auth/security architecture
[ ] Data isolation principle
[ ] Rate limit behavior
[ ] Error handling principle
[ ] CORS/security headers/body limit
[ ] Sensitive integration policy
[ ] Google Login vs Gmail API distinction
[ ] Gmail integration rules
[ ] Draft-first transaction detection
[ ] Token storage requirement
[ ] Raw email storage prohibition
[ ] Consent/disconnect/revoke requirement
[ ] Audit log requirement
[ ] Future security roadmap
```

---

### Phase 24D — Security Logging & Audit Trail Design

Rencana:

```txt
[ ] Request ID
[ ] Auth event logging
[ ] Failed login logging
[ ] Rate limit hit logging
[ ] No sensitive data in logs
[ ] Audit event untuk Gmail connect/disconnect nanti
```

Catatan:

```txt
Logging tidak boleh membocorkan password, token, raw email, isi email, atau data sensitif user.
```

---

### Phase 24E — Google Login Design

Rencana:

```txt
[ ] Desain Sign in with Google untuk authentication
[ ] Jangan gabungkan Google Login dengan Gmail reading
[ ] Tentukan account linking strategy
[ ] Tambahkan provider field jika diperlukan
[ ] Pertimbangkan user existing email/password
```

Prinsip:

```txt
Login dengan Google tidak sama dengan akses Gmail.
Jangan meminta Gmail scope hanya untuk login.
```

---

### Phase 24F — Gmail Transaction Detection Architecture

Rencana:

```txt
[ ] Dokumen arsitektur terlebih dahulu
[ ] Tentukan email provider/scope/query
[ ] Tentukan token encryption strategy
[ ] Tentukan sync strategy
[ ] Tentukan draft-first extraction
[ ] Buat review UI
[ ] Buat disconnect/revoke flow
[ ] Buat privacy/data retention policy
```

Prinsip:

```txt
Hasil deteksi email harus menjadi draft transaksi.
User harus review sebelum transaksi disimpan.
Raw email tidak boleh disimpan jika tidak benar-benar diperlukan.
```

---

### Phase 24G — Distributed Rate Limit / Production Hardening

Rencana:

```txt
[ ] Evaluasi Redis/Upstash/KV-based rate limit
[ ] Better session/token strategy
[ ] Refresh token rotation
[ ] Optional email verification
[ ] Optional secure forgot password flow
```

---

### PWA Update Prompt

Rencana:

```txt
[ ] Detect service worker update
[ ] Tampilkan toast "Versi baru tersedia"
[ ] Tombol "Update sekarang"
[ ] Reload app setelah service worker baru aktif
```

---

### Bundle Size Optimization

Rencana:

```txt
[ ] Lazy loading route
[ ] Code splitting
[ ] Dynamic import untuk halaman besar
[ ] Recharts lazy load jika diperlukan
```

---

### Budgeting per Category

Rencana fitur:

```txt
User bisa membuat budget bulanan per kategori.
Contoh:
- Makanan Mei 2026: Rp 1.000.000
- Terpakai: Rp 650.000
- Sisa: Rp 350.000
- Status: Aman
```

Catatan:

```txt
Fitur ini natural setelah categories + transactions stabil, tetapi tidak lebih prioritas daripada security documentation.
```

---

### Recurring Transaction

Rencana fitur:

```txt
[ ] Transaksi rutin seperti gaji, kos, cicilan, langganan
[ ] Draft transaksi berulang
[ ] Reminder sebelum transaksi dibuat
[ ] User approval sebelum transaksi final dibuat
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
git commit -m "Update README with latest security status"
git push
```

Setelah push:

```txt
[ ] Cek GitHub Actions CI
[ ] Cek Vercel deployment
[ ] Cek production smoke test singkat
```

Catatan:

```txt
Jika README ini hanya bagian pertama dari rangkaian update dokumentasi, commit bisa ditunda sampai docs/API.md, docs/HANDOFF.md, dan docs/SECURITY.md selesai diupdate.
```

---

## License

Project ini dibuat sebagai project pengembangan aplikasi web pengelola keuangan pribadi.

Lisensi dapat ditentukan kemudian sesuai kebutuhan pemilik repository.