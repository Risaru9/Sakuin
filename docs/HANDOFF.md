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
[✓] Bertanya ke Asisten Sakuin tentang kondisi keuangan pribadi
[✓] Membuat draft transaksi dari chat natural
[✓] Membuat banyak draft transaksi dari satu prompt
[✓] Menyimpan semua draft transaksi AI sekaligus dengan review user
```

Arah produk Sakuin bukan hanya menjadi pencatat transaksi seperti spreadsheet. Sakuin diarahkan agar lebih bernilai dari Excel/manual tracking dengan membantu user:

```txt
[✓] Mencatat transaksi lebih cepat
[✓] Mengurangi effort input manual
[✓] Memahami kondisi keuangan pribadi
[✓] Mendapat insight pengeluaran/pemasukan
[✓] Menjaga keamanan data keuangan
[✓] Memiliki audit trail untuk aksi penting
[✓] Memakai AI assistant yang aman, financial-only, dan user-controlled
[ ] Ke depannya menjadi financial assistant/advisor ringan yang tetap aman dan tidak memberi nasihat profesional berisiko
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
[✓] Asisten Sakuin berjalan di production
[✓] AI transaction draft single berjalan
[✓] AI transaction draft multi berjalan
[✓] Simpan Semua Draft berjalan
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
Jangan commit secret, .env, token, database URL, SMTP_PASS, GEMINI_API_KEY, atau credential lain.
Sebelum commit, selalu cek git status dan git diff --stat.
Saat stage file, sebutkan file secara eksplisit agar tidak ada file penting terlewat.
```

---

## 4. Development Workflow Preference

User bekerja di Windows PowerShell, root project biasanya:

```txt
D:\sakuin
```

Preferensi workflow user:

```txt
[✓] Instruksi harus step-by-step dan jelas
[✓] Untuk pembuatan file/folder baru, gunakan command terminal
[✓] Untuk code replacement besar, user lebih suka full code replacement
[✓] Untuk dokumentasi .md, kirim full markdown dalam satu markdown block agar mudah disalin
[✓] Jangan commit sebelum validasi penting lulus
[✓] Jangan meminta user commit .env atau secret
[✓] Jangan menjalankan test ke production database
[✓] Jika ada error validasi, minta user kirim full log terminal
```

Aturan saat memberi code:

```txt
[✓] Pastikan code block rapi
[✓] Jangan mencampur citation/internal token ke dalam code
[✓] Jangan mengirim potongan yang ambigu untuk file besar jika user meminta full code
[✓] Jaga code reusable, clean, mudah debug, maintainable, dan mudah extend
[✓] Hindari komentar path di awal file seperti // apps/api/... jika tidak perlu
```

---

## 5. Current Documentation Status

Dokumentasi yang sedang disinkronkan setelah fase AI transaction draft:

```txt
[✓] docs/AI.md diperbarui untuk Asisten Sakuin terbaru, multi draft, Simpan Semua Draft, no auto-scroll, provider routing, dan policy AI
[✓] docs/API.md diperbarui untuk /api/ai/chat, transactionDrafts, transaction draft policy, dan AI security notes
[~] docs/HANDOFF.md sedang diperbarui melalui dokumen ini
[ ] docs/SECURITY.md perlu dicek/update jika ada detail AI privacy/security yang belum sinkron
[ ] README.md opsional jika ingin update ringkasan produk besar
```

Setelah semua file `.md` selesai diperbarui, lakukan validasi ringan:

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

Rekomendasi commit setelah semua dokumentasi selesai:

```bash
git add docs/AI.md docs/API.md docs/HANDOFF.md docs/SECURITY.md
git commit -m "Update documentation for AI transaction drafts"
git push
```

Jika README.md juga diperbarui:

```bash
git add README.md docs/AI.md docs/API.md docs/HANDOFF.md docs/SECURITY.md
git commit -m "Update documentation for AI assistant features"
git push
```

---

## 6. Latest Phase Status

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
[✓] Asisten Sakuin backend foundation
[✓] Asisten Sakuin frontend chat UI
[✓] Gemini provider foundation
[✓] AI provider router and usage control
[✓] Financial scenario analyzer
[✓] Rule-based AI transaction draft parser
[✓] Frontend single transaction draft rendering
[✓] Frontend multi transaction draft rendering
[✓] Simpan Semua Draft
[✓] AI chat no forced auto-scroll UX fix
[~] Documentation sync after AI transaction draft
```

Latest confirmed status:

```txt
[✓] Frontend validation passed
[✓] Backend validation passed when relevant
[✓] User committed latest AI UX changes
[✓] GitHub Actions CI passed
[✓] Vercel deployment passed
[✓] Production manual test passed
```

---

## 7. Release Context

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
User sebelumnya memutuskan tag hanya diperbarui ketika ada fitur/fix besar.
```

Untuk fitur Asisten Sakuin, tag baru dapat dipertimbangkan setelah dokumentasi selesai dan semua regression aman, tetapi tidak wajib jika belum diputuskan sebagai milestone release.

---

## 8. Tech Stack

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
Gemini API integration
Vitest
```

### Deployment

```txt
Frontend : Vercel
Backend  : Vercel serverless function
Database : Supabase PostgreSQL
CI       : GitHub Actions
Email    : Gmail SMTP using App Password
AI       : Gemini API via backend only
```

---

## 9. Project Structure

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
│  │  │  │  ├─ ai/
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
│     │  │  ├─ ai/
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
│  ├─ AI.md
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

## 10. Core Features Status

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
[✓] Transaksi dari AI draft disimpan menggunakan createTransaction existing
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

## 11. Asisten Sakuin Status

Asisten Sakuin adalah fitur AI financial helper yang tersedia di:

```txt
/asisten
```

Entry point:

```txt
Floating AI launcher di halaman authenticated melalui AppShell.
```

Tujuan Asisten Sakuin:

```txt
[✓] Menjawab ringkasan keuangan user
[✓] Menganalisis pengeluaran
[✓] Menganalisis pemasukan
[✓] Membandingkan periode
[✓] Memberi saran hemat ringan
[✓] Menganalisis goals
[✓] Menganalisis skenario finansial sederhana
[✓] Membuat draft transaksi dari chat natural
[✓] Membuat banyak draft transaksi dari satu prompt
[✓] Menolak topik di luar finansial Sakuin
```

Status fitur AI:

```txt
[✓] AI intent classifier
[✓] Gemini provider foundation
[✓] AI provider abstraction
[✓] AI provider router
[✓] Default/complex/fallback model routing
[✓] Usage control
[✓] Financial context aggregation
[✓] AI chat endpoint
[✓] AI chat security tests
[✓] Financial scenario analyzer
[✓] Rule-based transaction draft engine
[✓] Single transaction draft
[✓] Multi transaction draft
[✓] transactionDraft backward compatibility
[✓] transactionDrafts array
[✓] Frontend /asisten chat UI
[✓] Floating AI launcher
[✓] Local chat history
[✓] Clear chat history dialog
[✓] Cancel draft via button
[✓] Cancel draft via natural text command
[✓] Save draft per item
[✓] Simpan Semua Draft
[✓] No auto-scroll saat save/cancel/save all
[✓] Typewriter effect ringan tanpa memaksa scroll
```

---

## 12. AI Architecture

Frontend tidak boleh memanggil AI provider secara langsung.

Arsitektur:

```txt
Frontend /asisten
  ↓
POST /api/ai/chat
  ↓
Backend auth middleware
  ↓
AI intent classifier
  ↓
Out-of-scope guardrail
  ↓
Financial data aggregation
  ↓
Provider router / rule-based engine
  ↓
Output validation
  ↓
Response to frontend
```

Provider:

```txt
Gemini API
```

Environment backend:

```env
GEMINI_API_KEY="..."
GEMINI_MODEL_DEFAULT="..."
GEMINI_MODEL_COMPLEX="..."
GEMINI_MODEL_FALLBACK="..."
```

Aturan penting:

```txt
GEMINI_API_KEY hanya boleh ada di backend.
Jangan membuat VITE_GEMINI_API_KEY.
Frontend tidak boleh menerima secret AI.
Out-of-scope tidak boleh memanggil Gemini.
Transaction draft tidak boleh memanggil Gemini.
Transaction draft harus rule-based.
```

---

## 13. AI Transaction Draft Status

Fitur AI transaction draft sekarang mendukung single dan multi draft.

Contoh single draft:

```txt
catat makan ayam geprek 15000
```

Contoh multi draft:

```txt
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

Target hasil multi draft:

```txt
Draft 1: makan, Rp12.000, Makanan
Draft 2: minum, Rp4.000, Minuman
Draft 3: cimol, Rp4.000, Makanan
Draft 4: cireng, Rp5.000, Makanan
```

Backend response:

```txt
[✓] transactionDraft tetap dikirim sebagai draft pertama untuk backward compatibility
[✓] transactionDrafts dikirim sebagai array semua draft
[✓] cards menampilkan jumlah draft, draft siap disimpan, dan total nominal jika tersedia
[✓] suggestions tidak boleh berisi action palsu seperti "Simpan semua"
```

Frontend behavior:

```txt
[✓] Render single draft
[✓] Render multi draft
[✓] Simpan Draft per item
[✓] Batalkan Draft per item
[✓] Simpan Semua Draft
[✓] Save batch dilakukan parallel melalui createTransaction existing
[✓] Draft saved/cancelled state disimpan di localStorage
[✓] State saved/cancelled memakai draft key ${message.id}:${draftIndex}
[✓] Refresh page mempertahankan state saved/cancelled
[✓] Clear chat history membersihkan chat history dan draft state
[✓] Input chat tidak dikunci hanya karena draft sedang disimpan
[✓] No auto-scroll saat save/cancel/save all
```

Policy:

```txt
AI tidak boleh auto-save transaksi.
AI hanya membuat draft.
User harus review dan klik simpan.
Draft yang dibatalkan tidak bisa disimpan.
Draft yang sudah disimpan tidak bisa disimpan ulang.
Transaction draft tidak memanggil Gemini.
```

---

## 14. AI Guardrail

Asisten Sakuin hanya boleh menjawab topik:

```txt
transaksi
pemasukan
pengeluaran
kategori
goals
budget
safe balance
ringkasan keuangan
perbandingan periode
saran hemat ringan
draft transaksi
skenario finansial pribadi sederhana
```

Asisten Sakuin harus menolak:

```txt
pertanyaan umum di luar finansial
coding
politik
hiburan
kesehatan
hukum
pajak profesional
investasi spesifik
pinjaman spesifik
prediksi finansial pasti
permintaan yang meminta AI mengarang data pribadi
```

Contoh yang harus ditolak:

```txt
siapa istri Naruto?
buatkan cerpen
buatkan kode React
jelaskan sejarah Majapahit
```

Contoh yang harus diterima:

```txt
Gaji saya 8 juta, ingin beli motor 30 juta, realistis nggak?
Kalau 8 bulan gimana?
Kalau tenor 12 sampai 32 bulan gimana?
Kalau saya tekan pengeluaran apa yang harus dilakukan?
Bagaimana kalau beli HP 10 juta, low risk atau tidak?
```

Pedoman jawaban skenario finansial:

```txt
[✓] Jawab dengan verdict terlebih dahulu
[✓] Hitung kebutuhan per bulan jika ada target/tenor/deadline
[✓] Bandingkan dengan pemasukan jika user memberi pemasukan
[✓] Jelaskan risiko utama
[✓] Jelaskan jika bunga/biaya tambahan belum dihitung
[✓] Beri saran aman dan ringan
[✗] Jangan memberi keputusan profesional
[✗] Jangan langsung menyuruh user membeli
[✗] Jangan mengarang data Sakuin
```

---

## 15. AI Files

File penting backend:

```txt
apps/api/src/modules/ai/ai.intent.ts
apps/api/src/modules/ai/ai.provider.ts
apps/api/src/modules/ai/ai.provider-router.ts
apps/api/src/modules/ai/ai.service.ts
apps/api/src/modules/ai/ai.types.ts
apps/api/src/modules/ai/ai-financial-context.ts
apps/api/src/modules/ai/ai-financial-scenario.ts
apps/api/src/modules/ai/ai-transaction-draft.ts
apps/api/src/modules/ai/ai.route.ts
```

File penting frontend:

```txt
apps/web/src/features/ai/ai.types.ts
apps/web/src/features/ai/ai.service.ts
apps/web/src/features/ai/pages/AsistenPage.tsx
apps/web/src/components/layout/AppShell.tsx
```

Test penting:

```txt
apps/api/tests/ai-intent.test.ts
apps/api/tests/ai-chat-service.test.ts
apps/api/tests/ai-financial-scenario.test.ts
apps/api/tests/ai-transaction-draft.test.ts
```

---

## 16. Database Safety Context

Pernah terjadi masalah karena local test sempat memakai database production.

Konteks:

```txt
Local .env dan Vercel sempat memakai database URL production yang sama.
Test yang menjalankan cleanup/deleteMany berbahaya terhadap production.
Setelah itu user membuat database test terpisah di Supabase.
.env local sekarang harus mengarah ke database test.
CI juga harus memakai secrets test.
```

CI secrets:

```env
CI_DATABASE_URL="postgresql://..."
CI_DIRECT_URL="postgresql://..."
CI_JWT_SECRET="minimum_32_characters_secret"
```

CI safety environment:

```env
SAKUIN_DATABASE_TARGET="test"
SAKUIN_PRODUCTION_DATABASE_PROJECT_REF="bwzxtjgrerjimcuyslci"
```

Workflow CI memiliki step:

```txt
Verify CI database safety
```

Aturan keras:

```txt
Jangan menjalankan automated test ke production database.
Jangan mengubah database safety guard tanpa alasan kuat.
Jangan menghapus SAKUIN_DATABASE_TARGET.
Jangan menghapus SAKUIN_PRODUCTION_DATABASE_PROJECT_REF.
Jangan memakai DATABASE_URL production untuk local test.
```

---

## 17. Security Status

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
[✓] AI guardrail baseline
[✓] AI data aggregation user-only
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

## 18. Audit Trail

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

Candidate AI audit events untuk masa depan:

```txt
ai.chat_requested
ai.chat_completed
ai.chat_failed
ai.out_of_scope_blocked
ai.transaction_draft_generated
ai.provider_used
ai.provider_fallback
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
GEMINI_API_KEY
transaction amount
transaction note
goal name
goal targetAmount
goal currentAmount
category name
category icon value
category color value
export content
AI prompt penuh
AI response penuh
```

---

## 19. Environment Variables

### Backend Required

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="minimum_32_characters_secret"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

### Google Login

Backend:

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Frontend:

```env
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

