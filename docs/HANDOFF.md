# Sakuin Project Handoff

Dokumen ini berisi konteks teknis dan status pengembangan terbaru project **Sakuin**. Tujuannya agar developer atau agent berikutnya dapat langsung memahami kondisi project, keputusan teknis, fitur yang sudah selesai, cara menjalankan project, cara validasi, dan prioritas pengembangan berikutnya.

Dokumen ini wajib dibaca sebelum melanjutkan development, karena project sudah berjalan di production dan sudah melewati banyak fase besar:

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
```

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
[✓] Memiliki audit trail untuk aksi penting
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
[✓] AuditLog table aktif
[✓] Audit trail production smoke test aman
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

Catatan:

```txt
Jangan lanjut coding fitur baru jika working tree masih berisi perubahan yang belum jelas.
Pisahkan perubahan fitur, security, bugfix, dan dokumentasi jika memungkinkan.
Untuk fase dokumentasi saat ini, commit sebaiknya dilakukan setelah README.md, docs/SECURITY.md, docs/HANDOFF.md, dan docs/API.md selesai disinkronkan.
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

---

## 5. Current Phase Status

Status fase besar terbaru:

```txt
[✓] Phase 22A    - Landing/Auth/Transactions Mobile UI Polish
[✓] Phase 22B    - PWA Installable Support
[✓] Phase 22C.1  - Improve Transactions Mobile Date Range UX
[✓] Phase 22C.2  - Security Hardening Basic
[✓] Phase 22C.5  - Bundle Size Optimization
[✓] Phase 23A    - Simplify Category UX
[✓] Phase 23B    - Quick Transaction / Catat Cepat MVP
[✓] Phase 24A    - Auth Rate Limit + Security Test Baseline
[✓] Phase 24B.1  - Cross-Cutting Security Tests
[✓] Phase 24B.2  - Summary & Export Data Isolation Tests
[✓] Phase 24B.3  - Auth & Token Edge Case Tests
[✓] Phase 24B.4  - Rate Limit & API Abuse Edge Case Tests
[✓] Phase 24C    - Security Documentation baseline
[✓] Phase 24D.1  - Request ID + Safe Request Logging Middleware
[✓] Phase 24D.2  - Safe Security Event Logging
[✓] Phase 24D.3A - Audit Event Types + Safe Metadata Contract
[✓] Phase 24D.3B - Audit Event Recorder Abstraction
[✓] Phase 24D.3C - Audit Event Context Helper
[✓] Phase 24D.3D.1 - Audit Profile Update Event
[✓] Phase 24D.3D.2 - Audit Export Transactions Event
[✓] Phase 24D.3D.3 - Audit Transaction Mutation Events
[✓] Phase 24D.3D.4 - Audit Goal Mutation Events
[✓] Phase 24D.3D.5 - Audit Category Mutation Events
[✓] Phase 24D.4A - Audit Log Persistence Design
[✓] Phase 24D.4B - Prisma AuditLog Model + Database Sink
[✓] Phase 24D.4C - Audit Sink Noise & Reliability Polish
[~] Phase 24D.5 - Security Documentation Sync
```

Status dokumentasi saat ini:

```txt
[✓] README.md disiapkan untuk update audit trail terbaru
[✓] docs/SECURITY.md disiapkan untuk update audit trail terbaru
[~] docs/HANDOFF.md sedang diperbarui
[ ] docs/API.md perlu disinkronkan setelah ini
[ ] Commit dokumentasi ditunda sampai semua file Markdown selesai
```

---

## 6. Tech Stack

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

## 7. Project Structure

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

## 8. Environment Variables

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

## 9. Local Development Setup

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

## 10. Important Scripts

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

## 11. Validation Commands

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

## 12. Current Test Status

Frontend automated tests terakhir yang pernah tercatat:

```txt
Test Files : 3 passed
Tests      : 11 passed
```

Backend automated tests terakhir setelah database-backed audit trail:

```txt
Test Files : 17 passed
Tests      : 114 passed
Build      : passed
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

## 13. GitHub Actions CI

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

## 14. Deployment Notes

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
[✓] Request/Response typing issue pada request-id middleware di Vercel sudah diperbaiki.
[✓] Prisma Client generate EPERM di Windows diselesaikan dengan menghentikan backend process yang mengunci DLL.
```

---

## 15. Backend Architecture Summary

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
utils/safe-metadata            : metadata sanitizer dan hashing helper
utils/security-event-logger    : safe security event logging
utils/audit-event              : audit event contract
utils/audit-event-recorder     : audit recorder dan context helper
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

## 16. Frontend Architecture Summary

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

