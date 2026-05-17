# Sakuin Project Handoff

Dokumen ini berisi konteks teknis dan status pengembangan terbaru project **Sakuin**. Tujuannya agar developer atau agent berikutnya dapat langsung memahami kondisi project, keputusan teknis, fitur yang sudah selesai, cara menjalankan project, cara validasi, dan prioritas pengembangan berikutnya.

Dokumen ini harus dibaca sebelum melanjutkan development, terutama karena project sudah berjalan di production dan sudah melewati beberapa fase besar: MVP, deployment, category management, transactions, dashboard, goals, profile, export, app-wide caching/UX optimization, landing/auth/mobile polish, PWA installable support, transactions mobile date filter polish, dan basic API security hardening.

---

## 1. Project Overview

**Sakuin** adalah webapp pengelola keuangan pribadi berbasis web yang dibuat dengan pendekatan mobile-friendly.

Aplikasi ini membantu user untuk:

```txt
[✓] Mencatat pemasukan
[✓] Mencatat pengeluaran
[✓] Melihat saldo dan summary keuangan
[✓] Mengelola kategori transaksi
[✓] Membuat dan memantau target tabungan
[✓] Mengatur safe balance limit
[✓] Mengekspor transaksi ke JSON, CSV, dan XLSX
[✓] Menginstall webapp sebagai PWA
```

Project dibuat dengan struktur **monorepo** agar frontend, backend, dan shared package bisa dikelola dalam satu repository.

---

## 2. Production Status

Project sudah berhasil berjalan di production.

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

Status terakhir:

```txt
[✓] Frontend Vercel aktif
[✓] Backend Vercel aktif
[✓] Supabase PostgreSQL aktif
[✓] Backend health endpoint aktif
[✓] CORS frontend-backend berjalan
[✓] Environment variable production terbaca
[✓] GitHub Actions CI berjalan
[✓] Vercel deployment berjalan
[✓] PWA installable support berjalan
[✓] Basic API security hardening berjalan
[✓] Semua fitur utama berjalan normal di production
[✓] Manual production regression terakhir aman
```

---

## 3. Repository dan Branch

Repository:

```txt
https://github.com/Risaru9/Sakuin
```

Branch utama:

```txt
main
```

Kondisi ideal sebelum melanjutkan development:

```bash
git status
```

Target:

```txt
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 4. Latest Release Context

Release tag yang sudah tercatat:

```txt
v0.1.0 - Sakuin MVP release
v0.1.1 - Sakuin production deployment release
v0.2.0 - Category management release
v0.4.0 - App-wide caching and UX performance optimization
```

Catatan penting:

```txt
Tag hanya dibuat ketika ada penambahan fitur besar, perbaikan penting, atau release milestone.
Jangan membuat tag hanya untuk perubahan kecil yang belum layak release.
Jangan update tag hanya karena dokumentasi kecil kecuali memang diputuskan sebagai release milestone.
```

Status fase terbaru:

```txt
[✓] Phase 22A  - Landing/Auth/Transactions Mobile UI Polish
[✓] Phase 22B  - PWA Installable Support
[✓] Phase 22C.1 - Improve Transactions Mobile Date Range UX
[✓] Phase 22C.2 - Security Hardening Basic
[~] Phase 22C.3 - Security Documentation
```

---

## 5. Tech Stack

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

### Deployment

```txt
Frontend : Vercel
Backend  : Vercel serverless function
Database : Supabase PostgreSQL
CI       : GitHub Actions
```

---

## 6. Project Structure

```txt
sakuin/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  └─ schema.prisma
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
│  │  └─ package.json
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
│     └─ package.json
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
├─ README.md
└─ .gitignore
```

---

## 7. Environment Variables

### Backend Local

File:

```txt
apps/api/.env
```

Contoh:

```env
NODE_ENV="development"
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

JWT_SECRET="replace_with_minimum_32_characters_secret"

FRONTEND_URL="http://localhost:3000"
```

### Frontend Local

File:

```txt
apps/web/.env
```

Contoh:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

### Production Frontend

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

### Production Backend

```env
NODE_ENV="production"
DATABASE_URL="<Supabase PostgreSQL URL>"
DIRECT_URL="<Supabase Direct URL>"
JWT_SECRET="<production secret>"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

Important notes:

```txt
1. Jangan commit file .env.
2. Jangan menyimpan value asli DATABASE_URL, DIRECT_URL, atau JWT_SECRET di repository.
3. VITE_API_BASE_URL tidak boleh diakhiri slash "/".
4. Setelah mengubah environment variable di Vercel, lakukan redeploy.
5. Jangan memakai URL dashboard Vercel sebagai API URL.
6. Jangan memakai preview URL yang terkena Vercel Authentication sebagai API production.
7. Pastikan GitHub Actions secrets tersedia untuk CI.
```

---

## 8. Local Development Setup

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

## 9. Important Scripts

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

## 10. Validation Commands

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

## 11. Current Test Status

Frontend automated tests terakhir:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

Backend automated tests terakhir:

```txt
Test Files : 7 passed
Tests      : 63 passed
```

Catatan:

```txt
Backend test memakai timeout 20 detik di package script:
vitest run --testTimeout=20000
```

Build frontend dapat menampilkan warning:

```txt
Some chunks are larger than 500 kB after minification.
```

Status warning tersebut:

```txt
Warning ini bukan error.
Build tetap valid jika selesai sukses.
Optimasi dapat dilakukan nanti melalui lazy loading route/code splitting.
```

---

## 12. GitHub Actions CI

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

## 13. Deployment Notes

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
```

---

## 14. Backend Architecture Summary

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
config/env.ts              : validasi environment variable
db/prisma.ts               : Prisma Client
middlewares/auth           : JWT auth middleware
middlewares/validate       : Zod request validation
middlewares/security       : security headers dan request body size limit
utils/api-response         : response helper
utils/http-error           : HTTP error helper
modules/index.ts           : aggregator route /api
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

## 15. Frontend Architecture Summary

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
transactions  : transaction management
categories    : category management
goals         : goal management
profile       : profile and safe balance
export        : transaction export
summary       : summary service/types
health        : backend health check
```

---

## 16. TanStack Query Usage

Sakuin memakai TanStack Query untuk mengurangi blank loading dan mempercepat UX.

Query keys utama:

```txt
summary
profile
categories
goals
transactions
```

File query key:

```txt
apps/web/src/lib/query-keys.ts
```

File query client:

```txt
apps/web/src/lib/query-client.ts
```

Query client dipasang di:

```txt
apps/web/src/app/App.tsx
```

Tujuan TanStack Query:

```txt
[✓] Data halaman tidak blank loading berulang
[✓] Data lama tetap tampil saat background refetch
[✓] Mutation bisa invalidate cache terkait
[✓] Optimistic/faster action UX bisa diterapkan
[✓] User experience terasa lebih cepat walaupun backend/database tetap remote
```

Invalidation rules:

```txt
Create/Edit/Delete Transaction:
- invalidate transactions
- invalidate summary

Create/Edit/Delete Category:
- invalidate categories
- invalidate transactions
- invalidate summary

Create/Edit/Delete/Progress Goal:
- invalidate goals
- invalidate summary

Update Profile:
- invalidate profile
- invalidate summary

Logout:
- clear query client cache
- remove token
```

---

## 17. PWA Status

PWA installable support sudah selesai.

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

Status PWA:

```txt
[✓] Manifest tersedia
[✓] Icon tersedia
[✓] Maskable icon tersedia
[✓] Offline page tersedia
[✓] Service worker tersedia
[✓] Service worker registered
[✓] Install button tersedia
[✓] Install button tidak merusak mobile navbar
[✓] Webapp bisa diinstall
[✓] Manual test passed
[✓] CI/deploy passed
```

Catatan penting:

```txt
Browser tidak selalu memberikan event beforeinstallprompt.
Jika event tersedia, tombol Install Sakuin memunculkan prompt install.
Jika event tidak tersedia, tombol memberi instruksi manual lewat toast.
```

Hal yang belum dibuat:

```txt
[ ] PWA update prompt
[ ] Better offline mode
[ ] App version display
[ ] Install guide modal/page
```

---

## 18. Security Status

Security hardening basic sudah selesai.

