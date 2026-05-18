# Sakuin Project Handoff

Dokumen ini berisi konteks teknis dan status pengembangan terbaru project **Sakuin**. Tujuannya agar developer atau agent berikutnya dapat langsung memahami kondisi project, keputusan teknis, fitur yang sudah selesai, cara menjalankan project, cara validasi, dan prioritas pengembangan berikutnya.

Dokumen ini harus dibaca sebelum melanjutkan development, karena project sudah berjalan di production dan sudah melewati banyak fase besar: MVP, deployment, category management, transactions, dashboard, goals, profile, export, app-wide caching/UX optimization, landing/auth/mobile polish, PWA installable support, transactions mobile date filter polish, Quick Transaction, dan security hardening sebelum integrasi sensitif.

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
[✓] Mencatat transaksi cepat melalui Quick Transaction / Catat Cepat
```

Arah produk Sakuin sekarang bukan hanya menjadi pencatat transaksi seperti spreadsheet. Sakuin diarahkan agar lebih bernilai dari Excel/manual tracking dengan membantu user:

```txt
[✓] Mencatat transaksi lebih cepat
[✓] Mengurangi effort input manual
[✓] Memahami kondisi keuangan pribadi
[✓] Menjaga keamanan data keuangan
[ ] Ke depannya menjadi financial assistant/advisor yang aman
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
[✓] Quick Transaction berjalan
[✓] Security hardening baseline berjalan
[✓] Security tests tambahan berjalan
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

Target ideal:

```txt
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Catatan fase dokumentasi saat ini:

```txt
README.md sudah diperbarui/direncanakan untuk status terbaru.
docs/SECURITY.md dibuat pada Phase 24C.
docs/HANDOFF.md sedang diperbarui.
docs/API.md akan dicek/update setelah ini jika perlu.
Commit ditunda sampai semua file Markdown selesai.
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
[✓] Phase 22C.5 - Bundle Size Optimization
[✓] Phase 23A  - Simplify Category UX
[✓] Phase 23B  - Quick Transaction / Catat Cepat MVP
[✓] Phase 24A  - Auth Rate Limit + Security Test Baseline
[✓] Phase 24B.1 - Cross-Cutting Security Tests
[✓] Phase 24B.2 - Summary & Export Data Isolation Tests
[✓] Phase 24B.3 - Auth & Token Edge Case Tests
[✓] Phase 24B.4 - Rate Limit & API Abuse Edge Case Tests
[~] Phase 24C  - Security Documentation
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
│  ├─ HANDOFF.md
│  └─ SECURITY.md
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

## 11. Current Test Status

Frontend automated tests terakhir yang pernah tercatat:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

Backend automated tests terus bertambah karena fase security hardening.

Catatan:

```txt
Gunakan output test lokal/CI terbaru sebagai sumber kebenaran.
Jika jumlah test berbeda dari dokumentasi lama, jangan anggap error selama semua test passed.
```

Build frontend sebelumnya pernah menampilkan warning chunk size, tetapi route lazy loading/code splitting sudah pernah dilakukan untuk menghapus warning tersebut.

Jika warning chunk size muncul lagi:

```txt
Warning ini bukan error.
Build tetap valid jika selesai sukses.
Optimasi dapat dilakukan melalui lazy loading route/code splitting/dynamic import.
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
[✓] GitHub Actions secrets/variables diperbaiki.
[✓] Rate limit middleware sempat error di Vercel karena Request.clone typing, sudah diperbaiki.
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
config/env.ts                  : validasi environment variable
db/prisma.ts                   : Prisma Client
middlewares/auth               : JWT auth middleware
middlewares/validate           : Zod request validation
middlewares/security           : security headers dan request body size limit
middlewares/rate-limit         : login/register/general API rate limit
utils/api-response             : response helper
utils/http-error               : HTTP error helper
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
transactions  : transaction management dan Quick Transaction
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

Security note:

```txt
Service worker tidak boleh cache API private user seperti auth, transactions, summary, profile, goals, categories, dan export.
```

---

## 18. Feature Completion Status

### Authentication

```txt
[✓] Register
[✓] Login
[✓] Logout
[✓] Protected route
[✓] Auth context
[✓] Token storage
[✓] GET /api/auth/me
[✓] Generic login error
[✓] Auth API tests
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
[✓] Quick Transaction from dashboard
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
[✓] Ownership protection
```

### Quick Transaction / Catat Cepat

```txt
[✓] Tombol Catat Cepat di Dashboard
[✓] Tombol Catat Cepat di TransactionsPage
[✓] Input banyak transaksi sekaligus
[✓] Rule-based parser
[✓] Parser membaca nominal dan konteks umum
[✓] Parser mengenali pola income/expense umum
[✓] Parser dinormalisasi untuk variasi bahasa Indonesia informal
[✓] Custom category matching lebih baik
[✓] Fallback ke kategori Lain
[✓] Draft review sebelum save
[✓] Draft bisa diedit
[✓] Draft bisa dihapus
[✓] Draft bisa disimpan semua setelah review
[✓] Low confidence/warning support
[✓] Collapsed draft review UI agar mobile tidak penuh
```

Catatan:

```txt
Parser masih rule-based, bukan AI/LLM.
Jangan berharap parser memahami semua variasi bahasa natural.
Jangan auto-save transaksi dari parser tanpa review user.
Jika nanti memakai AI parser, tetap harus draft-first.
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
[✓] Inline category creation from AddTransactionModal
[✓] Inline category creation from EditTransactionModal
[✓] Category ownership protection
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
[✓] Ownership protection
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
[✓] Filter category
[✓] Filter date range
[✓] Custom filename
[✓] Filename preview
[✓] Date validation
[✓] Disable button while exporting
[✓] Toast feedback
[✓] Standard apiDownload/auth flow
[✓] User-isolated export
[✓] JSON/CSV/XLSX export isolation tests
```

---

## 19. Security Status

Security hardening sudah masuk fase lanjut untuk MVP/production awal.

Security baseline yang sudah diterapkan:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation untuk request body/query/params
[✓] JWT Bearer Token authentication
[✓] bcryptjs password hashing
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

Security headers:

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

Rate limit:

```txt
[✓] Login rate limit
[✓] Register rate limit
[✓] General API rate limit
```

Rate limit headers:

```txt
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After saat 429
```

Important limitation:

```txt
Rate limit saat ini menggunakan in-memory store.
Ini cukup untuk baseline/MVP dan low-scale usage.
Namun untuk production serverless/multi-instance, in-memory store tidak ideal karena setiap instance dapat memiliki state berbeda.
Jika traffic meningkat, pertimbangkan Redis/Upstash/KV-based rate limiting.
```

Security yang belum diterapkan:

```txt
[ ] Security logging and audit trail
[ ] Request ID
[ ] Failed login logging
[ ] Rate limit hit logging
[ ] Better JWT expiration strategy
[ ] Refresh token strategy
[ ] Migrasi auth ke httpOnly secure cookie
[ ] CSRF strategy jika pindah ke cookie
[ ] XSS hardening lanjutan
[ ] CSP lanjutan untuk frontend
[ ] Audit localStorage token risk
[ ] Distributed rate limit dengan Redis/Upstash/KV
[ ] OAuth token encryption untuk integrasi sensitif
[ ] Revoke/disconnect mechanism untuk integrasi sensitif
[ ] Privacy policy jika nanti ada fitur sensitif
```

Catatan penting:

```txt
Jangan pernah klaim Sakuin 100% aman.
Security target realistis adalah mengurangi risiko, bukan menghapus semua risiko.
```

---

## 20. Security Test Coverage

### Phase 24A — Auth Rate Limit + Security Test Baseline

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Login rate limit
[✓] User tidak bisa baca detail transaksi user lain
[✓] User tidak bisa create transaction memakai custom category user lain
```

