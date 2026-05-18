# Sakuin Security Documentation

Dokumen ini menjelaskan security baseline, prinsip keamanan, batasan, risiko, dan roadmap security untuk project **Sakuin**.

Sakuin adalah webapp pengelola keuangan pribadi. Karena aplikasi ini menyimpan data sensitif seperti transaksi, saldo, kategori, target tabungan, dan export laporan keuangan, security harus dikembangkan secara bertahap, hati-hati, dan terdokumentasi.

Dokumen ini juga menjadi dasar sebelum Sakuin masuk ke fitur yang lebih sensitif seperti:

```txt
[ ] Google Login
[ ] Gmail transaction detection
[ ] E-wallet transaction detection
[ ] Mobile banking transaction detection
[ ] Financial assistant/advisor berbasis data pribadi
```

---

## 1. Security Philosophy

Security Sakuin tidak boleh dipahami sebagai kondisi absolut.

Project ini **tidak boleh diklaim 100% aman**. Target realistis security Sakuin adalah mengurangi risiko melalui kombinasi:

```txt
[✓] Authentication
[✓] Authorization
[✓] Data isolation
[✓] Input validation
[✓] Rate limiting
[✓] Request hardening
[✓] Security headers
[✓] Safer error handling
[✓] Automated security tests
[✓] Clear privacy rules
[✓] Draft-first review flow untuk fitur otomatisasi
```

Prinsip utama:

```txt
Security harus mencegah kesalahan umum.
Security harus mengurangi dampak jika terjadi bug.
Security harus menjaga data user tetap terisolasi.
Security harus menghindari akses data sensitif yang tidak perlu.
Security harus mengutamakan consent dan kontrol user.
Security harus berkembang bertahap, bukan sekaligus tanpa validasi.
```

---

## 2. Security Scope

Dokumen ini mencakup:

```txt
[✓] Current security baseline
[✓] Authentication architecture
[✓] Authorization and ownership rules
[✓] Data isolation principles
[✓] Request validation
[✓] Rate limiting
[✓] Security headers
[✓] CORS policy
[✓] Production error handling
[✓] Sensitive integration policy
[✓] Gmail integration rules
[✓] OAuth token storage requirements
[✓] Raw email storage prohibition
[✓] Draft-first transaction detection
[✓] Audit logging requirements
[✓] Future security roadmap
```

Dokumen ini tidak mencakup:

```txt
[ ] Penetration testing formal
[ ] Compliance certification
[ ] Security audit pihak ketiga
[ ] Implementasi Google OAuth
[ ] Implementasi Gmail API
[ ] Implementasi token encryption
[ ] Implementasi distributed rate limit
```

Hal-hal tersebut dapat menjadi fase lanjutan.

---

## 3. Current Production Context

