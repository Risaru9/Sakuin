# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang **mobile-friendly**, sederhana, cepat, aman secara bertahap, dan nyaman digunakan di HP, tablet, laptop, maupun desktop.

Sakuin awalnya dikembangkan sebagai aplikasi pencatatan pemasukan dan pengeluaran pribadi. Arah produk sekarang dikembangkan lebih jauh agar tidak hanya menjadi pengganti spreadsheet, tetapi menjadi aplikasi yang membantu user:

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
[✓] Audit trail database berjalan
[✓] Semua fitur utama berjalan normal di production
[✓] Manual production smoke test terakhir aman
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
[✓] Safe request/security logging
[✓] Database-backed audit trail
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
- memiliki UX cepat melalui caching dan optimistic/faster update;
- bisa diinstall sebagai PWA;
- memiliki security hardening untuk API;
- memiliki request ID, safe logging, dan audit trail;
- memiliki automated tests untuk fitur inti, data isolation, dan security;
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
[✓] Auth/token edge case tests
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
[✓] UX filter tanggal mobile sudah diperjelas
[✓] Sorting transaksi
[✓] Pagination backend-driven
[✓] Limit data per halaman
[✓] Confirm dialog untuk hapus transaksi
[✓] Toast notification untuk feedback aksi
[✓] Cache dan background refetch menggunakan TanStack Query
[✓] Optimistic/faster action UX untuk edit dan delete
[✓] Ownership protection berdasarkan user login
[✓] Audit event untuk create/update/delete transaksi
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
[✓] Audit event untuk create/update/delete category
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
[✓] Audit event untuk create/update/delete goal
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
[✓] Audit event untuk update profile
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
[✓] Audit event untuk export transaksi
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

## Security Status

Sakuin sudah memiliki security hardening baseline dan audit trail untuk MVP/production awal.

Security bukan kondisi absolut. Project ini tidak boleh diklaim 100% aman. Target realistis security Sakuin adalah mengurangi risiko, menjaga data user tetap terisolasi, dan mencegah data sensitif bocor melalui response, log, export, atau audit metadata.

Security yang sudah tersedia:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation untuk body/query/params
[✓] JWT Bearer Token authentication
[✓] bcryptjs password hashing
[✓] Protected endpoint
[✓] User ownership checks
[✓] CORS production allowlist
[✓] Security headers middleware
[✓] Request body size limit 1 MB
[✓] Production error masking untuk error internal
[✓] Login rate limiting
[✓] Register rate limiting
[✓] General API rate limiting
[✓] Data isolation tests
[✓] Auth/token edge case tests
[✓] Rate limit/API abuse edge case tests
[✓] Request ID via X-Request-Id
[✓] Safe request logging
[✓] Safe security event logging
[✓] Audit event contract
[✓] Audit event recorder
[✓] Database-backed AuditLog
[✓] Fail-open audit persistence
```

Security yang masih menjadi backlog:

```txt
[ ] Distributed rate limiting dengan Redis/Upstash/KV
[ ] Better JWT/session strategy
[ ] Refresh token strategy
[ ] Migrasi auth ke httpOnly secure cookie
[ ] CSRF strategy jika memakai cookie
[ ] OAuth token encryption untuk integrasi sensitif
[ ] Gmail disconnect/revoke mechanism
[ ] Privacy policy untuk integrasi sensitif
[ ] Data retention policy lanjutan untuk hasil ekstraksi transaksi
```

---

## Request ID dan Logging

Backend sudah menambahkan request ID pada response.

Header:

```txt
X-Request-Id
```

Tujuan:

```txt
[✓] Memudahkan debugging request production
[✓] Menghubungkan request log, security event, dan audit event
[✓] Membantu tracing tanpa menyimpan token/body sensitif
```

Safe request logging mencatat:

```txt
method
path
status
durationMs
requestId
timestamp
```

Safe request logging tidak boleh mencatat:

```txt
password
token
Authorization header
raw request body
transaction amount
transaction note
goal amount
category name
export content
raw email
OAuth token
```

---

## Security Event Logging

Sakuin memiliki safe security event logger untuk event keamanan yang lebih cocok dicatat di log aplikasi.

Event yang sudah didukung:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Prinsip logging:

```txt
[✓] Failed login tidak menyimpan password
[✓] Failed login tidak menyimpan email mentah
[✓] Auth failure tidak menyimpan token
[✓] Rate limit hit tidak menyimpan body/token
[✓] Metadata sensitif otomatis diredact
```

Security event saat ini tetap diperlakukan sebagai application log, bukan semua dimasukkan ke database audit trail, karena event seperti failed login dan rate limit bisa high-volume.

---

## Audit Trail

Sakuin sudah memiliki database-backed audit trail menggunakan Prisma model `AuditLog`.

Audit trail digunakan untuk mencatat event bisnis penting, bukan untuk menyimpan data transaksi mentah.

Event audit yang sudah dicatat:

```txt
profile.updated
export.transactions_generated
transaction.created
transaction.updated
transaction.deleted
goal.created
goal.updated
goal.deleted
category.created
category.updated
category.deleted
```

Field utama AuditLog:

```txt
id
eventType
status
requestId
actorType
actorUserId
targetType
targetId
metadata
createdAt
```

Prinsip metadata audit:

```txt
[✓] Metadata harus melalui safe metadata sanitizer
[✓] Audit log tidak menyimpan password
[✓] Audit log tidak menyimpan token
[✓] Audit log tidak menyimpan Authorization header
[✓] Audit log tidak menyimpan raw body
[✓] Audit log tidak menyimpan email mentah
[✓] Audit log tidak menyimpan nominal transaksi
[✓] Audit log tidak menyimpan note transaksi
[✓] Audit log tidak menyimpan nama goal
[✓] Audit log tidak menyimpan targetAmount/currentAmount goal
[✓] Audit log tidak menyimpan nama category
[✓] Audit log tidak menyimpan icon/color value category
[✓] Audit log tidak menyimpan isi export
```

Contoh metadata aman:

```json
{
  "changedFields": "name,safeBalanceLimit"
}
```

```json
{
  "format": "xlsx",
  "typeFilter": null,
  "hasCategoryFilter": false,
  "hasDateRange": true
}
```

```json
{
  "type": "EXPENSE",
  "hasNote": true,
  "dateProvided": true
}
```

Audit persistence bersifat **fail-open**:

```txt
Jika penyimpanan audit log gagal, request utama user tetap tidak langsung gagal.
Failure hanya dicatat sebagai safe error log tanpa metadata sensitif.
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
AuditLog table
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
│  │  │  ├─ schema.prisma
│  │  │  └─ migrations/
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
│  ├─ HANDOFF.md
│  └─ SECURITY.md
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