### Phase 24B.1 — Cross-Cutting Security Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Security headers muncul
[✓] CORS tidak memantulkan origin asing
[✓] CORS mengizinkan localhost development
[✓] Request body terlalu besar ditolak 413
[✓] Authorization header format salah ditolak
[✓] Bearer token invalid ditolak
[✓] Endpoint private gagal tanpa token
[✓] JSON endpoint menolak request tanpa Content-Type: application/json
[✓] JSON endpoint menolak body JSON rusak
```

### Phase 24B.2 — Summary & Export Data Isolation Tests

Status:

```txt
[✓] Selesai
```

Coverage:

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

### Phase 24B.3 — Auth & Token Edge Case Tests

Status:

```txt
[✓] Selesai
```

Coverage:

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

### Phase 24B.4 — Rate Limit & API Abuse Edge Case Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Login rate limit memblok IP + email yang sama
[✓] Login rate limit tidak memblok email berbeda dari IP berbeda
[✓] Register rate limit memblok spam register dari IP yang sama
[✓] General API rate limit memblok request berlebihan dari IP yang sama
[✓] 429 response punya Retry-After
[✓] 429 response punya RateLimit-Limit
[✓] 429 response punya RateLimit-Remaining
[✓] 429 response punya RateLimit-Reset
[✓] Rate limit store bisa di-reset antar test
```

---

## 21. Sensitive Integration Policy

Fitur sensitif belum boleh langsung dibuat.

Contoh fitur sensitif:

```txt
[ ] Google Login
[ ] Gmail transaction detection
[ ] E-wallet transaction detection
[ ] Mobile banking transaction detection
[ ] Bank account integration
[ ] AI financial assistant berbasis data pribadi
```

Prinsip wajib:

```txt
[ ] Jangan pernah meminta password email user
[ ] Jangan pernah meminta password e-wallet/mobile banking user
[ ] Gunakan OAuth resmi jika provider mendukung
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

## 22. Google Login vs Gmail API

Google Login dan Gmail API harus dipisahkan.

Google Login:

```txt
Tujuan: Authentication
Scope ideal: openid, email, profile
Tidak membutuhkan Gmail scope
```

Gmail API:

```txt
Tujuan: Membaca email tertentu untuk mendeteksi transaksi
Membutuhkan consent eksplisit
Membutuhkan scope minimal
Membutuhkan token storage design
Membutuhkan disconnect/revoke flow
```

Rules:

```txt
[✓] Jangan otomatis meminta Gmail scope saat user hanya ingin login dengan Google.
[✓] Gmail access hanya boleh diminta jika user eksplisit mengaktifkan fitur Hubungkan Gmail.
[✓] Jelaskan data apa yang akan dibaca.
[✓] Jelaskan data apa yang disimpan.
[✓] Jelaskan user bisa disconnect kapan saja.
```

---

## 23. Documentation Status

Dokumentasi yang harus sinkron dengan kondisi terbaru:

```txt
README.md        : project overview, setup, fitur, deployment, status terbaru
docs/API.md      : detail endpoint backend dan security notes
docs/HANDOFF.md  : konteks teknis dan status untuk developer berikutnya
docs/SECURITY.md : security baseline, policy, dan roadmap sebelum integrasi sensitif
```

Status dokumentasi Phase 24C:

```txt
[✓] README.md full replacement disiapkan
[✓] docs/SECURITY.md dibuat/disiapkan
[✓] docs/HANDOFF.md full replacement disiapkan
[ ] docs/API.md dicek/update jika perlu
[ ] User replace file lokal
[ ] Validasi minimal dijalankan
[ ] Commit dokumentasi
[ ] Push
[ ] CI checked
[ ] Deploy checked
```

Catatan:

```txt
Commit ditunda sampai seluruh file Markdown selesai.
```

---

## 24. Manual Production Smoke Test

Checklist production setelah perubahan besar:

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
[ ] Refresh route /dashboard tidak 404
[ ] Refresh route /transactions tidak 404
[ ] Refresh route /categories tidak 404
[ ] Refresh route /goals tidak 404
[ ] Refresh route /profile tidak 404
[ ] Refresh route /export tidak 404
[ ] CI passed
[ ] Vercel deployment passed
```