### Gmail SMTP / Nodemailer

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_pengirim@gmail.com"
SMTP_PASS="gmail_app_password_16_karakter_tanpa_spasi"
EMAIL_FROM="Sakuin <email_pengirim@gmail.com>"
```

Catatan:

```txt
SMTP_PASS menggunakan Gmail App Password, bukan password login Gmail biasa.
App Password tidak boleh disimpan di repository.
EMAIL_FROM sebaiknya memakai alamat yang sama dengan SMTP_USER.
Email reset password dapat masuk ke Spam/Promotions.
Frontend sudah memberi instruksi kepada user untuk mengecek folder email.
```

### AI / Gemini

```env
GEMINI_API_KEY="..."
GEMINI_MODEL_DEFAULT="..."
GEMINI_MODEL_COMPLEX="..."
GEMINI_MODEL_FALLBACK="..."
```

Aturan:

```txt
GEMINI_API_KEY hanya boleh ada di backend.
Jangan membuat VITE_GEMINI_API_KEY.
Frontend tidak boleh memanggil Gemini langsung.
Transaction draft tidak memakai Gemini.
```

### Frontend Required

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## 20. Validation Commands

Frontend:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

Backend:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Backend AI specific:

```bash
pnpm --filter @sakuin/api test -- tests/ai-intent.test.ts
pnpm --filter @sakuin/api test -- tests/ai-chat-service.test.ts
pnpm --filter @sakuin/api test -- tests/ai-financial-scenario.test.ts
pnpm --filter @sakuin/api test -- tests/ai-transaction-draft.test.ts
```

Documentation-only minimal validation:

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

Git:

```bash
git status
git diff --stat
git diff
git diff --cached --stat
git add <file>
git commit -m "<message>"
git push
```

---

## 21. Manual Regression Checklist

### Auth

```txt
[ ] Register email/password normal
[ ] Login email/password normal
[ ] Login Google normal
[ ] Register Google normal
[ ] Forgot password normal
[ ] Reset password normal
[ ] Reset password email terkirim
[ ] Logout normal
```

### Core App

```txt
[ ] Dashboard normal
[ ] Transactions list normal
[ ] Add transaction normal
[ ] Edit transaction normal
[ ] Delete transaction normal
[ ] Categories normal
[ ] Goals normal
[ ] Profile normal
[ ] Export JSON normal
[ ] Export CSV normal
[ ] Export XLSX normal
```

### AI Assistant

```txt
[ ] /asisten terbuka normal
[ ] Floating AI button muncul di authenticated pages
[ ] Prompt financial summary dijawab
[ ] Prompt spending analysis dijawab
[ ] Prompt goal/scenario dijawab
[ ] Out-of-scope ditolak
[ ] Single transaction draft muncul
[ ] Multi transaction draft muncul
[ ] Simpan Draft bekerja
[ ] Batalkan Draft bekerja
[ ] Simpan Semua Draft bekerja
[ ] Draft saved/cancelled state bertahan setelah refresh
[ ] Clear chat history menghapus chat dan draft state
[ ] Tidak ada auto-scroll saat save/cancel/save all
[ ] Transactions page menampilkan transaksi yang disimpan dari AI draft
```

Test prompt AI transaction draft:

```txt
catat makan ayam geprek 15000
dikasih kakak 100000
bensin 30000 kemarin
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