## 17. Database Summary

Database menggunakan Supabase PostgreSQL dengan Prisma ORM.

Model utama:

```txt
User
Transaction
Goal
Category
AuditLog
```

Migration penting terbaru:

```txt
20260518133113_add_audit_log
```

Model `AuditLog` ditambahkan untuk menyimpan business audit trail dengan metadata aman.

Prinsip Prisma:

```txt
Jangan mengubah schema.prisma tanpa migration.
Setelah schema berubah, jalankan db:migrate dan db:generate.
Migration folder harus ikut dicommit.
Jangan menjalankan db:reset pada database production.
```

Windows note:

```txt
Jika Prisma generate gagal dengan EPERM pada query_engine-windows.dll.node, biasanya backend/dev server/test/Prisma Studio/VSCode masih mengunci file.
Stop proses node/tsx lalu generate ulang.
```

Command bantu:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process tsx -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm --filter @sakuin/api db:generate
```

---

## 18. Security Architecture Summary

Security baseline yang sudah diterapkan:

```txt
[✓] JWT Bearer Token authentication
[✓] bcryptjs password hashing
[✓] Zod request validation
[✓] Prisma ORM
[✓] Protected endpoint
[✓] Ownership checks
[✓] CORS allowlist
[✓] Security headers
[✓] Request body size limit 1 MB
[✓] Production error masking
[✓] Login rate limit
[✓] Register rate limit
[✓] General API rate limit
[✓] Request ID via X-Request-Id
[✓] Safe request logging
[✓] Safe security event logging
[✓] Database-backed audit trail
[✓] Fail-open audit persistence
```

Security yang belum selesai:

```txt
[ ] Distributed rate limiting
[ ] Better JWT/session strategy
[ ] httpOnly secure cookie migration
[ ] CSRF strategy jika pindah ke cookie
[ ] OAuth token encryption
[ ] Google Login
[ ] Gmail disconnect/revoke flow
[ ] Formal retention policy untuk AuditLog
[ ] AuditLog viewer/admin policy
```

---

## 19. Request ID

Request ID sudah diterapkan melalui middleware.

Header:

```txt
X-Request-Id
```

Behavior:

```txt
[✓] Response membawa X-Request-Id
[✓] Request ID bisa dibuat otomatis
[✓] Request ID dari client diterima jika format aman
[✓] Request ID tidak aman diganti dengan yang baru
[✓] Request ID dipakai untuk request log, security event, dan audit event
```

File terkait:

```txt
apps/api/src/middlewares/request-id.middleware.ts
apps/api/tests/request-id-security.test.ts
```

Catatan:

```txt
Request ID bukan auth/session identifier.
Request ID tidak boleh mengandung data sensitif.
```

---

## 20. Safe Request Logging

Request logging mencatat informasi aman:

```txt
level
event
requestId
method
path
status
durationMs
timestamp
```

Request logging tidak mencatat:

```txt
password
token
Authorization header
cookie
raw request body
transaction amount
transaction note
goal amount
goal name
category name
export content
raw email
OAuth token
```

Logging request dinonaktifkan pada `NODE_ENV=test` agar test output tetap bersih.

---

## 21. Safe Security Event Logging

Security event logger sudah tersedia.

Event yang didukung:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

File terkait:

```txt
apps/api/src/utils/security-event-logger.ts
apps/api/tests/security-event-logger.test.ts
```

Prinsip:

```txt
[✓] Failed login tidak log password
[✓] Failed login tidak log email mentah
[✓] Failed login boleh memakai identifierHash
[✓] Auth failure tidak log token
[✓] Rate limit tidak log raw body/token
[✓] Metadata sensitif otomatis diredact
```

Security event saat ini tetap sebagai application log, bukan semua masuk database AuditLog, karena failed login/rate limit bisa high-volume.

---

## 22. Safe Metadata Sanitizer

Safe metadata sanitizer dipakai bersama oleh security event dan audit event.

File:

```txt
apps/api/src/utils/safe-metadata.ts
```

Fungsi utama:

```txt
createSecurityHash()
sanitizeSafeMetadata()
```

Key sensitif yang harus diredact mencakup pola:

```txt
password
token
authorization
secret
cookie
body
raw
email
credential
session
otp
pin
key
```

Nilai redaction:

```txt
[REDACTED]
```

Aturan:

```txt
Jangan membuat sanitizer baru tanpa alasan kuat.
Jika ada metadata sensitif baru, update sanitizer dan test.
```

---

## 23. Audit Trail Architecture

Audit trail sudah aktif dengan database-backed `AuditLog`.

Komponen:

```txt
utils/audit-event.ts             : audit event type/contract
utils/audit-event-recorder.ts    : recorder abstraction + recordAuditEventFromContext()
utils/audit-log-sink.ts          : database sink untuk AuditLog
utils/safe-metadata.ts           : sanitizer metadata
prisma/schema.prisma             : model AuditLog
```

Model database:

```txt
AuditLog
```

Field utama:

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

Relasi:

```txt
AuditLog.actorUserId -> User.id
onDelete: SetNull
```

Alasan `onDelete: SetNull`:

```txt
Jika user dihapus, audit history tidak langsung ikut hilang.
actorUserId bisa menjadi null.
AuditLog tidak menyimpan email/nama user.
```

Audit persistence bersifat fail-open:

```txt
Jika penyimpanan audit log gagal, request utama user tetap tidak langsung gagal.
Failure hanya dicatat sebagai safe error log tanpa metadata sensitif.
```

---

## 24. Business Audit Events

Event yang sudah dicatat ke `AuditLog`:

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

Event yang belum masuk database audit log:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Alasan:

```txt
Auth failure dan rate limit bisa high-volume.
Saat ini cukup dicatat sebagai safe security event log.
Jika ingin disimpan permanen, desain retention/storage harus dibuat dulu.
```

---

## 25. Audit Metadata Rules

Audit metadata harus aman dan minimal.

Metadata yang boleh:

```txt
changedFields
format
typeFilter
hasCategoryFilter
hasDateRange
type
hasNote
dateProvided
hasCurrentAmount
hasDeadline
hasIcon
hasColor
typeProvided
iconProvided
colorProvided
reason
```

Metadata yang tidak boleh:

```txt
password
JWT token
Authorization header
cookie
raw request body
email mentah
transaction amount
transaction note
goal name
goal targetAmount
goal currentAmount
category name
category icon value
category color value
export content
OAuth access token
OAuth refresh token
OTP
PIN
secret/API key
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