Sakuin saat ini berjalan di production.

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
Database : Supabase PostgreSQL
CI/CD    : GitHub Actions + Vercel Deploy
```

Health check backend:

```txt
GET /health
GET /api/health
```

Status umum:

```txt
[✓] Frontend production aktif
[✓] Backend production aktif
[✓] Database Supabase aktif
[✓] GitHub Actions CI aktif
[✓] Vercel deployment aktif
[✓] Security hardening baseline aktif
[✓] Security tests tambahan aktif
```

---

## 4. Current Security Baseline

Security baseline yang sudah diterapkan:

```txt
[✓] Prisma ORM untuk mengurangi risiko SQL injection
[✓] Zod validation untuk request body/query/params
[✓] JWT Bearer Token authentication
[✓] bcryptjs untuk password hashing
[✓] Protected endpoint
[✓] User ownership checks
[✓] CORS production allowlist
[✓] Secret tidak disimpan di repository
[✓] Security headers middleware
[✓] Request body size limit
[✓] Production error masking untuk error internal
[✓] Login rate limiting
[✓] Register rate limiting
[✓] General API rate limiting
[✓] Security baseline tests
[✓] Cross-cutting security tests
[✓] Summary/export data isolation tests
[✓] Auth/token edge case tests
[✓] Rate limit/API abuse edge case tests
```

Security yang belum selesai dan masih perlu direncanakan:

```txt
[ ] Security logging and audit trail
[ ] Request ID
[ ] Failed login logging
[ ] Rate limit hit logging
[ ] Distributed rate limiting
[ ] Better JWT/session strategy
[ ] Refresh token strategy
[ ] httpOnly secure cookie migration
[ ] CSRF strategy jika migrasi ke cookie
[ ] OAuth token encryption
[ ] Gmail disconnect/revoke mechanism
[ ] Privacy policy untuk integrasi sensitif
[ ] Data retention policy untuk hasil ekstraksi transaksi
```

---

## 5. Threat Model

Sakuin harus mempertimbangkan risiko berikut:

```txt
[ ] Brute force login
[ ] Credential stuffing
[ ] Token theft
[ ] Token tampering
[ ] Expired token reuse
[ ] Broken access control
[ ] IDOR / BOLA
[ ] Cross-user data leakage
[ ] CORS misconfiguration
[ ] Oversized payload abuse
[ ] Invalid JSON/body abuse
[ ] Information leakage through error messages
[ ] Data leakage through export
[ ] Sensitive data leakage through logs
[ ] Sensitive data leakage through service worker cache
[ ] Over-permission OAuth scope
[ ] Raw email storage risk
[ ] Auto-created incorrect transaction from email/parser
```

Prioritas utama saat ini:

```txt
1. Menjaga data user tetap terisolasi.
2. Mencegah request abuse dasar.
3. Mencegah error internal membocorkan detail.
4. Mencegah akses endpoint private tanpa token valid.
5. Menunda integrasi email/Gmail sampai security dan privacy design matang.
```

---

## 6. Authentication Architecture

Sakuin saat ini menggunakan JWT Bearer Token.

Endpoint public:

```txt
GET  /health
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Endpoint protected wajib mengirim:

```txt
Authorization: Bearer <token>
```

Backend mengambil identitas user dari token.

Frontend tidak boleh mengirim `userId` untuk endpoint protected.

Current behavior:

```txt
[✓] User register mendapat token
[✓] User login mendapat token
[✓] Token digunakan untuk request protected
[✓] Backend memverifikasi token
[✓] Backend mengambil userId dari payload token
[✓] Endpoint private gagal jika token tidak ada/invalid/expired
```

Catatan penting:

```txt
Token saat ini masih disimpan di localStorage.
Ini cukup untuk MVP/production awal, tetapi memiliki risiko jika terjadi XSS.
```

Risiko localStorage token:

```txt
Jika halaman terkena XSS, script berbahaya dapat membaca token dari localStorage.
```

Rencana peningkatan:

```txt
[ ] Evaluasi migrasi ke httpOnly secure sameSite cookie
[ ] Evaluasi CSRF protection jika memakai cookie
[ ] Evaluasi refresh token rotation
[ ] Evaluasi session invalidation
```

Migrasi auth tidak boleh dilakukan secara terburu-buru karena akan berdampak ke:

```txt
[ ] Backend login/register response
[ ] Cookie setting
[ ] Frontend API client
[ ] CORS credentials
[ ] Logout flow
[ ] CSRF strategy
[ ] Tests
[ ] Production deployment
```

---

## 7. Password Handling

Password tidak pernah disimpan dalam bentuk plaintext.

Current behavior:

```txt
[✓] Password di-hash menggunakan bcryptjs
[✓] passwordHash tidak pernah dikirim ke frontend
[✓] Login error dibuat generic
```

Login error generic:

```txt
Email atau password salah
```

Tujuan generic error:

```txt
Mengurangi risiko user enumeration melalui pesan error login.
```

Rencana peningkatan:

```txt
[ ] Password policy yang lebih jelas
[ ] Optional email verification
[ ] Secure forgot password flow
[ ] Password reset token dengan expiry
[ ] Password reset token hashing
```

---

## 8. Authorization and Ownership Rules

Backend harus selalu menentukan user dari JWT token.

Frontend tidak boleh menentukan ownership data.

Rules:

```txt
[✓] User hanya bisa melihat profile miliknya sendiri
[✓] User hanya bisa melihat custom category miliknya sendiri
[✓] User hanya bisa membuat/update/delete custom category miliknya sendiri
[✓] User tidak bisa edit/delete default category
[✓] User tidak bisa memakai custom category milik user lain
[✓] User hanya bisa melihat transaksi miliknya sendiri
[✓] User hanya bisa update transaksi miliknya sendiri
[✓] User hanya bisa delete transaksi miliknya sendiri
[✓] User hanya bisa melihat summary miliknya sendiri
[✓] User hanya bisa melihat goal miliknya sendiri
[✓] User hanya bisa update/delete goal miliknya sendiri
[✓] User hanya bisa export transaksi miliknya sendiri
```

Prinsip error untuk unauthorized ownership:

```txt
Jika data bukan milik user login, response sebaiknya sama seperti data tidak ditemukan.
```

Contoh:

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

Tujuan:

```txt
Mengurangi risiko attacker mengetahui apakah resource ID tertentu benar-benar ada.
```

---

## 9. Data Isolation

Data isolation adalah prinsip utama Sakuin.

Data user tidak boleh bercampur dalam:

```txt
[✓] Transactions
[✓] Categories
[✓] Goals
[✓] Summary
[✓] Export
[✓] Profile
```

Area rawan data leakage:

```txt
[ ] Summary aggregation
[ ] Recent transactions
[ ] Category breakdown
[ ] Export JSON
[ ] Export CSV
[ ] Export XLSX
[ ] Filter berdasarkan categoryId
[ ] Dashboard data
```

Tests yang sudah tersedia:

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

Aturan pengembangan:

```txt
Setiap endpoint baru yang membaca data user harus memiliki ownership filter berdasarkan userId dari token.
Setiap endpoint agregasi harus diuji agar tidak menghitung data user lain.
Setiap endpoint export harus diuji agar tidak memuat data user lain.
```

---

## 10. Request Validation

Sakuin menggunakan Zod untuk validasi request.

Validasi dilakukan pada:

```txt
[✓] Request body
[✓] Query params
[✓] Route params
```

Tujuan:

```txt
[✓] Mencegah input invalid masuk ke service layer
[✓] Membuat error lebih konsisten
[✓] Mengurangi risiko malformed request
[✓] Mengurangi risiko bug karena tipe data tidak sesuai
```

Format validation error:

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

Aturan pengembangan:

```txt
Endpoint baru wajib punya schema validation jika menerima body/query/params.
Validasi penting tidak boleh hanya di frontend.
Frontend validation membantu UX.
Backend validation wajib untuk security dan data integrity.
```

---

## 11. Request Body Size Limit

Backend membatasi ukuran request body.

Limit saat ini:

```txt
1 MB
```

Jika request terlalu besar:

```json
{
  "success": false,
  "message": "Ukuran request terlalu besar. Maksimal 1 MB.",
  "errors": null
}
```

Alasan:

```txt
Payload Sakuin saat ini kecil.
Auth, profile, categories, transactions, goals, dan export request tidak membutuhkan body besar.
Limit ini membantu mengurangi risiko request payload abuse.
```

Catatan:

```txt
Jika nanti ada fitur import CSV/XLSX, limit ini harus dievaluasi ulang secara khusus.
```

---

## 12. Security Headers

Backend sudah menerapkan basic security headers.

Headers:

```txt
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
X-Permitted-Cross-Domain-Policies
Strict-Transport-Security pada production
```

Tujuan:

```txt
[✓] Mengurangi risiko MIME sniffing
[✓] Mengurangi risiko clickjacking
[✓] Membatasi referrer leakage
[✓] Membatasi browser permissions yang tidak dibutuhkan
[✓] Memberikan basic CSP untuk response API
[✓] Mengaktifkan HSTS pada production
```

Catatan:

```txt
CSP backend untuk API tidak sama dengan CSP frontend.
Jika ingin membuat CSP frontend yang lebih ketat, lakukan sebagai fase tersendiri.
```

---

## 13. CORS Policy

CORS production harus dibatasi.

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

Rules:

```txt
[✓] CORS tidak boleh memantulkan origin asing sembarangan
[✓] Production frontend harus diizinkan
[✓] Local development harus tetap bisa berjalan
[✓] Authorization header harus diizinkan untuk protected endpoint
```

Aturan pengembangan:

```txt
Jangan mengubah CORS production tanpa regression test.
Jangan menggunakan wildcard origin untuk endpoint yang memakai credential/token.
Jangan memakai preview URL yang terkena Vercel Authentication sebagai production API URL.
```