Test out-of-scope:

```txt
siapa istri Naruto?
buatkan cerpen
buatkan kode React
jelaskan sejarah Majapahit
```

Test scenario:

```txt
gaji saya 8 juta ingin beli motor 30 juta, realistis nggak?
kalau 8 bulan gimana?
kalau tenor 12 sampai 32 bulan gimana?
```

---

## 22. Known Limitations

Keterbatasan project saat ini:

```txt
[ ] Auth token masih di localStorage
[ ] Belum ada httpOnly secure cookie auth
[ ] Belum ada refresh token strategy
[ ] Belum ada email verification untuk akun email/password
[ ] Belum ada password change flow untuk user login
[ ] Rate limit masih baseline/in-memory
[ ] Audit log viewer belum tersedia
[ ] Budgeting per category belum tersedia
[ ] Financial health score belum tersedia
[ ] AI insight 3-6 bulan belum tersedia sebagai fitur penuh
[ ] Edit draft langsung dari chat AI belum tersedia
[ ] Ubah kategori draft langsung dari chat AI belum tersedia
[ ] Persistent server-side chat history belum tersedia
[ ] AI memory lintas device belum tersedia
[ ] Gmail/e-wallet transaction detection belum tersedia
[ ] Privacy policy untuk integrasi sensitif belum dibuat
```

Catatan:

```txt
Beberapa keterbatasan disengaja agar project tetap aman, terkontrol, dan mudah divalidasi.
Jangan mengimplementasikan fitur sensitif tanpa desain security/privacy yang matang.
```

---

## 23. Priority Backlog

### Option A — Documentation Finalization

Tujuan:

```txt
[✓] docs/AI.md update
[✓] docs/API.md update
[~] docs/HANDOFF.md update
[ ] docs/SECURITY.md update jika diperlukan
[ ] README.md update jika diperlukan
```

Rekomendasi:

```txt
Selesaikan docs/SECURITY.md setelah HANDOFF.md agar AI privacy/security policy sinkron.
```

---

### Option B — Security Cleanup

Tujuan:

```txt
[ ] Cleanup unused Resend env/config reference jika masih ada
[ ] Pastikan runtime reset password hanya memakai Gmail SMTP/Nodemailer
[ ] Pastikan tidak ada secret lama yang tidak terpakai di Vercel
```

Catatan:

```txt
Jika env.ts masih menerima RESEND_API_KEY optional, itu tidak berbahaya, tetapi lebih bersih jika dihapus setelah Gmail SMTP stabil.
```

---

### Option C — Phase 26E.1 Financial Health Snapshot

Tujuan:

```txt
[ ] Membuat ringkasan kesehatan finansial sederhana
[ ] Menghitung rasio pengeluaran terhadap pemasukan
[ ] Membaca safe balance awareness
[ ] Memberi status aman/waspada/berisiko
[ ] Menjawab dengan format ringkas dan practical
```

Contoh output:

```txt
Status: Waspada ringan.
Pengeluaran bulan ini sudah 72% dari pemasukan.
Kategori terbesar adalah Makanan.
Saran: batasi pengeluaran harian sekitar Rp60.000 sampai akhir bulan.
```

---

### Option D — Phase 26E.2 Spending Pattern Insight

Tujuan:

```txt
[ ] Analisis kategori boros
[ ] Tren pengeluaran 3-6 bulan
[ ] Deteksi kenaikan tidak biasa
[ ] Rekomendasi batas mingguan
[ ] Tetap financial-only dan tidak overwhelming
```

---

### Option E — Budgeting per Category

Tujuan produk:

```txt
[ ] User bisa menetapkan budget per kategori
[ ] Dashboard/Transactions dapat memberi sinyal budget usage
[ ] Membuat Sakuin lebih bernilai dari sekadar pencatat transaksi
```

Catatan:

```txt
Budgeting per Category bisa menjadi fitur produk besar setelah AI transaction draft stabil.
Fitur ini bisa digabung dengan Asisten Sakuin agar AI bisa membaca budget usage.
```

---

## 24. Suggested Final Checklist for Current Documentation Phase

Setelah docs/AI.md, docs/API.md, docs/HANDOFF.md, dan docs/SECURITY.md diganti:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Jika aman:

```bash
git add docs/AI.md docs/API.md docs/HANDOFF.md docs/SECURITY.md
git commit -m "Update documentation for AI assistant features"
git push
```

Jika README.md juga diubah:

```bash
git add README.md docs/AI.md docs/API.md docs/HANDOFF.md docs/SECURITY.md
git commit -m "Update documentation for AI assistant features"
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

Sakuin adalah web app pengelola keuangan pribadi production-ready tahap awal. Fitur utama sudah berjalan: auth, Google Login, reset password, dashboard, transaksi, kategori, goals, export, PWA, Quick Transaction, security hardening, safe logging, database-backed audit trail, dan Asisten Sakuin.

Kondisi terbaru paling penting:

```txt
[✓] Google Login sudah aktif dan berhasil di production.
[✓] Reset password sudah aktif dan berhasil end-to-end.
[✓] Email reset password memakai Gmail SMTP/Nodemailer.
[✓] CI dan deploy terakhir dikonfirmasi hijau.
[✓] Asisten Sakuin tersedia di /asisten.
[✓] Gemini provider hanya dipanggil dari backend.
[✓] Out-of-scope tidak boleh memanggil Gemini.
[✓] Transaction draft memakai rule-based parser, bukan Gemini.
[✓] Transaction draft tidak auto-save.
[✓] Backend mendukung transactionDraft dan transactionDrafts.
[✓] Frontend mendukung single dan multi transaction draft.
[✓] Frontend mendukung Simpan Semua Draft.
[✓] Frontend tidak auto-scroll saat save/cancel/save all.
[✓] Dokumentasi AI/API sedang disinkronkan untuk fitur terbaru.
```

Jangan lanjut fitur sensitif seperti Gmail/e-wallet/mobile banking detection tanpa desain security, privacy, consent, token handling, audit event, dan draft-first review flow.

Prioritas setelah dokumentasi:

```txt
[1] Selesaikan docs/SECURITY.md jika perlu.
[2] Commit documentation sync.
[3] Cleanup unused Resend config/secret jika masih ada.
[4] Pilih fase produk berikutnya:
    - Phase 26E.1 Financial Health Snapshot
    - Spending Pattern Insight
    - Budgeting per Category
```

Aturan utama untuk agent berikutnya:

```txt
Jangan menyentuh database/migration tanpa alasan kuat.
Jangan menjalankan test ke production database.
Jangan expose secret.
Jangan memanggil AI provider dari frontend.
Jangan memakai Gemini untuk transaction draft.
Jangan auto-save transaksi dari AI.
Jangan membuat fitur sensitif tanpa security design.
Selalu validasi lokal sebelum commit.
Selalu cek CI dan deployment setelah push.
```

## Performance & Core UX Handoff Notes

Bagian ini mencatat status terbaru optimisasi performance dan core UX Sakuin setelah fase transaksi, dashboard, dan production latency optimization.

---

### Current Performance Status

Core transaction flow dan dashboard performance sudah melewati beberapa optimisasi penting.

Status terbaru:

```txt
[✓] Stable transaction ordering selesai
[✓] True optimistic add transaction selesai
[✓] True optimistic edit transaction selesai
[✓] True optimistic delete transaction selesai
[✓] True optimistic Quick Transaction selesai
[✓] Backend bulk transaction endpoint selesai
[✓] Frontend Quick Transaction sudah memakai bulk endpoint
[✓] Summary endpoint query shape optimization selesai
[✓] Summary cache patch untuk nilai dashboard dasar selesai
[✓] Production region latency issue berhasil diidentifikasi dan diperbaiki
```

Setelah deployment region disesuaikan agar backend Vercel lebih dekat dengan Supabase database region, production webapp terasa jauh lebih cepat.

---

### Important Production Finding

Masalah performance production sebelumnya bukan terutama berasal dari React, ukuran bundle, atau rendering frontend.

Hasil observasi Network tab menunjukkan endpoint kecil seperti:

```txt
/api/auth/me
/api/profile
/api/goals
/api/categories
/api/transactions
```

sempat memakan waktu beberapa detik.

Ini menunjukkan bottleneck utama berada pada production API latency, terutama jarak region antara backend Vercel Function dan Supabase database.

Supabase database Sakuin berada di region:

```txt
Oceania / Sydney
```

Karena itu, backend Vercel Function harus ditempatkan di region yang sama atau paling dekat dengan Sydney.

Catatan penting:

```txt
Jangan hanya mengubah region frontend.
Yang paling penting adalah region backend API project,
karena backend API yang melakukan koneksi ke Supabase/PostgreSQL.
```

Setelah region backend disesuaikan, production performance membaik signifikan.

---

### Request Timing / Observability

Backend tidak memiliki file terpisah bernama:

```txt
request-logger.middleware.ts
```

Request ID dan request timing sudah digabung di:

```txt
apps/api/src/middlewares/request-id.middleware.ts
```

Middleware tersebut mencatat safe request log:

```txt
requestId
method
path
status
durationMs
timestamp
```

Log ini digunakan untuk membedakan apakah bottleneck terjadi di:

```txt
frontend/browser/network
backend function
database query
cold start/serverless
region latency
```

Log request tidak boleh menyimpan data sensitif seperti:

```txt
password
token
Authorization header
raw request body
transaction note
transaction amount
categoryId mentah dari payload
private financial details
```

---

### Completed Transaction Performance Improvements

#### Stable Transaction Ordering

Transaksi sekarang diurutkan secara stabil.

Aturan sorting:

```txt
date_desc:
  date DESC
  createdAt DESC

