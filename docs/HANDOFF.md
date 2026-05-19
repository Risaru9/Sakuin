# Sakuin Project Handoff

Dokumen ini berisi konteks teknis dan status pengembangan terbaru project **Sakuin**. Tujuannya agar developer atau agent berikutnya dapat langsung memahami kondisi project, keputusan teknis, fitur yang sudah selesai, cara menjalankan project, cara validasi, dan prioritas pengembangan berikutnya.

Dokumen ini wajib dibaca sebelum melanjutkan development karena project sudah berjalan di production dan sudah melewati banyak fase besar.

---

## 1. Project Overview

**Sakuin** adalah web app pengelola keuangan pribadi berbasis web yang dibuat dengan pendekatan mobile-friendly.

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
[✓] Login dengan email/password
[✓] Login/register menggunakan akun Google
[✓] Reset password melalui email
```

Arah produk Sakuin bukan hanya menjadi pencatat transaksi seperti spreadsheet. Sakuin diarahkan agar lebih bernilai dari Excel/manual tracking dengan membantu user:

```txt
[✓] Mencatat transaksi lebih cepat
[✓] Mengurangi effort input manual
[✓] Memahami kondisi keuangan pribadi
[✓] Menjaga keamanan data keuangan
[✓] Memiliki audit trail untuk aksi penting
[ ] Ke depannya menjadi financial assistant/advisor yang aman
```

Project dibuat dengan struktur **monorepo** agar frontend, backend, dan shared package dapat dikelola dalam satu repository secara rapi.

---

## 2. Production Status

Project sudah berjalan di production.

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
[✓] Quick Transaction / Catat Cepat berjalan
[✓] Security hardening baseline berjalan
[✓] Security tests tambahan berjalan
[✓] AuditLog table aktif
[✓] Database-backed audit trail berjalan
[✓] Google Login berjalan di production
[✓] Reset password berjalan di production
[✓] Gmail SMTP/Nodemailer email sender berjalan
[✓] Semua fitur utama berjalan normal di production
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

Aturan:

```txt
Jangan lanjut coding fitur baru jika working tree masih berisi perubahan yang belum jelas.
Pisahkan perubahan fitur, security, bugfix, dan dokumentasi jika memungkinkan.
Jangan commit secret, .env, token, database URL, SMTP_PASS, atau credential lain.
```

---

## 4. Current Documentation Status

Dokumentasi terbaru yang sedang/sudah disinkronkan:

```txt
[✓] README.md diperbarui sebagai perkenalan produk, bukan dokumentasi teknis panjang
[✓] docs/API.md diperbarui untuk Google Login, forgot/reset password, Gmail SMTP, dan endpoint terbaru
[✓] docs/SECURITY.md diperbarui untuk Google Login, reset password, Gmail SMTP/Nodemailer, dan risk policy
[✓] docs/HANDOFF.md diperbarui sebagai konteks lanjutan developer/agent berikutnya
```

Setelah semua file `.md` selesai diperbarui, lakukan commit dokumentasi.

Rekomendasi commit message:

```bash
git add README.md docs/API.md docs/SECURITY.md docs/HANDOFF.md
git commit -m "Update documentation for auth and password reset"
git push
```

Validasi ringan untuk perubahan dokumentasi:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Jika ingin regression penuh:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

---

## 5. Latest Phase Status

Status fase besar terbaru:

```txt
[✓] MVP aplikasi keuangan pribadi
[✓] Production deployment
[✓] Category management
[✓] Transaction management
[✓] Dashboard
[✓] Goals
[✓] Profile
[✓] Export JSON/CSV/XLSX
[✓] App-wide caching/UX optimization
[✓] Landing/auth/mobile polish
[✓] PWA installable support
[✓] Transactions mobile date filter polish
[✓] Quick Transaction / Catat Cepat
[✓] Security hardening baseline
[✓] Extended security tests
[✓] Request ID + safe request logging
[✓] Safe security event logging
[✓] Database-backed audit trail
[✓] Audit sink reliability polish
[✓] Google Login backend
[✓] Google Login frontend
[✓] Backend password reset flow
[✓] Frontend forgot/reset password UI
[✓] Gmail SMTP/Nodemailer email sender
[✓] Auth final regression
[✓] Auth pages mobile responsiveness
[✓] Password reset email delivery guidance
[~] Documentation sync after auth/reset password
```

Auth final regression sudah dikonfirmasi aman:

```txt
[✓] Login email/password normal
[✓] Register email/password normal
[✓] Login Google normal
[✓] Register Google normal
[✓] Forgot password normal
[✓] Reset password normal
[✓] Reset password email terkirim
[✓] User diarahkan untuk cek Inbox/Spam/Promotions/Social/Updates/All Mail
[✓] Frontend deployment hijau
[✓] Backend deployment hijau
[✓] GitHub Actions CI hijau
```

---

## 6. Release Context

Release tag yang sudah tercatat:

```txt
v0.1.0 - Sakuin MVP release
v0.1.1 - Sakuin production deployment release
v0.2.0 - Category management release
v0.4.0 - App-wide caching and UX performance optimization
```

Catatan:

```txt
Tag hanya dibuat ketika ada penambahan fitur besar, perbaikan penting, atau release milestone.
Jangan membuat tag hanya untuk perubahan kecil yang belum layak release.
Jangan update tag hanya karena dokumentasi kecil kecuali memang diputuskan sebagai release milestone.
```

Setelah dokumentasi auth/reset password selesai dan semua CI/deploy hijau, boleh dipertimbangkan apakah perlu release tag baru. Namun jika hanya dokumentasi, tidak wajib membuat tag.

---

## 7. Tech Stack

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
Google Identity frontend integration
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
google-auth-library
Nodemailer
ExcelJS
Vitest
```