Yang sudah diterapkan:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation
[✓] JWT Bearer Token authentication
[✓] bcryptjs password hashing
[✓] Protected endpoint
[✓] User ownership check pada data user
[✓] CORS production dibatasi
[✓] Secret tidak disimpan di repository
[✓] Security headers middleware
[✓] Request body size limit basic
[✓] Production error handling lebih aman
```

Security headers yang ditambahkan:

```txt
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
X-Permitted-Cross-Domain-Policies
Strict-Transport-Security pada production
```

Request body size limit:

```txt
1 MB
```

Production error handling:

```txt
Error internal 500 di production tidak membocorkan detail error.
Response memakai "Internal server error".
HttpError yang aman tetap mengirim pesan user-facing seperti token invalid, route tidak ditemukan, atau validasi gagal.
```

Yang belum diterapkan:

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
Fitur tersebut membutuhkan OAuth resmi, scope minimal, token encryption, user disconnect, delete parsed data, dan privacy policy.
```

---

## 19. Feature Completion Status

### Authentication

```txt
[✓] Register
[✓] Login
[✓] Logout
[✓] Protected route
[✓] Auth context
[✓] Token storage
[✓] Auth API test
```

### Dashboard

```txt
[✓] Summary card
[✓] Total income
[✓] Total expense
[✓] Balance
[✓] Safe balance status
[✓] Monthly trend
[✓] Recent transactions
[✓] Goals card
[✓] Priority goal
[✓] Add transaction from dashboard
[✓] TanStack Query cache
[✓] Exact money formatting for important summary values
```

### Transactions

```txt
[✓] Add transaction
[✓] Edit transaction
[✓] Delete transaction
[✓] Confirm delete dialog
[✓] Search
[✓] Filter by type
[✓] Filter by category
[✓] Filter by date range
[✓] Mobile date range filter UX improved
[✓] Sorting
[✓] Backend-driven pagination
[✓] Limit per page
[✓] TanStack Query cache
[✓] Faster add/edit/delete UX
[✓] Optimistic delete
[✓] Toast feedback
```

### Categories

```txt
[✓] List default categories
[✓] List custom categories
[✓] Create custom category
[✓] Edit custom category
[✓] Delete custom category
[✓] Prevent edit default category
[✓] Prevent delete default category
[✓] Prevent delete category used by transaction
[✓] Filter ALL/INCOME/EXPENSE
[✓] TanStack Query cache
[✓] Faster category action UX
[✓] Integrated with transaction forms
```

### Goals

```txt
[✓] Create goal
[✓] Edit goal
[✓] Delete goal
[✓] Add progress
[✓] Progress percentage
[✓] Set dashboard priority goal
[✓] Clear invalid priority goal if goal deleted
[✓] TanStack Query cache
[✓] Faster/optimistic goal actions
[✓] Toast feedback
```

### Profile

```txt
[✓] Get profile
[✓] Update name
[✓] Update safe balance limit
[✓] Sync name to AppShell/sidebar
[✓] Safe balance affects dashboard summary
[✓] Numeric-only safe balance input
[✓] Safe balance max Rp 1.000.000.000.000
[✓] TanStack Query cache
[✓] Faster/optimistic update UX
[✓] Logout flow
```

### Export

```txt
[✓] Export JSON
[✓] Export CSV
[✓] Export XLSX
[✓] Filter type
[✓] Filter date range
[✓] Custom filename
[✓] Filename preview
[✓] Date validation
[✓] Disable buttons during export
[✓] Standard apiDownload/auth flow
[✓] Toast feedback
```

---

## 20. Important Validation Rules

### Transaction Amount

```txt
Minimal  : Rp 1
Maksimal : Rp 1.000.000.000.000
Tidak boleh 0
Tidak boleh minus
Tidak boleh invalid number
Maksimal 2 angka desimal
```

### Safe Balance Limit

```txt
Minimal  : Rp 0
Maksimal : Rp 1.000.000.000.000
Hanya angka
Tidak boleh minus
Tidak boleh huruf
Tidak boleh simbol
```

### Category

```txt
Name wajib
Type wajib INCOME atau EXPENSE
Default category tidak bisa diedit
Default category tidak bisa dihapus
Category yang sudah dipakai transaksi tidak bisa dihapus
Category INCOME hanya untuk transaksi INCOME
Category EXPENSE hanya untuk transaksi EXPENSE
```

### Goal

```txt
Name wajib
Target amount harus lebih dari 0
Current amount tidak boleh negatif
Current amount tidak boleh lebih besar dari target amount
```

### Export

```txt
Format hanya json/csv/xlsx
Tanggal mulai tidak boleh lebih besar dari tanggal akhir
Custom filename tidak boleh mengandung karakter ilegal
```