date_asc:
  date ASC
  createdAt DESC

created_desc:
  createdAt DESC

created_asc:
  createdAt ASC
```

Tujuan:

```txt
Jika beberapa transaksi memiliki tanggal transaksi yang sama,
input terbaru tetap tampil lebih atas di dalam tanggal tersebut.
```

Backend dan frontend cache sorting sudah diselaraskan agar optimistic row tidak berubah posisi secara aneh setelah data final dari backend masuk.

---

#### True Optimistic Transaction Updates

Add, edit, delete, dan Quick Transaction sudah memakai optimistic update.

Expected behavior:

```txt
Add transaction:
  row langsung muncul sebelum server selesai

Edit transaction:
  row langsung berubah sebelum server selesai

Delete transaction:
  row langsung hilang sebelum server selesai

Quick Transaction:
  semua draft langsung muncul sebagai optimistic rows
```

Jika server sukses:

```txt
optimistic row diganti dengan data final dari backend
```

Jika server gagal:

```txt
cache rollback ke kondisi sebelumnya
```

---

#### Quick Transaction Bulk Endpoint

Quick Transaction sebelumnya mengirim banyak request:

```txt
POST /api/transactions
POST /api/transactions
POST /api/transactions
```

Sekarang Quick Transaction memakai satu endpoint:

```txt
POST /api/transactions/bulk
```

Backend bulk endpoint behavior:

```txt
Jika semua item valid:
  semua transaksi dibuat.

Jika satu item invalid:
  seluruh bulk operation gagal.
  tidak ada transaksi yang dibuat.
```

Audit event tetap dicatat aman per transaksi tanpa menyimpan amount, note, atau categoryId mentah di metadata audit.

---

### Completed Summary Performance Improvements

Summary endpoint sudah dioptimasi tanpa mengubah response contract frontend.

Optimisasi yang sudah dilakukan:

```txt
[✓] Multiple amount aggregate diganti dengan groupBy per type
[✓] Category summary diganti dengan groupBy categoryId + type
[✓] Recent transactions memakai date DESC + createdAt DESC
[✓] getAiFinancialContext dijalankan paralel dengan query summary
[✓] /api/summary response contract tetap sama
```

Response `/api/summary` masih menyediakan:

```txt
totalIncome
totalExpense
balance
safeBalanceLimit
isBelowSafeLimit
safeToSpend
financialCheckup
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
expenseByCategory
incomeByCategory
monthlyTrend
```

---

### Summary Cache Patch

Frontend sudah menambahkan optimistic patch untuk nilai dashboard dasar.

Field yang dipatch secara optimistic:

```txt
totalIncome
totalExpense
balance
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
```

Field yang tetap disinkronkan dari backend:

```txt
safeToSpend
financialCheckup
monthlyTrend
incomeByCategory
expenseByCategory
```

Alasannya:

```txt
safeToSpend, financialCheckup, monthlyTrend, dan category summary adalah derived data yang lebih kompleks.
Lebih aman jika tetap dihitung oleh backend agar konsisten.
```

---

### Files Most Relevant to Performance Work

Frontend transaction performance:

```txt
apps/web/src/features/transactions/transaction-cache.ts
apps/web/src/features/transactions/AddTransactionModal.tsx
apps/web/src/features/transactions/EditTransactionModal.tsx
apps/web/src/features/transactions/QuickTransactionModal.tsx
apps/web/src/features/transactions/TransactionsPage.tsx
apps/web/src/features/transactions/transaction.service.ts
apps/web/src/features/transactions/transaction.types.ts
```

Dashboard performance:

```txt
apps/web/src/features/dashboard/DashboardPage.tsx
apps/web/src/features/summary/summary.service.ts
apps/web/src/features/summary/summary.types.ts
```

Backend transaction performance:

```txt
apps/api/src/modules/transactions/transaction.schema.ts
apps/api/src/modules/transactions/transaction.types.ts
apps/api/src/modules/transactions/transaction.service.ts
apps/api/src/modules/transactions/transaction.controller.ts
apps/api/src/modules/transactions/transaction.route.ts
apps/api/tests/transaction.test.ts
```

Backend summary performance:

```txt
apps/api/src/modules/summary/summary.service.ts
apps/api/src/modules/summary/summary.types.ts
apps/api/tests/summary.test.ts
```

Request timing:

```txt
apps/api/src/middlewares/request-id.middleware.ts
```

Detailed performance notes:

```txt
docs/PERFORMANCE.md
```

---

### Production Performance Diagnosis Flow

Jika production terasa lambat lagi, jangan langsung refactor frontend.

Ikuti urutan diagnosis ini:

```txt
1. Buka Browser DevTools → Network.
2. Filter Fetch/XHR.
3. Catat durasi endpoint:
   - /api/auth/me
   - /api/profile
   - /api/goals
   - /api/categories
   - /api/transactions
   - /api/transactions/bulk
   - /api/summary