### Deployment

```txt
Frontend : Vercel
Backend  : Vercel serverless function
Database : Supabase PostgreSQL
CI       : GitHub Actions
Email    : Gmail SMTP using App Password
```

---

## 8. Project Structure

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

## 9. Core Features Status

### Authentication

```txt
[✓] Register email/password
[✓] Login email/password
[✓] Logout
[✓] Protected route
[✓] Auth context frontend
[✓] JWT Bearer Token backend auth
[✓] GET current user/profile
[✓] Generic login error
[✓] Google Login/Register
[✓] Forgot password
[✓] Reset password
[✓] Gmail SMTP/Nodemailer reset password email
[✓] Auth/token edge case tests
```

Current auth storage:

```txt
Frontend masih menyimpan JWT token di localStorage.
Ini cukup untuk MVP/production awal, tetapi memiliki risiko jika terjadi XSS.
Migrasi ke httpOnly secure cookie dapat menjadi fase security lanjutan.
```

---

### Dashboard

```txt
[✓] Menampilkan total saldo
[✓] Menampilkan total pemasukan
[✓] Menampilkan total pengeluaran
[✓] Menampilkan safe balance limit
[✓] Menampilkan status aman/waspada
[✓] Menampilkan transaksi terbaru
[✓] Menampilkan trend 6 bulan
[✓] Menampilkan ringkasan goals
[✓] Menampilkan goal prioritas
[✓] Tambah transaksi dari dashboard
[✓] Tombol Catat Cepat dari dashboard
[✓] Data menggunakan TanStack Query caching
```

---

### Transactions

```txt
[✓] Tambah transaksi
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Search transaksi berdasarkan catatan
[✓] Filter berdasarkan tipe
[✓] Filter berdasarkan kategori
[✓] Filter berdasarkan rentang tanggal
[✓] Sorting transaksi
[✓] Pagination backend-driven
[✓] Confirm dialog
[✓] Toast feedback
[✓] Cache/background refetch
[✓] Ownership protection
[✓] Audit event create/update/delete transaksi
```

Validasi nominal transaksi:

```txt
Minimal  : Rp 1
Maksimal : Rp 1.000.000.000.000
Tidak boleh 0
Tidak boleh minus
Maksimal 2 angka desimal
```

---

### Quick Transaction / Catat Cepat

Quick Transaction adalah fitur input transaksi cepat berbasis teks natural sederhana.

Contoh input:

```txt
makan 15000
kopi 18000
bensin 30000
gaji 3000000
dikasih uang kakak 100000
di kasih uang kakak 100000
uang dari orang tua 500000
```

Status:

```txt
[✓] Tersedia dari Dashboard
[✓] Tersedia dari TransactionsPage
[✓] Bisa input banyak transaksi sekaligus
[✓] Parser rule-based
[✓] Parser mengenali income/expense pola umum
[✓] Parser mengenali variasi bahasa Indonesia informal
[✓] Menggunakan kategori existing/custom jika cocok
[✓] Fallback ke kategori Lain
[✓] Draft bisa diedit sebelum disimpan
[✓] Draft bisa dihapus sebelum disimpan
[✓] User review sebelum simpan
[✓] UI draft review collapsed agar mobile-friendly
```

Prinsip penting:

```txt
Quick Transaction tidak boleh langsung menyimpan transaksi final tanpa review user.
Parser hanya membuat draft.
User harus review dan approve.
```

---

### Categories

```txt
[✓] Default category
[✓] Custom category
[✓] Create/edit/delete custom category
[✓] Filter ALL/INCOME/EXPENSE
[✓] Default category tidak bisa diedit/dihapus
[✓] Category yang dipakai transaksi tidak bisa dihapus
[✓] Ownership protection
[✓] Cache TanStack Query
[✓] Inline category creation dari modal transaksi
[✓] Audit event create/update/delete category
```

---

### Goals

```txt
[✓] Membuat goal
[✓] Edit goal
[✓] Hapus goal
[✓] Tambah dana/progress goal
[✓] Progress percentage
[✓] Remaining amount
[✓] Completed/overdue status
[✓] Set goal prioritas untuk dashboard
[✓] Ownership protection
[✓] Toast feedback
[✓] Cache/optimistic action UX
[✓] Audit event create/update/delete goal
```

---

### Profile

```txt
[✓] Melihat profile
[✓] Update nama
[✓] Update safe balance limit
[✓] Logout
[✓] Sinkron user sidebar/AppShell
[✓] Cache TanStack Query
[✓] Audit event update profile
```

---

### Export

```txt
[✓] Export JSON
[✓] Export CSV
[✓] Export XLSX
[✓] Filter export berdasarkan tipe
[✓] Filter export berdasarkan kategori
[✓] Filter export berdasarkan rentang tanggal
[✓] Custom nama file export
[✓] Preview nama file
[✓] Download memakai auth flow standar
[✓] Export hanya data user login
[✓] Audit event export.transactions_generated
```

---

### PWA

```txt
[✓] manifest.webmanifest
[✓] PWA icons
[✓] Maskable icons
[✓] offline.html
[✓] sw.js
[✓] Service worker registration
[✓] Meta tag PWA
[✓] Tombol install aplikasi
[✓] Fallback instruksi manual jika browser tidak menyediakan install prompt
[✓] Webapp bisa diinstall seperti aplikasi
```

Catatan security PWA:

```txt
Service worker tidak boleh cache API private user seperti auth, transactions, summary, profile, goals, export, atau endpoint lain yang memuat data personal.
```

---

## 10. Auth and Password Reset Context

### Google Login

Google Login sudah selesai dan berjalan di production.

Behavior:

```txt
[✓] Frontend memakai Google Identity
[✓] Frontend mengirim Google credential ke backend
[✓] Backend verify ID token memakai google-auth-library
[✓] Backend memastikan emailVerified
[✓] Backend menyimpan OAuthAccount
[✓] Existing email/password user dapat di-link dengan Google account
[✓] Google-only user memiliki passwordHash null
[✓] Backend tidak menyimpan Google access token
[✓] Backend tidak menyimpan Google refresh token
[✓] Backend tidak meminta Gmail scope
```

Environment:

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

### Password Reset

Password reset sudah selesai dan berjalan end-to-end.

Flow:

```txt
User submit email di /forgot-password
Backend return response generic
Jika email terdaftar, backend membuat reset token
Token asli dikirim lewat email
Database hanya menyimpan hash token
Token punya expiry
User membuka /reset-password?token=...
User membuat password baru
Backend validasi token hash dan expiry
Backend update passwordHash
Backend hapus reset token
Token tidak bisa dipakai ulang
```

Email sender:

```txt
Current runtime email sender: Gmail SMTP / Nodemailer
Provider Resend tidak dipakai lagi untuk runtime reset password karena membutuhkan verified domain untuk pengiriman umum.
```