---

## 21. Manual Regression Checklist

Sebelum release atau setelah perubahan besar, lakukan manual regression ini.

### Production Smoke Test

```txt
[ ] Buka https://sakuin-web.vercel.app
[ ] Buka https://sakuin-api.vercel.app/health
[ ] Buka https://sakuin-api.vercel.app/api/health
[ ] Register user baru
[ ] Login
[ ] Dashboard tampil normal
[ ] Tambah transaksi dari dashboard
[ ] Buka Transactions
[ ] Search transaksi
[ ] Filter transaksi by type
[ ] Filter transaksi by category
[ ] Filter transaksi by date range
[ ] Sorting transaksi
[ ] Pagination transaksi
[ ] Edit transaksi
[ ] Hapus transaksi
[ ] Buka Categories
[ ] Tambah custom category
[ ] Edit custom category
[ ] Hapus custom category yang belum dipakai
[ ] Coba hapus category yang sudah dipakai dan pastikan gagal aman
[ ] Buka Goals
[ ] Tambah goal
[ ] Edit goal
[ ] Tambah dana goal
[ ] Set goal priority dashboard
[ ] Hapus goal
[ ] Buka Profile
[ ] Update name
[ ] Update safe balance limit
[ ] Pastikan safe balance tidak menerima huruf/minus/simbol
[ ] Buka Export
[ ] Export JSON
[ ] Export CSV
[ ] Export XLSX
[ ] Tombol Install Sakuin berjalan atau memberi instruksi manual
[ ] Logout
[ ] Login ulang
[ ] Refresh route /dashboard tidak 404
[ ] Refresh route /transactions tidak 404
[ ] Refresh route /categories tidak 404
[ ] Refresh route /goals tidak 404
[ ] Refresh route /profile tidak 404
[ ] Refresh route /export tidak 404
```

---

## 22. Known Solved Issues

Masalah yang sudah pernah muncul dan sudah diselesaikan:

```txt
[✓] Supabase connection string salah format
[✓] Prisma DIRECT_URL missing
[✓] Backend route handler error
[✓] CORS error production
[✓] Vercel API URL salah memakai dashboard URL
[✓] Vercel preview URL terkena authentication
[✓] Backend env variable tidak terbaca
[✓] SPA route refresh 404 di Vercel
[✓] pnpm-lock mismatch di CI
[✓] GitHub Actions secrets/variables salah tempat
[✓] Category API test timeout
[✓] Frontend category management CI error
[✓] Dashboard reload berulang tanpa cache
[✓] Transactions reload berulang tanpa cache
[✓] Export token lookup manual diganti ke apiDownload standar
[✓] Safe balance bisa input karakter tidak valid
[✓] Dashboard compact money formatting membulatkan angka penting
[✓] PWA install button sempat mengganggu mobile navbar
[✓] Transactions mobile date range filter sempat membingungkan di mobile
[✓] API belum punya basic security headers
[✓] Production 500 error sebelumnya berpotensi mengirim detail error
```

---

## 23. Current Documentation Status

Dokumentasi yang harus sinkron dengan kondisi terbaru:

```txt
README.md       : project overview, setup, fitur, deployment, status
docs/API.md     : detail endpoint backend dan security note
docs/HANDOFF.md : konteks teknis dan status untuk developer berikutnya
```

Status dokumentasi fase ini:

```txt
[✓] README.md full replacement disiapkan
[✓] docs/API.md full replacement disiapkan
[✓] docs/HANDOFF.md full replacement disiapkan
[ ] User replace file lokal
[ ] Validasi minimal dijalankan
[ ] Commit dokumentasi
[ ] Push
[ ] CI checked
[ ] Deploy checked
```

Jika hanya markdown yang berubah, jalankan minimal:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Full confidence validation:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

---

## 24. Suggested Finalization Step

Setelah README, API, dan HANDOFF sudah update:

```bash
git status
git diff -- README.md docs/API.md docs/HANDOFF.md
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git add README.md docs/API.md docs/HANDOFF.md
git commit -m "Update documentation for security hardening"
git push
```

Lalu cek:

```txt
[ ] GitHub Actions CI
[ ] Vercel deployment
[ ] Production smoke test singkat
```

Tidak perlu membuat tag baru hanya untuk dokumentasi, kecuali diputuskan sebagai milestone release.