4. Jika endpoint kecil lambat, cek region backend API dan Supabase.
5. Jika hanya /api/summary lambat, cek summary query dan AI financial context.
6. Jika endpoint cepat tetapi UI lambat, cek optimistic cache dan active refetch.
```

Interpretasi penting:

```txt
/api/profile kecil tetapi 3-4 detik:
  kemungkinan besar region/cold start/database latency

/api/summary saja lambat:
  kemungkinan summary query atau derived insight berat

UI transaksi lambat padahal API cepat:
  kemungkinan optimistic cache tidak jalan atau tertimpa active refetch
```

---

### Deployment Region Rule

Current known database region:

```txt
Supabase database: Oceania / Sydney
```

Backend Vercel Function harus berada di region yang sama atau paling dekat dengan region database.

Jika region mismatch, gejala yang mungkin muncul:

```txt
/api/auth/me lambat
/api/profile lambat
/api/transactions lambat
/api/summary sangat lambat
production terasa lambat walaupun local cepat
```

Setelah region backend disesuaikan dengan database region, production Sakuin terasa jauh lebih cepat.

---

### Future Performance Candidate

Karena production sudah terasa cepat setelah region diperbaiki, split summary endpoint belum wajib dilakukan sekarang.

Namun jika dashboard first load kembali terasa berat, kandidat optimisasi berikutnya adalah:

```txt
GET /api/summary/basic
GET /api/summary/insights
```

`/api/summary/basic` berisi data ringan:

```txt
totalIncome
totalExpense
balance
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
safeBalanceLimit
isBelowSafeLimit
```

`/api/summary/insights` berisi data berat:

```txt
safeToSpend
financialCheckup
monthlyTrend
incomeByCategory
expenseByCategory
```

Target behavior:

```txt
Dashboard render data utama cepat.
Insight berat menyusul per-card.
Tidak ada full-page loading hanya karena insight berat belum selesai.
```

---

### Final Regression Checklist

Setelah performance-related changes, cek:

```txt
[ ] Homepage terbuka normal
[ ] Login email/password normal
[ ] Login Google normal
[ ] Dashboard first load terasa cepat
[ ] Dashboard tidak full reload berat saat balik dari halaman lain
[ ] Tambah transaksi manual dari dashboard terasa instan
[ ] Tambah transaksi manual dari /transactions terasa instan
[ ] Edit transaksi terasa instan
[ ] Delete transaksi terasa instan
[ ] Quick Transaction 3-5 item terasa cepat
[ ] Urutan transaksi tanggal sama: input terbaru tampil lebih atas
[ ] Safe-to-Spend tetap tampil
[ ] Financial Checkup tetap tampil
[ ] AI Assistant tetap bisa menjawab
[ ] Export tetap normal
[ ] Profile tetap normal
[ ] Goals tetap normal
```

---

### Current Recommendation

Untuk kondisi saat ini:

```txt
[✓] Jangan lakukan refactor besar lagi jika production sudah terasa cepat.
[✓] Jangan split summary endpoint dulu kecuali first load dashboard kembali terasa berat.
[✓] Pertahankan optimistic CRUD + bulk transaction endpoint.
[✓] Pertahankan backend region dekat Supabase.
[✓] Jadikan docs/PERFORMANCE.md sebagai referensi utama sebelum optimisasi lanjutan.
```