Dokumen security tersedia di:

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

Catatan:

```txt
DATABASE_URL dan DIRECT_URL tidak boleh dicommit.
JWT_SECRET production harus kuat dan berbeda dari development.
FRONTEND_URL production harus mengarah ke frontend production.
```

---

### Frontend Environment

Buat file:

```txt
apps/web/.env
```

Contoh isi:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

Production frontend:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

Catatan:

```txt
VITE_API_BASE_URL tidak boleh diakhiri slash "/".
Setelah mengubah environment variable di Vercel, lakukan redeploy.
```

---

## Local Development Setup

Dari root project:

```bash
cd sakuin
pnpm install
```

Generate Prisma Client:

```bash
pnpm --filter @sakuin/api db:generate
```

Jalankan migration:

```bash
pnpm --filter @sakuin/api db:migrate
```

Seed database:

```bash
pnpm --filter @sakuin/api db:seed
```

Jalankan backend:

```bash
pnpm --filter @sakuin/api dev
```

Backend local:

```txt
http://127.0.0.1:5000
```

Jalankan frontend:

```bash
pnpm --filter @sakuin/web dev
```

Frontend local:

```txt
http://127.0.0.1:3000
```

---

## Important Scripts

### Root Scripts

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm dev:api
pnpm dev:web
```

### Frontend Scripts

```bash
pnpm --filter @sakuin/web dev
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web test:watch
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/web preview
```

### Backend Scripts

```bash
pnpm --filter @sakuin/api dev
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api test:watch
pnpm --filter @sakuin/api build
pnpm --filter @sakuin/api start
```

### Prisma Scripts

```bash
pnpm --filter @sakuin/api db:generate
pnpm --filter @sakuin/api db:migrate
pnpm --filter @sakuin/api db:seed
pnpm --filter @sakuin/api db:studio
pnpm --filter @sakuin/api db:reset
```

---

## Database dan Migration

Database menggunakan Supabase PostgreSQL dengan Prisma ORM.

Model utama:

```txt
User
Transaction
Goal
Category
AuditLog
```

Catatan migration penting:

```txt
Jangan mengubah schema.prisma tanpa migration.
Setelah mengubah Prisma schema, jalankan db:migrate dan db:generate.
Pastikan migration folder ikut dicommit.
```

Command umum:

```bash
pnpm --filter @sakuin/api db:migrate -- --name nama_migration
pnpm --filter @sakuin/api db:generate
```

Jika muncul error `EPERM` saat Prisma generate di Windows:

```txt
Biasanya backend dev server, test process, Prisma Studio, VSCode, atau antivirus sedang mengunci query_engine-windows.dll.node.
Stop semua proses node/tsx lalu jalankan generate ulang.
```

Command bantu:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process tsx -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm --filter @sakuin/api db:generate
```