Untuk dokumentasi saja, manual production smoke test lengkap tidak wajib, tetapi setelah push tetap cek CI/deploy.

---

## 25. Known Solved Issues

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
[✓] Vercel backend build error karena Request.clone typing pada rate-limit middleware
[✓] Register rate limit test timeout karena bcrypt.hash berulang
[✓] XLSX isolation test typing issue dengan ExcelJS Buffer
[✓] Auth/token test body.data possibly undefined
```

---

## 26. Development Principles

Prinsip yang sudah dipakai dan harus dilanjutkan:

```txt
1. Jangan ubah banyak area sekaligus tanpa validasi bertahap.
2. Jangan menebak struktur file.
3. Jika butuh konteks code, minta file spesifik.
4. Untuk membuat file/folder baru, gunakan command sederhana seperti mkdir/New-Item/touch.
5. Jangan gunakan script otomatis besar untuk inject kode ke file existing kecuali diminta eksplisit.
6. Utamakan full code replacement untuk file besar agar minim typo dan mismatch.
7. Jalankan typecheck/test/build sebelum commit.
8. Gunakan ToastProvider untuk feedback user.
9. Gunakan ConfirmDialog untuk aksi destructive.
10. Hindari window.confirm() dan alert().
11. Gunakan AppShell untuk protected pages.
12. Gunakan TanStack Query untuk server state.
13. Invalidate cache yang terkait setelah mutation.
14. Pakai optimistic update hanya jika rollback jelas.
15. Validasi penting harus ada di frontend dan backend.
16. Jangan commit secret.
17. Jangan tag release sebelum CI/deploy aman.
18. Dokumentasi harus ikut diupdate setelah milestone besar.
19. Jangan mengubah service worker tanpa memahami efek cache.
20. Jangan cache API private user di service worker.
21. Jangan mengubah auth/security tanpa regression test.
22. Jangan auto-save hasil parser natural language tanpa user review.
23. Jangan membuat Gmail/e-wallet detection sebelum security/privacy readiness matang.
```

---

## 27. Things That Must Not Be Changed Carelessly

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
[!] Security middleware global
[!] Rate limit middleware
[!] Ownership/data isolation checks
[!] Export response format
[!] Quick Transaction draft-first behavior
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Update Prisma Client
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
[ ] Test invalid token
[ ] Test expired token
[ ] Evaluasi token/session security
[ ] Evaluasi CSRF jika pindah ke cookie
```

Jika mengubah service worker:

```txt
[ ] Jangan cache API private user
[ ] Jangan cache endpoint auth/transactions/summary/profile/goals/export
[ ] Test install PWA
[ ] Test reload production
[ ] Test behavior update aplikasi
[ ] Test logout/login ulang
```

Jika mengubah rate limit:

```txt
[ ] Update rate limit tests
[ ] Test login rate limit
[ ] Test register rate limit
[ ] Test general API rate limit
[ ] Pastikan 429 headers tetap benar
```

---

## 28. Backlog Lanjutan

Fitur dan improvement yang belum dibuat:

```txt
[ ] Finalisasi Phase 24C Security Documentation
[ ] Update docs/API.md agar selaras dengan security docs terbaru
[ ] Phase 24D Security Logging & Audit Trail Design
[ ] Phase 24E Google Login Design, bukan Gmail reading
[ ] Phase 24F Gmail Transaction Detection Architecture
[ ] Phase 24G Distributed Rate Limit / Production Hardening
[ ] PWA update prompt
[ ] Better offline mode
[ ] App version display
[ ] Install guide modal/page
[ ] Bundle size monitoring lanjutan
[ ] Budgeting per kategori
[ ] Recurring transaction
[ ] Advanced auth security / cookie migration
[ ] Dark mode
[ ] Data visualization enhancement
[ ] Import transaksi dari CSV/XLSX
[ ] Multi-account wallet
[ ] Notification/reminder untuk goal atau recurring transaction
[ ] Email/e-wallet transaction detection research
[ ] AI assistant
```

---

## 29. Recommended Next Development Phase

Urutan pengembangan yang disarankan dari kondisi terbaru:

```txt
1. Selesaikan Phase 24C Security Documentation
2. Update docs/API.md jika perlu
3. Jalankan validasi dokumentasi minimal
4. Commit/push dokumentasi
5. Cek CI dan deploy
6. Phase 24D Security Logging & Audit Trail Design
7. Phase 24E Google Login Design
8. Phase 24F Gmail Transaction Detection Architecture
9. Phase 24G Distributed Rate Limit / Production Hardening
10. PWA Update Prompt
11. Budgeting per Category
12. Recurring Transaction
```

Prioritas paling aman:

```txt
1. Finalisasi Security Documentation
2. Security Logging & Audit Trail Design
3. Google Login Design tanpa Gmail scope
4. Gmail Transaction Detection Architecture tanpa coding API dulu
5. Distributed Rate Limit research
```

Alasan:

```txt
Security documentation penting karena backend sudah mendapat security hardening dan test tambahan.
Audit trail penting sebelum integrasi sensitif.
Google Login harus dipisahkan dari Gmail reading.
Gmail/e-wallet detection menyentuh data sangat sensitif sehingga harus dirancang dulu.
Distributed rate limit penting jika traffic meningkat karena in-memory store tidak ideal untuk serverless/multi-instance.
```

---

## 30. Current Best Next Action

Kondisi saat dokumen ini diperbarui:

```txt
README.md sudah diarahkan ke status security terbaru.
docs/SECURITY.md dibuat untuk Phase 24C.
docs/HANDOFF.md diperbarui untuk status terbaru.
Commit belum dilakukan karena semua Markdown belum selesai.
```

Next action paling tepat:

```txt
1. Replace docs/HANDOFF.md dengan isi terbaru.
2. Lanjut cek/update docs/API.md.
3. Jalankan validasi minimal.
4. Cek git diff semua file Markdown.
5. Baru commit dokumentasi.
6. Push.
7. Cek GitHub Actions CI.
8. Cek Vercel deployment.
```

---

## 31. Suggested Finalization Step

Setelah README, SECURITY, HANDOFF, dan API sudah update:

```bash
git status
git diff -- README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git add README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
git commit -m "Update documentation for security hardening"
git push
```

Lalu cek:

```txt
[ ] GitHub Actions CI
[ ] Vercel deployment
[ ] Production /health
[ ] Production /api/health
[ ] Production smoke test singkat jika perlu
```

Catatan:

```txt
Tidak perlu membuat tag baru hanya untuk dokumentasi, kecuali diputuskan sebagai milestone release.
```

---

## 32. Final Notes for Next Agent

Jika agent berikutnya melanjutkan project ini, pahami terlebih dahulu:

```txt
1. Project sudah production-ready.
2. Semua page utama sudah stabil.
3. TanStack Query sudah dipakai untuk server state.
4. PWA installable support sudah selesai.
5. Transactions mobile date range filter sudah diperbaiki.
6. Quick Transaction MVP sudah selesai dan memakai draft-first review.
7. Security hardening sudah masuk fase 24B.4.
8. docs/SECURITY.md dibuat pada Phase 24C.
9. Jangan rollback pola cache ke useEffect manual tanpa alasan kuat.
10. Jangan menghapus queryKeys/queryClient karena dipakai lintas fitur.
11. Jangan mengubah CORS/env/deployment config tanpa validasi production.
12. Jangan mengubah Prisma schema tanpa migration dan test.
13. Jangan mengubah auth/token flow tanpa test login/register/protected route.
14. Jangan menambah fitur sensitif email/e-wallet sebelum security/privacy design matang.
15. Jangan meminta Gmail scope hanya untuk login dengan Google.
16. Jangan menyimpan raw email.
17. Jangan auto-save transaksi hasil parser/email detection.
18. Jangan mengklaim aplikasi 100% aman.
```

Workflow yang harus diikuti:

```txt
Pahami konteks
Minta file relevan jika perlu
Berikan full code replacement atau instruksi spesifik
Jalankan validasi
Manual test
Commit/push
Cek CI/deploy
Update dokumentasi jika ada milestone
```