---

## 26. Audit Event by Feature

### Profile

Event:

```txt
profile.updated
```

Metadata:

```txt
changedFields
```

Tidak menyimpan:

```txt
nama baru user
safeBalanceLimit value
raw body
token
```

---

### Export

Event:

```txt
export.transactions_generated
```

Metadata:

```txt
format
typeFilter
hasCategoryFilter
hasDateRange
```

Tidak menyimpan:

```txt
isi export
transaction note
transaction amount
category name
file content
token
```

---

### Transactions

Event:

```txt
transaction.created
transaction.updated
transaction.deleted
```

Metadata:

```txt
type
hasNote
dateProvided
changedFields
reason
```

Tidak menyimpan:

```txt
amount
note
categoryId
category name
raw body
token
```

---

### Goals

Event:

```txt
goal.created
goal.updated
goal.deleted
```

Metadata:

```txt
hasCurrentAmount
hasDeadline
changedFields
reason
```

Tidak menyimpan:

```txt
goal name
targetAmount
currentAmount
remainingAmount
deadline value
raw body
token
```

---

### Categories

Event:

```txt
category.created
category.updated
category.deleted
```

Metadata:

```txt
type
hasIcon
hasColor
changedFields
typeProvided
iconProvided
colorProvided
reason
```

Tidak menyimpan:

```txt
category name
icon value
color value
raw body
token
```

---

## 27. AuditLog Production Smoke Test

Audit trail sudah dicek di production melalui Supabase table `AuditLog`.

Smoke test yang sudah dilakukan:

```txt
[✓] Update profile menghasilkan profile.updated
[✓] Create/update transaction menghasilkan transaction.created/transaction.updated
[✓] Create category menghasilkan category.created
[✓] Update goal menghasilkan goal.updated
[✓] Export transaksi menghasilkan export.transactions_generated
[✓] Metadata yang terlihat aman
[✓] Tidak terlihat data sensitif seperti token/amount/note/raw body
```

Checklist smoke test audit trail untuk perubahan berikutnya:

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

## 28. Frontend Feature Summary

### Auth

```txt
[✓] Login
[✓] Register
[✓] Logout
[✓] Protected route
[✓] Auth context
[✓] Token localStorage
```

### Dashboard

```txt
[✓] Summary cards
[✓] Recent transactions
[✓] Monthly trend
[✓] Goals summary
[✓] Add transaction
[✓] Catat Cepat
[✓] Cached data with TanStack Query
```

### Transactions

```txt
[✓] List transaksi
[✓] Create
[✓] Edit
[✓] Delete
[✓] Search
[✓] Filter type/category/date
[✓] Sort
[✓] Pagination
[✓] Quick Transaction
[✓] Inline category creation
[✓] Mobile date filter polish
```