Environment:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_pengirim@gmail.com"
SMTP_PASS="gmail_app_password_16_karakter_tanpa_spasi"
EMAIL_FROM="Sakuin <email_pengirim@gmail.com>"
```

Catatan delivery:

```txt
Email reset password dapat masuk ke Spam, Promotions, Social, Updates, atau All Mail.
ForgotPasswordPage sudah memberi instruksi profesional kepada user untuk mengecek folder-folder tersebut.
```

Safe diagnostic logs:

```txt
password_reset_requested
password_reset_user_not_found
password_reset_email_attempted
password_reset_email_sent
password_reset_email_failed
```

Log tidak boleh memuat:

```txt
email mentah
password
reset token
SMTP_PASS
isi email
```

---

## 11. Security Status

Security baseline yang sudah diterapkan:

```txt
[✓] Prisma ORM
[✓] Zod validation
[✓] JWT Bearer Token auth
[✓] bcryptjs password hashing
[✓] Google ID token verification
[✓] Hashed reset password token
[✓] Protected endpoint
[✓] User ownership checks
[✓] CORS allowlist
[✓] Security headers middleware
[✓] Request body size limit 1 MB
[✓] Production error masking
[✓] Login rate limiting
[✓] Register rate limiting
[✓] General API rate limiting
[✓] Request ID via X-Request-Id
[✓] Safe request logging
[✓] Safe security event logging
[✓] Audit event contract
[✓] Audit event recorder
[✓] Audit event context helper
[✓] Prisma AuditLog model
[✓] Database audit log sink
[✓] Fail-open audit persistence
[✓] Security baseline tests
[✓] Cross-cutting security tests
[✓] Data isolation tests
[✓] Auth/token edge case tests
[✓] Rate limit/API abuse tests
```

Security backlog:

```txt
[ ] Cleanup unused Resend env/config reference
[ ] Distributed rate limiting
[ ] Better JWT/session strategy
[ ] Refresh token strategy
[ ] httpOnly secure cookie migration
[ ] CSRF strategy jika memakai cookie
[ ] Email verification untuk akun email/password
[ ] Password change flow untuk user login
[ ] OAuth token encryption jika integrasi sensitif dibuat
[ ] Gmail disconnect/revoke mechanism jika Gmail API dibuat
[ ] Privacy policy untuk integrasi sensitif
[ ] Data retention policy
[ ] Audit log viewer/admin policy
[ ] Formal security review
```

---

## 12. Audit Trail

Backend memiliki database-backed audit trail menggunakan Prisma model `AuditLog`.

Audit events yang sudah dicatat:

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

Security-related safe events:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Audit persistence bersifat fail-open:

```txt
Jika penyimpanan audit log gagal, request utama user tetap tidak langsung gagal.
Failure hanya dicatat sebagai safe error log tanpa metadata sensitif.
```

Audit metadata tidak boleh memuat:

```txt
password
JWT token
Authorization header
raw request body
email mentah
reset password token
Google credential
Google access token
Google refresh token
SMTP_PASS
transaction amount
transaction note
goal name
goal amount
category name
export content
```

---

## 13. Environment Variables

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

GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_pengirim@gmail.com"
SMTP_PASS="gmail_app_password_16_karakter_tanpa_spasi"
EMAIL_FROM="Sakuin <email_pengirim@gmail.com>"
```

### Frontend Local

File:

```txt
apps/web/.env
```

Contoh:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

### Production Backend

Vercel project:

```txt
sakuin-api
```

Required env:

```env
NODE_ENV="production"
DATABASE_URL="<Supabase PostgreSQL URL>"
DIRECT_URL="<Supabase Direct URL>"
JWT_SECRET="<production secret minimum 32 characters>"
FRONTEND_URL="https://sakuin-web.vercel.app"
GOOGLE_CLIENT_ID="<Google OAuth Client ID>"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="<Gmail sender>"
SMTP_PASS="<Gmail App Password without spaces>"
EMAIL_FROM="Sakuin <Gmail sender>"
```

### Production Frontend

Vercel project:

```txt
sakuin-web
```