---

## 25. Recommended Next Development Phase

Setelah security documentation selesai, fase berikutnya yang paling logis:

```txt
Phase 22C.4 - PWA Update Prompt
Phase 22C.5 - Bundle Size Optimization
Phase 22D   - Budgeting per Category
Phase 22E   - Recurring Transaction
Phase 22F   - Advanced Security/Auth Cookie Migration
Phase 23    - Email/e-wallet Transaction Detection Research
```

Prioritas paling aman:

```txt
1. PWA Update Prompt
2. Bundle Size Optimization
3. Budgeting per Category
4. Recurring Transaction
5. Advanced Auth Security
```

Alasan:

```txt
PWA Update Prompt penting karena webapp sudah installable, tetapi belum memberi tahu user ketika versi baru tersedia.
Bundle optimization menangani warning chunk size.
Budgeting per category adalah ekstensi natural dari category + transaction.
Recurring transaction berguna untuk transaksi rutin seperti gaji, kos, cicilan, langganan.
Advanced auth harus direncanakan hati-hati karena menyentuh token/session/CORS/CSRF.
```

---

## 26. Development Principles

Prinsip yang sudah dipakai dan sebaiknya dilanjutkan:

```txt
1. Jangan ubah banyak area sekaligus tanpa validasi bertahap.
2. Utamakan full code replacement untuk file besar agar minim typo dan mismatch.
3. Jalankan typecheck/test/build sebelum commit.
4. Gunakan ToastProvider untuk feedback user.
5. Gunakan ConfirmDialog untuk aksi destructive.
6. Hindari window.confirm() dan alert().
7. Gunakan AppShell untuk protected pages.
8. Gunakan TanStack Query untuk server state.
9. Invalidate cache yang terkait setelah mutation.
10. Pakai optimistic update hanya jika rollback jelas.
11. Validasi penting harus ada di frontend dan backend.
12. Jangan commit secret.
13. Jangan tag release sebelum CI/deploy aman.
14. Dokumentasi harus ikut diupdate setelah milestone besar.
15. Jangan mengubah service worker tanpa memahami efek cache.
16. Jangan cache API private user di service worker.
17. Jangan mengubah auth/security tanpa regression test.
```

---

## 27. Notes for Next Agent

Jika agent berikutnya melanjutkan project ini, pahami terlebih dahulu:

```txt
1. Project sudah production-ready.
2. Semua page utama sudah dioptimasi dengan TanStack Query atau UX polish.
3. PWA installable support sudah selesai.
4. Transactions mobile date range filter sudah diperbaiki.
5. Basic API security hardening sudah diterapkan.
6. Jangan rollback pola cache ke useEffect manual tanpa alasan kuat.
7. Jangan menghapus queryKeys/queryClient karena dipakai lintas fitur.
8. Jangan mengubah CORS/env/deployment config tanpa validasi production.
9. Jangan mengubah Prisma schema tanpa migration dan test.
10. Jangan mengubah auth/token flow tanpa test login/register/protected route.
11. Jangan menambah fitur sensitif email/e-wallet sebelum security lebih matang.
```

Recommended workflow untuk fitur baru:

```txt
1. Pahami fitur dan data model.
2. Update backend schema/API jika diperlukan.
3. Tambahkan backend validation.
4. Tambahkan backend tests.
5. Update frontend service/types.
6. Buat UI dengan AppShell/modal/toast.
7. Tambahkan cache/mutation/invalidation.
8. Manual test lokal.
9. Run validation.
10. Commit.
11. Push.
12. Cek CI.
13. Cek Vercel deploy.
14. Manual test production.
15. Update docs jika fitur besar.
```

---

## 28. Current Best Next Action

Kondisi saat dokumen ini dibuat:

```txt
README.md sudah disiapkan untuk update security/PWA/latest status.
docs/API.md disiapkan untuk update security/API/latest status.
docs/HANDOFF.md disiapkan untuk update latest status.
Phase 22C.3 Security Documentation sedang difinalisasi.
```

Next action paling tepat:

```txt
1. Replace README.md.
2. Replace docs/API.md.
3. Replace docs/HANDOFF.md.
4. Jalankan minimal frontend/backend typecheck.
5. Cek git diff.
6. Commit dokumentasi.
7. Push.
8. Cek CI.
9. Cek deploy.
10. Manual smoke test singkat production.
```