### Categories

```txt
[✓] Default category
[✓] Custom category
[✓] Create/edit/delete custom category
[✓] Filter category
[✓] Inline category creation from transaction modal
[✓] Category page masih ada, tetapi bukan prioritas menu utama mobile
```

### Goals

```txt
[✓] Create goal
[✓] Edit goal
[✓] Delete goal
[✓] Add progress
[✓] Priority goal for dashboard
[✓] Progress percentage
```

### Profile

```txt
[✓] View profile
[✓] Update name
[✓] Update safeBalanceLimit
[✓] Logout
```

### Export

```txt
[✓] JSON
[✓] CSV
[✓] XLSX
[✓] Filter type/category/date range
[✓] Download via authenticated API client
```

### PWA

```txt
[✓] manifest.webmanifest
[✓] icons
[✓] offline.html
[✓] sw.js
[✓] service worker registration
[✓] install button
[✓] fallback manual install instruction
```

---

## 29. TanStack Query Usage

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

Halaman yang sudah memakai caching/UX optimization:

```txt
[✓] Dashboard
[✓] Transactions
[✓] Goals
[✓] Categories
[✓] Profile
[✓] Export polish/action UX
```

---

## 30. Quick Transaction / Catat Cepat

Quick Transaction adalah fitur frontend/parser rule-based untuk input transaksi cepat.

Status:

```txt
[✓] Tersedia dari Dashboard
[✓] Tersedia dari TransactionsPage
[✓] Parser mendukung natural Indonesian variations sederhana
[✓] Parser mengenali income/expense umum
[✓] Parser menggunakan kategori existing/custom jika cocok
[✓] Draft review UI dibuat collapsed agar ringan di mobile
[✓] User harus review sebelum simpan
```

Prinsip penting:

```txt
Parser tidak langsung menyimpan transaksi final.
Parser hanya membuat draft.
User harus approve sebelum data masuk transaction API.
```

Batasan:

```txt
Parser masih rule-based.
Belum memakai AI/LLM.
Tidak ditargetkan memahami semua variasi bahasa natural.
```

---

## 31. PWA Notes

Sakuin sudah installable sebagai PWA.

Catatan install:

```txt
Browser tidak selalu memberi event beforeinstallprompt.
Jika event tersedia, tombol Install Sakuin bisa memicu prompt.
Jika tidak tersedia, tombol menampilkan instruksi manual.
```

Catatan update:

```txt
Installed PWA tetap mengambil versi dari domain production.
Jika deploy baru sudah tersedia, user biasanya perlu refresh/reopen app.
Service worker/cache dapat membuat update tidak langsung terasa di sebagian kondisi.
```

Rule security PWA:

```txt
Service worker tidak boleh cache API private user.
Jangan cache auth, transactions, summary, profile, goals, categories user-specific, export, atau AuditLog.
```

---

## 32. Known Technical Decisions

### Auth token storage

Saat ini token disimpan di localStorage.

Alasan:

```txt
Cukup untuk MVP/production awal.
Lebih sederhana untuk frontend auth flow.
```

Risiko:

```txt
Jika XSS terjadi, token bisa dicuri.
```

Future improvement:

```txt
Evaluasi httpOnly secure cookie + CSRF strategy.
```

---

### Rate limit store

Saat ini rate limit memakai in-memory store.

Alasan:

```txt
Cukup untuk baseline/MVP dan traffic rendah.
Mudah dites.
```

Risiko:

```txt
Tidak ideal untuk serverless/multi-instance karena state bisa berbeda antar instance.
```

Future improvement:

```txt
Redis/Upstash/Vercel KV rate limit.
```

---

### Security event vs AuditLog

Security events seperti failed login/rate limit masih application log.

Business mutation events masuk AuditLog.

Alasan:

```txt
Failed login/rate-limit bisa high-volume.
AuditLog saat ini difokuskan untuk business trail yang volumenya lebih terkendali.
```

---

### Audit persistence fail-open

Audit log persistence fail-open.

Alasan:

```txt
Audit trail penting, tetapi gagal menyimpan audit tidak boleh membuat fitur utama user gagal.
Failure dicatat sebagai safe error log tanpa metadata sensitif.
```

---

### Gmail/e-wallet integration

Belum diimplementasikan.

Rule:

```txt
Jangan coding Gmail/e-wallet integration sebelum security/privacy design matang.
```

---

## 33. Workflow Preference dari User

User menginginkan workflow development yang hati-hati:

```txt
1. Pahami konteks.
2. Minta file relevan jika perlu.
3. Jangan langsung memberi code tanpa konteks.
4. Berikan full code replacement atau instruksi spesifik.
5. Jalankan validasi.
6. Manual test.
7. Commit/push.
8. Cek CI/deploy.
9. Baru lanjut fase berikutnya.
```

User lebih suka:

```txt
[✓] Penjelasan detail dan hati-hati
[✓] Step kecil per fase
[✓] Validasi sebelum commit
[✓] Tidak buru-buru ke fitur sensitif
[✓] Kode clean, reusable, mudah debug, mudah maintain, mudah dikembangkan
```

User tidak suka:

```txt
[!] Code diberi komentar path file seperti // apps/api/tests/...
[!] Script otomatis yang menginjeksi code besar ke existing file
[!] Perubahan besar tanpa validasi
[!] Fitur sensitif dibuat tanpa desain
```

Saat perlu membuat file/folder baru:

```txt
User lebih suka command terminal hanya untuk membuat file/folder.
Contoh: New-Item, mkdir, touch.
Untuk isi code, berikan full replacement code manual untuk dicopy.
```

---

## 34. Code Style and Maintenance Rules

Prinsip code:

```txt
[✓] Reusable
[✓] Clean code
[✓] Mudah didebug
[✓] Mudah dimaintain
[✓] Mudah dikembangkan
[✓] Type-safe
[✓] Testable
```

Rules:

```txt
Jangan menambah komentar path file di atas code.
Jangan membuat helper duplikat jika sudah ada utility reusable.
Jangan mencampur business logic service dengan request context jika tidak perlu.
Jangan membuat logging menyimpan data sensitif.
Jangan mengubah response API tanpa update frontend dan docs.
Jangan mengubah Prisma schema tanpa migration.
Jangan mengubah auth/CORS/security middleware tanpa regression test.
```

Pattern yang sudah dipakai:

```txt
Controller:
- ambil context request
- ambil userId dari auth context
- panggil service
- record audit event jika mutation berhasil
- return success response

Service:
- business logic
- ownership checks
- Prisma query
- mapping response

Utils:
- response helper
- http error
- safe metadata
- audit event
- audit recorder
- audit sink
```

---

## 35. Manual Production Smoke Test

Checklist production setelah perubahan besar:

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

Checklist tambahan untuk security/audit:

```txt
[ ] Response memiliki X-Request-Id
[ ] Production log tidak membocorkan token/password/raw body
[ ] AuditLog mencatat business event yang relevan
[ ] AuditLog metadata aman
[ ] Tidak ada audit_log_persist_failed di production log
```

---

## 36. Hal yang Harus Dijaga

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
[!] Safe metadata sanitizer
[!] AuditLog metadata safety
[!] Audit sink fail-open behavior
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
[ ] Test deleted user token
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
[ ] Test database sink jika AuditLog berubah
```

---

## 37. Next Recommended Roadmap

Prioritas paling aman dari kondisi saat ini:

```txt
1. Selesaikan Phase 24D.5 - Security Documentation Sync
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

## 38. Immediate Next Step

Dari kondisi dokumen saat ini, langkah langsung berikutnya adalah:

```txt
[ ] Update docs/API.md agar sinkron dengan request ID, CORS X-Request-Id, security logging, audit trail, AuditLog, dan status test terbaru.
[ ] Setelah semua Markdown selesai, jalankan typecheck frontend/backend.
[ ] Cek git diff semua Markdown.
[ ] Commit dokumentasi.
[ ] Push.
[ ] Cek CI/deploy/health.
```

Suggested validation untuk dokumentasi:

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
[ ] GitHub Actions CI passed
[ ] Vercel deployment passed
[ ] Production /health normal
[ ] Production /api/health normal
```

---

## 39. Final Notes for Next Developer or Agent

Sakuin sudah berada pada fase production dengan security baseline yang cukup matang untuk MVP/early production.

Namun beberapa prinsip harus tetap dijaga:

```txt
Jangan mengklaim aplikasi 100% aman.
Jangan membuat fitur sensitif tanpa desain security/privacy.
Jangan menyimpan data sensitif di log atau audit metadata.
Jangan membaca Gmail/e-wallet/mobile banking data tanpa consent eksplisit.
Jangan auto-save transaksi dari parser/email detection tanpa user review.
Jangan mengubah Prisma schema tanpa migration dan test.
Jangan mengubah auth flow tanpa regression test.
Jangan mengubah CORS/deployment config tanpa production validation.
```

Project harus dilanjutkan dengan pola:

```txt
Pahami konteks → minta file relevan → ubah kecil dan terukur → validasi → manual test → commit/push → cek CI/deploy → lanjut fase berikutnya.
```