Required env:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="<Google OAuth Client ID>"
```

Important notes:

```txt
Jangan commit file .env.
Jangan menyimpan secret asli di repository.
Jangan kirim secret ke chat.
VITE_* akan terekspos ke frontend build.
Jangan memakai prefix VITE_ untuk backend secret.
Setelah mengubah environment variable di Vercel, lakukan redeploy.
RESEND_API_KEY tidak lagi dipakai untuk runtime reset password dan sebaiknya dihapus saat cleanup.
```

---

## 14. Local Development Setup

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

## 15. Important Scripts

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

## 16. Validation Commands

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

Jika Prisma schema berubah:

```bash
pnpm --filter @sakuin/api db:migrate -- --name nama_migration
pnpm --filter @sakuin/api db:generate
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Jika hanya dokumentasi Markdown berubah:

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

## 17. Current Test Status

Frontend automated tests terakhir yang pernah dikonfirmasi:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

Backend automated tests terakhir setelah auth/reset-password work pernah mencapai:

```txt
Test Files : 19 passed
Tests      : 124 passed
Build      : passed
```

Catatan:

```txt
Gunakan output test lokal/CI terbaru sebagai sumber kebenaran.
Jika jumlah test berbeda dari dokumentasi lama, jangan anggap error selama semua test passed.
```

---

## 18. GitHub Actions CI

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

## 19. Deployment Notes

Frontend dan backend dideploy ke Vercel.

```txt
Frontend platform : Vercel
Backend platform  : Vercel
Database platform : Supabase PostgreSQL
Backend runtime   : Hono app as Vercel serverless function
```

Catatan penting deployment:

```txt
Backend memakai Hono app sebagai serverless function.
app.ts harus default export untuk Vercel serverless.
Backend CORS harus mengizinkan frontend production.
Frontend VITE_API_BASE_URL harus mengarah ke backend production.
Environment variable Vercel hanya berlaku setelah redeploy.
Jangan memakai preview URL yang terkena Vercel Authentication sebagai production API URL.
```

Checklist setelah deploy:

```txt
[ ] GitHub Actions CI passed
[ ] Vercel frontend deployment passed
[ ] Vercel backend deployment passed
[ ] Production /health normal
[ ] Production /api/health normal
[ ] Login email/password normal
[ ] Login Google normal
[ ] Forgot/reset password normal jika area auth berubah
```

---

## 20. Development Workflow Preference

Workflow yang disukai user:

```txt
1. Pahami konteks terlebih dahulu.
2. Jika butuh file, minta file spesifik.
3. Jangan langsung memberi code tanpa konteks.
4. Berikan full code replacement jika file besar/rawan error.
5. Untuk file/folder baru, user lebih suka command terminal untuk membuat struktur.
6. Untuk code existing, jangan otomatis inject script besar ke file.
7. Berikan instruksi validasi.
8. Setelah validasi, lakukan manual test.
9. Setelah aman, commit/push.
10. Cek CI/deploy.
```

Preferensi code:

```txt
Reusable.
Clean code.
Mudah didebug.
Mudah dimaintenance.
Mudah dikembangkan.
Minim komentar tidak perlu.
Tidak memakai komentar path seperti // apps/api/tests/example.test.ts di atas file.
```

---

## 21. Non-Negotiable Security Rules

Aturan yang tidak boleh dilanggar:

```txt
Jangan log password.
Jangan log JWT token.
Jangan log Authorization header.
Jangan log raw request body.
Jangan log email mentah jika tidak benar-benar perlu.
Jangan log reset password token.
Jangan log Google credential.
Jangan log SMTP_PASS.
Jangan menyimpan OAuth access/refresh token tanpa encryption design.
Jangan membaca Gmail hanya karena user login dengan Google.
Jangan cache API private user di service worker.
Jangan membuat transaksi otomatis final tanpa review user.
Jangan memakai userId dari frontend untuk ownership.
Jangan menghapus data isolation tests.
Jangan menghapus rate limit tanpa pengganti.
Jangan klaim aplikasi 100% aman.
```

---

## 22. Known Limitations

Limitasi saat ini:

```txt
JWT masih disimpan di localStorage.
Rate limit masih in-memory.
Gmail SMTP bisa masuk Spam/Promotions.
Belum ada email verification untuk register email/password.
Belum ada password change page untuk user yang sedang login.
Belum ada refresh token/session rotation.
Belum ada httpOnly cookie strategy.
Belum ada distributed rate limiting.
Belum ada official transactional email domain dengan SPF/DKIM/DMARC.
Belum ada admin/audit log viewer.
Belum ada privacy policy untuk integrasi sensitif.
```

---

## 23. Recommended Next Phases

Setelah dokumentasi auth/reset password selesai dan commit aman, rekomendasi fase berikutnya:

### Option A — Cleanup Unused Resend Config

Tujuan:

```txt
[ ] Hapus RESEND_API_KEY dari env schema jika benar-benar tidak dipakai
[ ] Hapus RESEND_API_KEY dari Vercel backend
[ ] Pastikan docs tidak menyarankan Resend sebagai runtime aktif
[ ] Validasi backend
```

Catatan:

```txt
Lakukan hati-hati. Jika env.ts masih menerima RESEND_API_KEY optional, itu tidak berbahaya, tetapi lebih bersih jika dihapus setelah Gmail SMTP stabil.
```

### Option B — Session/Auth Hardening Design

Tujuan:

```txt
[ ] Evaluasi migrasi localStorage token ke httpOnly secure cookie
[ ] Desain CSRF strategy
[ ] Desain logout/session invalidation
[ ] Desain refresh token/session expiry
[ ] Jangan langsung implementasi tanpa design doc
```

### Option C — Budgeting per Category

Tujuan produk:

```txt
[ ] User bisa menetapkan budget per kategori
[ ] Dashboard/Transactions dapat memberi sinyal budget usage
[ ] Membuat Sakuin lebih bernilai dari sekadar pencatat transaksi
```

### Option D — Financial Insight MVP

Tujuan produk:

```txt
[ ] Insight sederhana berbasis transaksi existing
[ ] Contoh: kategori pengeluaran terbesar, kenaikan pengeluaran bulanan, safe balance warning
[ ] Tidak memakai AI dulu jika belum perlu
[ ] Fokus pada insight deterministik dan mudah dijelaskan
```

Rekomendasi terdekat:

```txt
1. Selesaikan commit dokumentasi.
2. Cleanup unused Resend secret/config.
3. Lanjut ke Product Value Phase: Budgeting per Category atau Financial Insight MVP.
```

---

## 24. Suggested Final Checklist for Current Documentation Phase

Setelah README.md, docs/API.md, docs/SECURITY.md, dan docs/HANDOFF.md diganti:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Jika aman:

```bash
git add README.md docs/API.md docs/SECURITY.md docs/HANDOFF.md
git commit -m "Update documentation for auth and password reset"
git push
```

Setelah push:

```txt
[ ] GitHub Actions CI passed
[ ] Vercel frontend deployment passed
[ ] Vercel backend deployment passed
[ ] Production /health normal
[ ] Production /api/health normal
```

---

## 25. Summary for Next Developer/Agent

Sakuin adalah web app pengelola keuangan pribadi production-ready tahap awal. Fitur utama sudah berjalan: auth, Google Login, reset password, dashboard, transaksi, kategori, goals, export, PWA, Quick Transaction, security hardening, safe logging, dan database-backed audit trail.

Kondisi terbaru paling penting:

```txt
[✓] Google Login sudah aktif dan berhasil di production.
[✓] Reset password sudah aktif dan berhasil end-to-end.
[✓] Resend tidak dipakai lagi untuk runtime reset password.
[✓] Email reset password memakai Gmail SMTP/Nodemailer.
[✓] Email dapat masuk Spam/Promotions, sehingga UI memberi instruksi cek semua folder email.
[✓] CI dan deploy terakhir dikonfirmasi hijau.
[✓] Dokumentasi sedang/sudah disinkronkan untuk auth/reset password.
```

Jangan lanjut fitur sensitif seperti Gmail/e-wallet/mobile banking detection tanpa desain security, privacy, consent, token handling, audit event, dan draft-first review flow.

Prioritas setelah dokumentasi:

```txt
[1] Commit documentation sync.
[2] Cleanup unused Resend config/secret.
[3] Pilih fase produk berikutnya: Budgeting per Category atau Financial Insight MVP.
```