---

## Validation Commands

Sebelum commit atau push, jalankan validasi sesuai area perubahan.

Jika frontend disentuh:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

Jika backend disentuh:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Jika hanya dokumentasi Markdown yang berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Full regression:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Target:

```txt
Frontend typecheck : passed
Frontend test      : passed
Frontend build     : passed
Backend typecheck  : passed
Backend test       : passed
Backend build      : passed
```

---

## Current Test Status

Status backend test terakhir yang tercatat setelah audit log database sink:

```txt
Test Files : 17 passed
Tests      : 114 passed
Build      : passed
```

Frontend automated tests terakhir yang pernah tercatat:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

Catatan:

```txt
Gunakan output test lokal/CI terbaru sebagai sumber kebenaran.
Jika jumlah test berbeda dari dokumentasi lama, jangan anggap error selama semua test passed.
```

Build frontend sebelumnya pernah menampilkan warning chunk size, tetapi route lazy loading/code splitting sudah dilakukan untuk menghapus warning tersebut.

Jika warning chunk size muncul lagi:

```txt
Warning ini bukan error.
Build tetap valid jika selesai sukses.
Optimasi dapat dilakukan melalui lazy loading route/code splitting/dynamic import.
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

## Deployment Notes

Frontend dan backend sama-sama dideploy ke Vercel.

```txt
Frontend platform : Vercel
Backend platform  : Vercel
Database platform : Supabase PostgreSQL
Backend runtime   : Hono app as Vercel serverless function
```

Catatan penting deployment:

```txt
[✓] Backend memakai Hono app sebagai serverless function.
[✓] app.ts harus default export untuk Vercel serverless.
[✓] Backend CORS harus mengizinkan FRONTEND_URL production.
[✓] Frontend harus memakai VITE_API_BASE_URL production.
[✓] VITE_API_BASE_URL tidak boleh pakai slash belakang.
[✓] Setelah environment variable diubah, redeploy manual diperlukan.
```

Deployment issues yang sudah pernah diselesaikan:

```txt
[✓] Render batal dipakai karena meminta kartu kredit.
[✓] Backend dipindahkan ke Vercel.
[✓] Backend env production diperbaiki.
[✓] CORS mismatch frontend-backend diperbaiki.
[✓] URL dashboard Vercel tidak lagi dipakai sebagai API URL.
[✓] Preview URL yang terkena Vercel Authentication tidak dipakai untuk API production.
[✓] SPA refresh route di Vercel frontend sudah diperbaiki dengan rewrites.
[✓] Lockfile mismatch akibat perubahan package.json sudah diperbaiki.
[✓] GitHub Actions secrets/variables diperbaiki.
[✓] Vercel compatibility issue pada Request/Response typing sudah diperbaiki.
[✓] Prisma Client generate EPERM di Windows diselesaikan dengan menghentikan backend process yang mengunci DLL.
```

---

## Backend Architecture Summary

Backend utama berada di:

```txt
apps/api/src
```

Entry utama:

```txt
apps/api/src/app.ts
apps/api/src/server.ts
```

Core backend:

```txt
config/env.ts                  : validasi environment variable
db/prisma.ts                   : Prisma Client
middlewares/auth               : JWT auth middleware
middlewares/validate           : Zod request validation
middlewares/security           : security headers dan request body size limit
middlewares/rate-limit         : login/register/general API rate limit
middlewares/request-id         : X-Request-Id dan safe request logging
utils/api-response             : response helper
utils/http-error               : HTTP error helper
utils/safe-metadata            : metadata redaction/hash helper
utils/security-event-logger    : safe security event logging
utils/audit-event              : audit event contract
utils/audit-event-recorder     : audit event recorder/context helper
utils/audit-log-sink           : database audit log sink
modules/index.ts               : aggregator route /api
```

Modul backend:

```txt
auth          : register, login, me
users         : profile get/update
categories    : category CRUD
transactions  : transaction CRUD, filter, pagination
summary       : financial summary
goals         : goals CRUD
export        : transaction export JSON/CSV/XLSX
```

---

## Frontend Architecture Summary

Frontend utama berada di:

```txt
apps/web/src
```

Entry utama:

```txt
main.tsx
app/App.tsx
app/router.tsx
```

Core frontend:

```txt
lib/api-client.ts      : API request dan download helper
lib/auth-storage.ts    : localStorage token helper
lib/query-client.ts    : TanStack Query client
lib/query-keys.ts      : query key terpusat
lib/pwa.ts             : PWA install prompt helper
components/layout      : AppShell
components/pwa         : InstallAppButton
components/toast       : ToastProvider/useToast
components/ui          : Button, Input, reusable UI
```

Feature frontend:

```txt
auth          : login/register/auth context
dashboard     : dashboard summary dan recent activity
transactions  : transaction management dan Quick Transaction
categories    : category management
goals         : goal management
profile       : profile and safe balance
export        : transaction export
summary       : summary service/types
health        : backend health check
```

---

## TanStack Query Usage

Sakuin memakai TanStack Query untuk mengurangi blank loading dan mempercepat UX.

Query keys utama:

```txt
summary
profile
categories
goals
transactions
```

Prinsip:

```txt
Gunakan query key terpusat.
Invalidate query yang relevan setelah mutation.
Jaga agar update cepat tetapi tetap benar.
Gunakan optimistic/faster update hanya jika rollback/error handling jelas.
```

---

## Manual Production Smoke Test

Checklist production yang perlu dilakukan setelah perubahan besar:

```txt
[ ] Buka frontend production
[ ] Backend /health aktif
[ ] Backend /api/health aktif
[ ] Register
[ ] Login
[ ] Dashboard tampil normal
[ ] Summary dashboard muncul
[ ] Tambah transaksi
[ ] Edit transaksi
[ ] Hapus transaksi
[ ] Filter/search/sort/pagination transaksi
[ ] Tambah category custom
[ ] Edit category custom
[ ] Hapus category custom
[ ] Tambah goal
[ ] Edit goal
[ ] Hapus goal
[ ] Update profile
[ ] Update safe balance limit
[ ] Export JSON
[ ] Export CSV
[ ] Export XLSX
[ ] Tombol install PWA berjalan atau menampilkan instruksi manual
[ ] Logout
[ ] Login ulang
[ ] Refresh route protected tidak 404
[ ] Cek GitHub Actions CI
[ ] Cek Vercel deployment
```

Checklist tambahan untuk audit trail:

```txt
[ ] Update profile menghasilkan AuditLog profile.updated
[ ] Create/update/delete transaction menghasilkan AuditLog transaction.*
[ ] Create/update/delete category menghasilkan AuditLog category.*
[ ] Create/update/delete goal menghasilkan AuditLog goal.*
[ ] Export transaksi menghasilkan AuditLog export.transactions_generated
[ ] AuditLog metadata tidak memuat token/password/raw body/amount/note/export content
[ ] Tidak ada audit_log_persist_failed di production log
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
21. Jangan menyimpan data sensitif di log atau AuditLog.
22. Audit event harus memakai metadata aman dan sanitizer.
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
[!] Request ID behavior
[!] AuditLog metadata safety
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Update Prisma Client
[ ] Update backend tests
[ ] Test lokal
[ ] Cek CI
[ ] Cek deploy
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
[ ] Jangan cache transactions/summary/profile/goals/export
[ ] Test installed PWA
[ ] Test refresh app setelah deploy
```

Jika mengubah audit/logging:

```txt
[ ] Jangan log password/token/Authorization header
[ ] Jangan log raw body
[ ] Jangan log transaction amount/note
[ ] Jangan log goal amount/name
[ ] Jangan log category name/icon/color value
[ ] Jangan log export content
[ ] Test metadata redaction
[ ] Test fail-open behavior
```

---

## Roadmap Berikutnya

Prioritas paling aman dari kondisi saat ini:

```txt
1. Phase 24D.5 - Security Documentation Sync
2. Phase 24E - Google Login Design, bukan Gmail reading
3. Phase 24F - Gmail Transaction Detection Architecture, tanpa coding API dulu
4. Phase 24G - Distributed Rate Limit / Production Hardening
5. Phase 24H - Advanced Auth Security / Cookie Migration Research
6. Budgeting per Category
7. Recurring Transaction
8. PWA Update Prompt lanjutan
```

Catatan:

```txt
Google Login harus dipisahkan dari Gmail reading.
Gmail/e-wallet detection menyentuh data sangat sensitif sehingga harus dirancang dulu.
Distributed rate limit penting jika traffic meningkat karena in-memory store tidak ideal untuk serverless/multi-instance.
Budgeting per Category adalah fitur produk yang paling natural setelah transaction/category/summary stabil.
```

---

## Suggested Validation untuk Dokumentasi

Jika hanya dokumentasi Markdown yang berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
git diff -- README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
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

Suggested commit setelah semua Markdown selesai:

```bash
git add README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
git commit -m "Update documentation for audit trail security hardening"
git push
```

Setelah push:

```txt
[ ] Cek GitHub Actions CI
[ ] Cek Vercel deployment
[ ] Cek production /health
[ ] Cek production /api/health
```

---

## License

Project ini dibuat sebagai project pengembangan aplikasi web pengelola keuangan pribadi.

Lisensi dapat ditentukan kemudian sesuai kebutuhan pemilik repository.