---

## 14. Production Error Handling

Error internal di production tidak boleh membocorkan detail error mentah.

Behavior:

```txt
Development:
- Error message masih bisa membantu debugging.

Production:
- Error internal 500 tidak membocorkan detail error.
- Response menggunakan pesan umum "Internal server error".
- HttpError yang aman untuk user tetap boleh mengirim pesan spesifik.
```

Contoh production internal error:

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": null
}
```

Contoh error yang boleh user-facing:

```txt
Authorization header wajib diisi
Format token harus Bearer token
Token tidak valid atau sudah kedaluwarsa
Validasi request gagal
Transaksi tidak ditemukan
Kategori tidak ditemukan
Goal tidak ditemukan
Route tidak ditemukan
```

Aturan pengembangan:

```txt
Jangan mengirim stack trace ke frontend production.
Jangan mengirim raw database error ke frontend production.
Jangan mengirim secret/env/token ke response.
```

---

## 15. Rate Limiting

Backend sudah memiliki baseline rate limiting.

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

Tujuan:

```txt
[✓] Mengurangi brute force login
[✓] Mengurangi spam register
[✓] Mengurangi request abuse umum
[✓] Memberikan sinyal retry ke client
```

Tests yang sudah tersedia:

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

Batasan saat ini:

```txt
Rate limit menggunakan in-memory store.
```

Implikasi:

```txt
[✓] Cukup untuk baseline/MVP
[✓] Cukup untuk low traffic
[!] Tidak ideal untuk serverless/multi-instance production
[!] State rate limit bisa berbeda antar instance
```

Rencana peningkatan:

```txt
[ ] Redis-based rate limit
[ ] Upstash Redis rate limit
[ ] Vercel KV rate limit
[ ] Centralized store agar konsisten lintas instance
```

Aturan:

```txt
Jangan menghapus rate limit tanpa mengganti dengan mekanisme yang setara atau lebih baik.
Jika mengubah rate limit, update tests.
```

---

## 16. Security Test Coverage

Security tests yang sudah ada mencakup beberapa area.

### 16.1 Security Baseline Tests

Coverage:

```txt
[✓] Login rate limit
[✓] User tidak bisa baca detail transaksi user lain
[✓] User tidak bisa create transaction memakai custom category user lain
```

### 16.2 Cross-Cutting Security Tests

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

### 16.3 Data Isolation Tests

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

### 16.4 Auth & Token Edge Case Tests

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

### 16.5 Rate Limit & API Abuse Edge Case Tests

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

## 17. Frontend Security Notes

Frontend Sakuin harus menjaga beberapa aturan:

```txt
[✓] Jangan mengirim userId untuk endpoint protected
[✓] Jangan menyimpan secret di frontend
[✓] Jangan menampilkan error internal mentah
[✓] Jangan membuat UI yang auto-save hasil parser tanpa review
[✓] Jangan cache data private user di service worker
```

Current token storage:

```txt
localStorage
```

Risiko:

```txt
Token dapat dicuri jika terjadi XSS.
```

Mitigasi saat ini:

```txt
[✓] React escaping untuk rendering normal
[✓] Tidak memakai dangerouslySetInnerHTML untuk data user
[✓] API protected tetap membutuhkan token valid
```

Future improvement:

```txt
[ ] httpOnly secure cookie
[ ] CSRF protection jika memakai cookie
[ ] Frontend CSP yang lebih ketat
[ ] Audit penggunaan third-party script
```

---

## 18. PWA and Service Worker Security

Sakuin sudah memiliki PWA installable support.

Aturan penting:

```txt
Service worker tidak boleh cache API private user.
```

Endpoint yang tidak boleh dicache:

```txt
/api/auth/*
/api/users/*
/api/transactions/*
/api/summary
/api/goals/*
/api/categories/*
/api/export/*
```

Alasan:

```txt
Endpoint tersebut memuat data personal atau data keuangan user.
Caching sembarangan dapat menyebabkan data stale, data leakage, atau behavior logout yang tidak aman.
```

Yang boleh dicache secara hati-hati:

```txt
[✓] Static assets
[✓] App shell
[✓] Offline page
[✓] Icons
[✓] Manifest
```

Jika mengubah service worker:

```txt
[ ] Test production reload
[ ] Test installed PWA
[ ] Test logout/login ulang
[ ] Pastikan data private tidak tersimpan di cache
```

---

## 19. Logging Policy

Logging harus membantu debugging dan audit, tetapi tidak boleh membocorkan data sensitif.

Data yang tidak boleh dicatat di logs:

```txt
[!] Password
[!] passwordHash
[!] JWT token
[!] Authorization header penuh
[!] Access token OAuth
[!] Refresh token OAuth
[!] Raw email
[!] Isi email transaksi
[!] Connection string database
[!] JWT_SECRET
[!] DATABASE_URL
[!] DIRECT_URL
[!] Data finansial user secara berlebihan
```

Data yang boleh dicatat secara hati-hati:

```txt
[✓] Request method
[✓] Request path
[✓] Status code
[✓] Timestamp
[✓] Request ID
[✓] User ID internal jika perlu audit
[✓] Event type
[✓] Rate limit hit event
[✓] Failed login event tanpa password
```

Rencana Phase 24D:

```txt
[ ] Request ID
[ ] Auth event logging
[ ] Failed login logging
[ ] Rate limit hit logging
[ ] No sensitive data in logs
[ ] Audit event untuk Gmail connect/disconnect/sync nanti
```

---

## 20. Secrets Management

Secret tidak boleh disimpan di repository.

Secret yang harus dilindungi:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
OAuth client secret
OAuth access token
OAuth refresh token
Encryption key
```

Rules:

```txt
[✓] .env tidak boleh dicommit
[✓] .env.example boleh dicommit tanpa value asli
[✓] Production secret disimpan di Vercel Environment Variables
[✓] CI secret disimpan di GitHub Actions Secrets
```

Jika secret bocor:

```txt
1. Anggap secret sudah compromise.
2. Rotate secret secepatnya.
3. Revoke token/credential terkait.
4. Cek log dan akses yang mencurigakan.
5. Update environment variable.
6. Redeploy.
```

---

## 21. Sensitive Integration Policy

Fitur sensitif belum boleh langsung dibuat tanpa security design.

Contoh fitur sensitif:

```txt
[ ] Gmail transaction detection
[ ] E-wallet email detection
[ ] Mobile banking email detection
[ ] Bank account integration
[ ] Auto financial advisor berbasis data pribadi
```

Prinsip wajib:

```txt
[ ] Jangan pernah meminta password email user
[ ] Jangan pernah meminta password e-wallet/mobile banking user
[ ] Gunakan OAuth resmi jika provider mendukung
[ ] Gunakan scope minimal
[ ] Jangan membaca semua email tanpa alasan kuat
[ ] Jangan menyimpan raw email jika tidak benar-benar diperlukan
[ ] Jangan auto-save hasil parsing sebagai transaksi final
[ ] User harus review/approve hasil deteksi
[ ] User harus bisa disconnect integration
[ ] User harus bisa revoke/delete token
[ ] User harus bisa menghapus data hasil parsing
[ ] Token OAuth harus dienkripsi jika disimpan
[ ] Harus ada privacy policy yang jelas
[ ] Harus ada audit log untuk connect/disconnect/sync
```

---

## 22. Google Login vs Gmail API

Google Login dan Gmail API adalah dua hal berbeda.

### Google Login

Tujuan:

```txt
Authentication.
User bisa masuk menggunakan akun Google.
```

Scope yang ideal:

```txt
openid
email
profile
```

Google Login tidak membutuhkan Gmail scope.

### Gmail API

Tujuan:

```txt
Membaca email tertentu untuk mendeteksi transaksi.
```

Gmail API membutuhkan consent yang lebih sensitif.

Rules:

```txt
[✓] Jangan otomatis meminta Gmail scope saat user hanya ingin login dengan Google
[✓] Gmail access hanya boleh diminta jika user eksplisit mengaktifkan fitur Hubungkan Gmail
[✓] Jelaskan data apa yang akan dibaca
[✓] Jelaskan data apa yang disimpan
[✓] Jelaskan user bisa disconnect kapan saja
```

Urutan yang benar:

```txt
1. Implement Google Login sebagai auth jika dibutuhkan
2. Jangan minta Gmail scope
3. Buat desain Gmail integration terpisah
4. Buat consent dan privacy explanation
5. Minta Gmail scope hanya saat user mengaktifkan fitur Gmail detection
```

---

## 23. Gmail Integration Rules

Gmail integration belum diimplementasikan.

Jika nanti dibuat, rules wajib:

```txt
[ ] User harus mengaktifkan fitur secara eksplisit
[ ] Gunakan OAuth resmi Google
[ ] Gunakan scope minimal
[ ] Jangan meminta password Gmail
[ ] Jangan membaca semua email tanpa filter
[ ] Gunakan query/filter yang spesifik jika memungkinkan
[ ] Jangan menyimpan raw email
[ ] Simpan metadata minimal jika diperlukan
[ ] Simpan hasil ekstraksi transaksi sebagai draft
[ ] User harus review/approve draft
[ ] User bisa edit draft sebelum save
[ ] User bisa menghapus draft
[ ] User bisa disconnect Gmail
[ ] User bisa revoke token
[ ] User bisa menghapus data hasil sinkronisasi
[ ] Audit log connect/disconnect/sync harus tersedia
```

Data yang boleh dipertimbangkan untuk disimpan:

```txt
[ ] Provider name
[ ] Integration status
[ ] Connected timestamp
[ ] Last sync timestamp
[ ] Extracted transaction draft
[ ] Minimal external message reference/hash jika diperlukan untuk deduplication
```

Data yang sebaiknya tidak disimpan:

```txt
[!] Raw email body
[!] Full email thread
[!] Access token plaintext
[!] Refresh token plaintext
[!] OTP
[!] PIN
[!] Password
[!] Informasi sensitif yang tidak relevan dengan transaksi
```

---

## 24. OAuth Token Storage Requirements

Jika OAuth integration dibuat, token tidak boleh disimpan sembarangan.

Rules:

```txt
[ ] Access token tidak boleh dilog
[ ] Refresh token tidak boleh dilog
[ ] Refresh token tidak boleh disimpan plaintext
[ ] Token harus dienkripsi sebelum disimpan
[ ] Encryption key harus disimpan sebagai environment secret
[ ] Harus ada mekanisme revoke
[ ] Harus ada mekanisme disconnect
[ ] Harus ada mekanisme delete token dari database
```

Token lifecycle yang disarankan:

```txt
1. User connect provider
2. Provider mengirim authorization code
3. Backend exchange code menjadi token
4. Backend mengenkripsi refresh token jika perlu disimpan
5. Backend menyimpan status integration
6. User dapat disconnect
7. Disconnect menghapus token lokal
8. Jika memungkinkan, revoke token ke provider
```

---

## 25. Draft-First Transaction Detection

Fitur otomatisasi transaksi harus menggunakan prinsip **draft-first**.

Artinya:

```txt
Sistem boleh mendeteksi kemungkinan transaksi.
Sistem boleh membuat draft transaksi.
Sistem tidak boleh langsung membuat transaksi final tanpa approval user.
```

Wajib untuk:

```txt
[✓] Quick Transaction parser
[ ] Gmail transaction detection
[ ] E-wallet transaction detection
[ ] Mobile banking transaction detection
[ ] AI assistant transaction creation
```

Draft harus bisa:

```txt
[ ] Dilihat user
[ ] Diedit user
[ ] Dihapus user
[ ] Disimpan user secara sadar
```

Field draft minimal:

```txt
type
amount
category
date
note
source
confidence
warning
```

Alasan:

```txt
Parser bisa salah.
Email transaksi bisa ambigu.
Bahasa natural bisa salah dipahami.
User tetap harus memegang kontrol akhir atas data keuangannya.
```

---

## 26. Raw Email Storage Policy

Raw email tidak boleh disimpan secara default.

Policy:

```txt
[✓] Jangan menyimpan raw email body
[✓] Jangan menyimpan full thread
[✓] Jangan menyimpan data yang tidak dibutuhkan
[✓] Jangan menyimpan OTP/PIN/password jika muncul di email
[✓] Jangan menampilkan raw email di log
```

Jika suatu saat raw email dianggap perlu untuk debugging:

```txt
[ ] Harus ada alasan teknis yang kuat
[ ] Harus ada consent eksplisit
[ ] Harus ada retention policy
[ ] Harus ada delete mechanism
[ ] Harus ada masking/redaction
[ ] Harus dipertimbangkan ulang secara security review
```

Rekomendasi default:

```txt
Simpan hasil ekstraksi transaksi saja, bukan isi email.
```

---

## 27. Consent, Disconnect, and Revoke

Integrasi sensitif wajib memiliki consent dan kontrol user.

Consent harus menjelaskan:

```txt
[ ] Data apa yang akan diakses
[ ] Mengapa data itu dibutuhkan
[ ] Bagaimana data diproses
[ ] Data apa yang disimpan
[ ] Berapa lama data disimpan
[ ] Cara disconnect
[ ] Cara menghapus data
```

Disconnect harus:

```txt
[ ] Menghapus token lokal
[ ] Mengubah status integration menjadi disconnected
[ ] Menghentikan sync berikutnya
[ ] Mencatat audit log disconnect
```

Revoke harus:

```txt
[ ] Mencoba revoke token ke provider jika provider mendukung
[ ] Tetap menghapus token lokal meskipun revoke remote gagal
[ ] Memberi feedback yang jelas ke user
```

---

## 28. Audit Log Requirements

Audit log belum diimplementasikan, tetapi wajib dirancang sebelum integrasi sensitif.

Event yang sebaiknya diaudit:

```txt
[ ] User login
[ ] Failed login
[ ] Rate limit hit
[ ] Password/security setting changed
[ ] Gmail connected
[ ] Gmail disconnected
[ ] Gmail sync started
[ ] Gmail sync completed
[ ] Gmail sync failed
[ ] OAuth token revoked
[ ] Export generated
[ ] Large data operation
```

Audit log tidak boleh menyimpan:

```txt
[!] Password
[!] Token
[!] Raw email
[!] Full transaction export
[!] Secret
```

Field audit log yang disarankan:

```txt
id
userId
eventType
metadataSafeJson
ipHash atau ipPartial jika diperlukan
userAgentHash jika diperlukan
createdAt
```

Catatan:

```txt
Audit logging harus dirancang hati-hati agar membantu security tanpa menjadi sumber kebocoran data baru.
```

---

## 29. Financial Advisor / AI Assistant Policy

Jika Sakuin berkembang menjadi financial assistant/advisor, perlu batasan jelas.

Rules:

```txt
[ ] Jangan memberikan klaim finansial absolut
[ ] Jangan memberi instruksi investasi berisiko tinggi tanpa konteks
[ ] Jangan membuat transaksi tanpa approval user
[ ] Jangan menyimpulkan hal sensitif di luar kebutuhan aplikasi
[ ] Jangan memakai data user untuk tujuan lain tanpa consent
[ ] Jelaskan jika insight bersifat estimasi
```

AI assistant harus:

```txt
[ ] Menggunakan data minimal yang diperlukan
[ ] Memberi insight yang bisa diverifikasi user
[ ] Menghindari auto-action tanpa approval
[ ] Menjaga privasi data transaksi
```

---

## 30. Incident Response Basic Plan

Jika ditemukan bug security atau data leakage:

```txt
1. Hentikan perubahan baru yang tidak terkait.
2. Identifikasi scope masalah.
3. Reproduksi bug secara lokal jika aman.
4. Jangan membuka data user yang tidak diperlukan.
5. Buat fix minimal dan terarah.
6. Tambahkan test agar bug tidak terulang.
7. Jalankan validation.
8. Deploy fix.
9. Rotate secret jika ada indikasi secret bocor.
10. Dokumentasikan root cause dan mitigasi.
```

Jika ada token/secret bocor:

```txt
1. Rotate secret.
2. Revoke token jika memungkinkan.
3. Redeploy environment.
4. Cek log untuk indikasi penyalahgunaan.
5. Tambahkan pencegahan agar tidak terulang.
```

---

## 31. Development Guardrails

Aturan saat mengembangkan fitur baru:

```txt
1. Jangan mengubah auth flow tanpa regression test.
2. Jangan mengubah CORS production tanpa test production.
3. Jangan mengubah Prisma schema tanpa migration dan test.
4. Jangan menambah endpoint protected tanpa auth middleware.
5. Jangan membaca data user tanpa filter userId dari token.
6. Jangan menambah export/agregasi tanpa data isolation test.
7. Jangan menambah parser otomatis tanpa draft-first review.
8. Jangan menyimpan raw data sensitif tanpa security review.
9. Jangan log token/password/raw email.
10. Jangan cache API private user di service worker.
11. Jangan menambah Gmail scope ke Google Login.
12. Jangan auto-save hasil Gmail/e-wallet detection.
```

---

## 32. Validation Commands

Jika hanya dokumentasi yang berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
```

Jika ingin full confidence:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Jika security code berubah:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Jika frontend auth/token/service worker berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

---

## 33. Manual Security Checklist

Checklist manual setelah perubahan security besar:

```txt
[ ] Register normal
[ ] Login normal
[ ] Login password salah gagal dengan generic error
[ ] /api/auth/me tanpa token gagal
[ ] /api/auth/me dengan token invalid gagal
[ ] Dashboard user login tampil normal
[ ] Transaksi user lain tidak bisa diakses
[ ] Category user lain tidak bisa dipakai
[ ] Goal user lain tidak bisa diakses
[ ] Summary hanya memuat data user login
[ ] Export hanya memuat data user login
[ ] Request body terlalu besar ditolak
[ ] CORS production tetap berjalan
[ ] Origin asing tidak diterima
[ ] Rate limit login bekerja
[ ] Rate limit register bekerja
[ ] General rate limit bekerja
[ ] Production error tidak membocorkan stack trace
[ ] PWA tidak cache API private user
```

---

## 34. Security Roadmap

Urutan security roadmap yang disarankan:

```txt
Phase 24C - Security Documentation
Phase 24D - Security Logging & Audit Trail Design
Phase 24E - Google Login Design, bukan Gmail reading
Phase 24F - Gmail Transaction Detection Architecture
Phase 24G - Distributed Rate Limit / Production Hardening
Phase 24H - Advanced Auth Security / Cookie Migration Research
```

### Phase 24C — Security Documentation

Status:

```txt
[✓] docs/SECURITY.md dibuat
[ ] README.md sinkron
[ ] docs/API.md sinkron
[ ] docs/HANDOFF.md sinkron
```

Target:

```txt
Mendokumentasikan security baseline dan aturan integrasi sensitif sebelum coding Gmail/e-wallet detection.
```

### Phase 24D — Security Logging & Audit Trail Design

Target:

```txt
[ ] Request ID
[ ] Auth event logging
[ ] Failed login logging
[ ] Rate limit hit logging
[ ] No sensitive data in logs
[ ] Audit event untuk Gmail connect/disconnect/sync
```

### Phase 24E — Google Login Design

Target:

```txt
[ ] Desain Google Login untuk authentication
[ ] Jangan gabungkan dengan Gmail reading
[ ] Tentukan account linking strategy
[ ] Tentukan provider field jika perlu migration
[ ] Pertimbangkan existing email/password user
```

### Phase 24F — Gmail Transaction Detection Architecture

Target:

```txt
[ ] Dokumen arsitektur
[ ] OAuth scope decision
[ ] Token encryption strategy
[ ] Sync strategy
[ ] Draft-first extraction
[ ] Review UI
[ ] Disconnect/revoke flow
[ ] Privacy/data retention policy
```

### Phase 24G — Distributed Rate Limit / Production Hardening

Target:

```txt
[ ] Redis/Upstash/KV-based rate limit
[ ] Better session/token strategy
[ ] Refresh token rotation
[ ] Optional email verification
[ ] Optional secure forgot password flow
```

---

## 35. Final Notes

Sakuin sudah memiliki security baseline yang cukup baik untuk MVP/production awal, tetapi belum cukup untuk langsung masuk ke integrasi email/Gmail/e-wallet.

Sebelum fitur sensitif dibuat, project harus memiliki:

```txt
[ ] Security documentation
[ ] Privacy explanation
[ ] Consent flow
[ ] Token encryption design
[ ] Disconnect/revoke flow
[ ] Audit logging design
[ ] Draft-first transaction review
[ ] Data retention policy
```

Prinsip akhir:

```txt
Lebih baik fitur sensitif dibuat lambat tetapi aman, daripada cepat tetapi berisiko membocorkan data pribadi user.
```