# Sakuin Security Documentation

Dokumen ini menjelaskan security baseline, prinsip keamanan, batasan, risiko, audit trail, dan roadmap security untuk project **Sakuin**.

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
[✓] Safe request logging
[✓] Safe security event logging
[✓] Database-backed audit trail
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
Security tidak boleh membuat log/audit menjadi sumber kebocoran data baru.
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
[✓] Request body size limit
[✓] Rate limiting
[✓] Security headers
[✓] CORS policy
[✓] Production error handling
[✓] Request ID
[✓] Safe request logging
[✓] Safe security event logging
[✓] Database-backed audit trail
[✓] Audit metadata safety policy
[✓] Sensitive integration policy
[✓] Google Login vs Gmail API distinction
[✓] Gmail integration rules
[✓] OAuth token storage requirements
[✓] Raw email storage prohibition
[✓] Draft-first transaction detection
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
[ ] Implementasi httpOnly secure cookie migration
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
[✓] Request ID aktif
[✓] Safe logging aktif
[✓] AuditLog table aktif
[✓] Database-backed audit trail aktif
[✓] Production audit smoke test aman
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
[✓] Summary/export data isolation tests
[✓] Auth/token edge case tests
[✓] Rate limit/API abuse edge case tests
[✓] Audit event tests
[✓] Audit log sink tests
```

Security yang belum selesai dan masih perlu direncanakan:

```txt
[ ] Distributed rate limiting
[ ] Better JWT/session strategy
[ ] Refresh token strategy
[ ] httpOnly secure cookie migration
[ ] CSRF strategy jika migrasi ke cookie
[ ] OAuth token encryption
[ ] Gmail disconnect/revoke mechanism
[ ] Privacy policy untuk integrasi sensitif
[ ] Data retention policy lanjutan
[ ] Audit log viewer/admin policy
[ ] Formal security review
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
[ ] Sensitive data leakage through audit metadata
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
5. Mencegah log/audit menyimpan data sensitif.
6. Menunda integrasi email/Gmail sampai security dan privacy design matang.
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
[✓] Token tanpa userId valid ditolak
[✓] Token dengan userId bukan string ditolak
[✓] Token milik user yang sudah dihapus tidak bisa mengambil profile
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
[ ] Evaluasi logout server-side jika session/cookie diterapkan
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
[✓] Register menolak password lemah berdasarkan validasi backend
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
[ ] Password policy yang lebih jelas di UI
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
[ ] Future financial insight/advisor
[ ] Future Gmail/e-wallet extraction
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
Setiap fitur insight/AI harus diuji agar tidak mencampur data antar user.
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
X-Request-Id
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
[✓] X-Request-Id boleh dikirim client untuk request tracing
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
Request terlalu besar
Rate limit exceeded
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
Jika mengubah rate limit, update test terkait.
Jangan log email mentah pada rate limit hit.
```

---

## 16. Request ID

Backend sudah menambahkan request ID pada response.

Header:

```txt
X-Request-Id
```

Behavior:

```txt
[✓] Jika client mengirim X-Request-Id yang aman, backend dapat memakai request ID tersebut
[✓] Jika client tidak mengirim X-Request-Id, backend membuat request ID baru
[✓] Jika client mengirim request ID yang tidak aman, backend mengganti dengan request ID baru
[✓] Response membawa X-Request-Id
```

Tujuan:

```txt
[✓] Memudahkan debugging request production
[✓] Menghubungkan request log dengan audit event
[✓] Menghubungkan security event dengan request tertentu
[✓] Membantu troubleshooting tanpa menyimpan token/body sensitif
```

Aturan:

```txt
Request ID tidak boleh berisi data sensitif.
Request ID tidak boleh digunakan sebagai auth/session identifier.
Request ID hanya untuk tracing/debugging.
```

---

## 17. Safe Request Logging

Backend memiliki safe request logging.

Data yang boleh dicatat:

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

Data yang tidak boleh dicatat:

```txt
password
token
Authorization header
cookie
raw request body
transaction amount
transaction note
goal name
goal targetAmount
goal currentAmount
category name
category icon value
category color value
export content
raw email
OAuth token
```

Tujuan:

```txt
[✓] Memudahkan observability dasar
[✓] Mendeteksi request error
[✓] Menganalisis endpoint lambat secara kasar
[✓] Tidak membocorkan data sensitif
```

Aturan:

```txt
Jika ingin menambahkan field baru ke request log, pastikan field tersebut bukan PII/sensitive financial data.
Jangan log query mentah jika query dapat berisi identifier sensitif.
```

---

## 18. Safe Security Event Logging

Sakuin memiliki safe security event logger.

Security event yang sudah didukung:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Prinsip logging:

```txt
[✓] Failed login tidak menyimpan password
[✓] Failed login tidak menyimpan email mentah
[✓] Failed login boleh menyimpan hash identifier
[✓] Auth failure tidak menyimpan token
[✓] Rate limit hit tidak menyimpan body/token
[✓] Metadata sensitif otomatis diredact
```

Security event saat ini diperlakukan sebagai application log, bukan semua dimasukkan ke database audit trail.

Alasan:

```txt
Failed login dan rate limit hit bisa high-volume.
Jika semua high-volume event masuk database, AuditLog bisa cepat membesar.
Security event logging dan business audit trail dipisahkan dulu agar lebih aman dan mudah dikontrol.
```

Data yang tidak boleh masuk security event:

```txt
password
JWT token
Authorization header
raw request body
raw email
OAuth access token
OAuth refresh token
OTP
PIN
cookie/session
```

---

## 19. Safe Metadata Sanitization

Sakuin memiliki reusable safe metadata sanitizer.

Utility terkait:

```txt
utils/safe-metadata
```

Tujuan:

```txt
[✓] Menyamakan redaction logic untuk security event dan audit event
[✓] Mencegah duplikasi sanitizer
[✓] Mengurangi risiko developer lupa melakukan redaction
```

Key sensitif harus otomatis diredact, termasuk pola seperti:

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
Gunakan sanitizer shared untuk security event dan audit event.
Jika ada jenis data sensitif baru, update sanitizer dan test.
```

---

## 20. Audit Trail

Sakuin sudah memiliki database-backed audit trail menggunakan Prisma model `AuditLog`.

Audit trail digunakan untuk mencatat event bisnis penting, bukan untuk menyimpan data transaksi mentah.

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

Relationship:

```txt
AuditLog.actorUserId -> User.id
onDelete: SetNull
```

Alasan `onDelete: SetNull`:

```txt
Jika user dihapus, audit history tidak langsung hilang.
actorUserId dapat menjadi null, tetapi event historis tetap ada.
AuditLog tidak menyimpan email/nama user sehingga data pribadi tetap minimal.
```

Audit persistence bersifat **fail-open**:

```txt
Jika penyimpanan audit log gagal, request utama user tetap tidak langsung gagal.
Failure hanya dicatat sebagai safe error log tanpa metadata sensitif.
```

Alasan fail-open:

```txt
Audit log penting untuk security trail, tetapi kegagalan audit persistence tidak boleh langsung merusak fitur utama user seperti update profile, transaksi, goals, category, atau export.
```

---

## 21. Audit Event yang Sudah Dicatat

Business audit events yang sudah dicatat ke AuditLog:

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
Event auth/rate-limit bisa high-volume.
Untuk saat ini event tersebut cukup dicatat sebagai safe security event log.
Jika nanti perlu persistence, desain storage/retention harus dibuat terpisah.
```

---

## 22. Audit Metadata Policy

Audit metadata harus aman dan minimal.

Prinsip:

```txt
[✓] Metadata hanya mencatat konteks non-sensitif
[✓] Metadata harus melewati sanitizer
[✓] Metadata tidak boleh menyimpan value finansial mentah
[✓] Metadata tidak boleh menyimpan raw body
[✓] Metadata tidak boleh menyimpan token atau credential
[✓] Metadata tidak boleh menjadi sumber kebocoran baru
```

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
raw body
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

Contoh metadata tidak aman:

```json
{
  "amount": "250000",
  "note": "Makan di tempat X",
  "token": "jwt-token-value",
  "rawBody": "{...}"
}
```

---

## 23. Audit Event by Feature

### Profile

Event:

```txt
profile.updated
```

Metadata aman:

```txt
changedFields
```

Tidak boleh disimpan:

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

Metadata aman:

```txt
format
typeFilter
hasCategoryFilter
hasDateRange
```

Tidak boleh disimpan:

```txt
isi export
transaction note
transaction amount
category name
file content
raw query lengkap jika mengandung data sensitif
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

Metadata aman:

```txt
type
hasNote
dateProvided
changedFields
reason
```

Tidak boleh disimpan:

```txt
amount
note
categoryId
category name
raw body
token
```

Catatan:

```txt
targetId boleh berisi transaction id.
targetId tidak boleh diganti dengan data finansial.
```

---

### Goals

Event:

```txt
goal.created
goal.updated
goal.deleted
```

Metadata aman:

```txt
hasCurrentAmount
hasDeadline
changedFields
reason
```

Tidak boleh disimpan:

```txt
goal name
targetAmount
currentAmount
remainingAmount
deadline value jika tidak perlu
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

Metadata aman:

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

Tidak boleh disimpan:

```txt
category name
icon value
color value
raw body
token
```

---

## 24. AuditLog Access Policy

Saat ini belum ada endpoint untuk membaca AuditLog dari frontend.

Keputusan saat ini:

```txt
[✓] AuditLog tersimpan di database
[✓] AuditLog dapat dicek melalui database/admin tool saat debugging
[✓] Belum ada user-facing audit log page
[✓] Belum ada admin panel audit log
[✓] Belum ada public API untuk audit log
```

Alasan:

```txt
AuditLog berisi security trail.
Sebelum dibuat API/UI, harus ada authorization policy yang jelas.
Jika dibuka terlalu cepat, audit log bisa menjadi sumber data sensitif baru.
```

Jika nanti dibuat endpoint audit log:

```txt
[ ] Harus protected
[ ] Harus dibatasi userId/role
[ ] Harus pagination
[ ] Harus filter aman
[ ] Tidak boleh expose metadata sensitif
[ ] Harus punya tests
[ ] Harus punya rate limit
```

---

## 25. AuditLog Retention Policy

Retention policy saat ini:

```txt
Belum ada auto-delete.
AuditLog disimpan untuk kebutuhan security trail awal.
```

Alasan:

```txt
Event yang disimpan saat ini adalah business mutation utama dengan volume relatif rendah.
Security event high-volume belum dimasukkan ke AuditLog.
```

Rencana peningkatan:

```txt
[ ] Definisikan retention 90/180/365 hari sesuai jenis event
[ ] Definisikan cleanup job jika volume meningkat
[ ] Definisikan export/delete policy jika ada privacy requirement
[ ] Definisikan policy jika user meminta penghapusan akun/data
```

Catatan:

```txt
Jangan membuat cleanup otomatis sebelum retention policy jelas.
Jangan menghapus audit history tanpa keputusan produk/security yang eksplisit.
```

---

## 26. Export Security

Export adalah area sensitif karena menghasilkan data transaksi user.

Format export:

```txt
JSON
CSV
XLSX
```

Rules:

```txt
[✓] Export hanya memuat data user login
[✓] Export filter tetap dibatasi userId dari token
[✓] Export tidak boleh memuat data user lain
[✓] Export date range harus valid
[✓] Export event dicatat sebagai audit event
```

Tests yang sudah tersedia:

```txt
[✓] Export JSON hanya memuat transaksi user login
[✓] Export JSON dengan categoryId user lain menghasilkan data kosong dan tidak bocor
[✓] Export CSV tidak memuat data user lain
[✓] Export XLSX tidak memuat data user lain
[✓] Export filter type tetap hanya menghitung transaksi user login
```

Audit policy export:

```txt
AuditLog hanya mencatat metadata export seperti format/filter boolean.
AuditLog tidak menyimpan isi export.
AuditLog tidak menyimpan nominal atau note transaksi.
```

---

## 27. Service Worker and PWA Security

Sakuin memiliki basic PWA installable support.

Security rule utama:

```txt
Service worker tidak boleh cache API private user.
```

Tidak boleh cache:

```txt
auth response
profile
transactions
summary
goals
categories user-specific
export
AuditLog
endpoint private lain
```

Boleh cache:

```txt
static assets
icons
manifest
offline page
frontend shell non-sensitive
```

Alasan:

```txt
API private user berisi data finansial.
Caching data private di service worker dapat menyebabkan stale data, data leakage, atau data tersisa setelah logout.
```

Jika mengubah service worker:

```txt
[ ] Test installed PWA
[ ] Test login/logout
[ ] Test refresh app setelah deploy
[ ] Pastikan API private tidak masuk cache
[ ] Pastikan offline fallback tidak menampilkan data private stale
```

---

## 28. Sensitive Integration Policy

Fitur integrasi sensitif belum boleh dibuat tanpa desain security dan privacy.

Integrasi sensitif termasuk:

```txt
Google Login
Gmail transaction detection
E-wallet transaction detection
Mobile banking transaction detection
Financial assistant/advisor berbasis data pribadi
```

Prinsip:

```txt
[✓] Consent harus eksplisit
[✓] Scope harus minimal
[✓] Data yang diproses harus minimum necessary
[✓] Raw data sensitif tidak boleh disimpan jika tidak perlu
[✓] Token harus aman
[✓] User harus bisa disconnect/revoke
[✓] Hasil otomatisasi harus draft-first
[✓] Audit event harus mencatat connect/disconnect/sync tanpa token/raw data
```

Aturan:

```txt
Jangan langsung membuat Gmail API integration hanya karena Google Login dibuat.
Jangan meminta Gmail scope untuk login biasa.
Jangan membaca email user tanpa consent eksplisit.
Jangan menyimpan raw email.
Jangan menyimpan OAuth token tanpa encryption strategy.
Jangan auto-save transaksi hasil deteksi email.
```

---

## 29. Google Login vs Gmail API

Google Login dan Gmail API harus dipisahkan.

Google Login:

```txt
Tujuan: authentication.
Scope minimal: identity/email/profile.
Tidak boleh otomatis meminta Gmail read scope.
```

Gmail API:

```txt
Tujuan: membaca email tertentu untuk mendeteksi transaksi.
Scope sensitif.
Membutuhkan consent eksplisit terpisah.
Membutuhkan privacy disclosure yang jelas.
Membutuhkan token storage strategy.
Membutuhkan disconnect/revoke flow.
```

Rule:

```txt
Login dengan Google tidak sama dengan akses Gmail.
User yang login dengan Google tidak otomatis mengizinkan aplikasi membaca Gmail.
```

Jika Google Login dibuat nanti:

```txt
[ ] Pisahkan flow Sign in with Google dari Connect Gmail
[ ] Tambahkan provider/account linking strategy
[ ] Jangan minta Gmail scope
[ ] Test existing email/password account linking
[ ] Test logout dan protected route
```

---

## 30. Gmail Integration Rules

Fitur Gmail transaction detection belum diimplementasikan.

Sebelum coding Gmail API, harus ada desain:

```txt
[ ] OAuth consent screen
[ ] Scope decision
[ ] Token storage strategy
[ ] Token encryption strategy
[ ] Sync strategy
[ ] Email query/filter strategy
[ ] Draft extraction strategy
[ ] Review UI
[ ] Disconnect/revoke flow
[ ] Data retention policy
[ ] Audit events
[ ] Privacy policy
```

Rules:

```txt
Jangan membaca semua email jika tidak perlu.
Gunakan query/filter sesempit mungkin.
Jangan menyimpan raw email.
Jangan menyimpan isi email lengkap.
Jangan log subject/body/raw sender jika sensitif.
Jangan log access token.
Jangan log refresh token.
Jangan auto-create transaction final.
```

Data hasil deteksi harus menjadi:

```txt
Draft transaksi
```

Bukan langsung:

```txt
Transaksi final
```

User harus bisa:

```txt
[ ] Review draft
[ ] Edit draft
[ ] Hapus draft
[ ] Approve draft
[ ] Disconnect Gmail
[ ] Revoke access
```

Audit event yang nanti dibutuhkan:

```txt
integration.gmail.connected
integration.gmail.disconnected
integration.gmail.sync_started
integration.gmail.sync_completed
integration.gmail.sync_failed
oauth.token_revoked
```

Metadata audit Gmail yang boleh:

```txt
provider
syncStatus
draftCount
reason code non-sensitive
hasNewDrafts
```

Metadata audit Gmail yang tidak boleh:

```txt
access token
refresh token
raw email
email subject
email body
sender email mentah jika tidak perlu
OTP
PIN
bank account detail
e-wallet account detail
```

---

## 31. Draft-First Automation Policy

Setiap fitur otomatisasi transaksi harus mengikuti prinsip draft-first.

Berlaku untuk:

```txt
Quick Transaction
Gmail transaction detection
E-wallet transaction detection
Mobile banking transaction detection
AI financial assistant jika bisa membuat transaksi
```

Rules:

```txt
[✓] Parser/extractor hanya membuat draft
[✓] User harus review
[✓] User harus approve sebelum transaksi final disimpan
[✓] Low confidence harus ditandai
[✓] User harus bisa edit draft
[✓] User harus bisa hapus draft
[✓] Tidak boleh auto-save transaksi final tanpa user approval
```

Alasan:

```txt
Transaksi finansial rawan salah klasifikasi.
Kesalahan nominal/category/type bisa berdampak pada laporan keuangan user.
User harus tetap menjadi final decision maker.
```

---

## 32. Logging Prohibitions

Dilarang mencatat data berikut di application log, security log, audit log, atau test output:

```txt
password plaintext
passwordHash
JWT token
Authorization header
cookie/session value
OAuth access token
OAuth refresh token
raw request body
raw email
email body
OTP
PIN
transaction amount
transaction note
goal name
goal targetAmount
goal currentAmount
category name
category icon value
category color value
export file content
DATABASE_URL
DIRECT_URL
JWT_SECRET
```

Jika butuh debugging:

```txt
Gunakan requestId.
Gunakan eventType.
Gunakan targetType.
Gunakan targetId jika aman.
Gunakan boolean/enum metadata.
Gunakan hash identifier jika benar-benar perlu.
```

---

## 33. Secret Management

Secret tidak boleh dicommit ke repository.

Secret termasuk:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
OAuth client secret
OAuth refresh token
API key
SMTP credential
Supabase service role key
```

Rules:

```txt
Gunakan .env lokal.
Gunakan Vercel environment variables untuk production.
Gunakan GitHub Actions secrets untuk CI.
Jangan menulis secret asli di README, docs, issue, commit message, atau screenshot publik.
```

Jika secret terlanjur bocor:

```txt
[ ] Rotate secret
[ ] Revoke token/key lama
[ ] Update environment variable
[ ] Redeploy
[ ] Cek log akses
```

---

## 34. Database Security Notes

Database menggunakan Supabase PostgreSQL dan Prisma ORM.

Rules:

```txt
[✓] Query user data harus difilter berdasarkan userId dari token
[✓] Prisma migration harus dicommit
[✓] Prisma Client harus di-generate setelah schema berubah
[✓] Jangan mengubah schema tanpa test
[✓] Jangan menyimpan secret di database tanpa encryption strategy
```

AuditLog:

```txt
[✓] AuditLog memiliki actorUserId nullable
[✓] Relasi actor memakai onDelete: SetNull
[✓] Metadata disimpan sebagai JSON
[✓] Metadata harus sudah disanitasi sebelum masuk DB
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Generate Prisma Client
[ ] Update tests
[ ] Jalankan typecheck/test/build
[ ] Cek CI
[ ] Cek deploy
```

Windows note:

```txt
Jika Prisma generate gagal dengan EPERM pada query_engine-windows.dll.node, biasanya ada proses backend/test/Prisma Studio/VSCode yang mengunci file.
Stop proses node/tsx lalu jalankan generate ulang.
```

Command bantu:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process tsx -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm --filter @sakuin/api db:generate
```

---

## 35. Security Test Coverage

Current backend test status terakhir yang tercatat setelah database-backed AuditLog:

```txt
Test Files : 17 passed
Tests      : 114 passed
Build      : passed
```

Coverage utama:

```txt
[✓] Auth API tests
[✓] User profile tests
[✓] Transaction CRUD and ownership tests
[✓] Category CRUD and ownership tests
[✓] Goal CRUD and ownership tests
[✓] Summary tests
[✓] Export tests
[✓] Data isolation tests
[✓] Security baseline tests
[✓] Auth token edge case tests
[✓] Rate limit abuse tests
[✓] Request ID security tests
[✓] Security event logger tests
[✓] Audit event tests
[✓] Audit event recorder tests
[✓] Audit log sink tests
```

---

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

---

### Phase 24B.1 — Cross-Cutting Security Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Security headers
[✓] Request body size limit
[✓] CORS/security behavior dasar
[✓] Safe production error behavior
```

---

### Phase 24B.2 — Summary & Export Data Isolation Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Summary hanya menghitung transaksi user login
[✓] Summary category breakdown tidak bocor
[✓] Export JSON/CSV/XLSX tidak bocor
[✓] Export filter categoryId user lain tidak membocorkan data
```

---

### Phase 24B.3 — Auth & Token Edge Case Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Authorization header kosong ditolak
[✓] Bearer token invalid ditolak
[✓] Token signature salah ditolak
[✓] Token expired ditolak
[✓] Token tanpa userId ditolak
[✓] Token userId bukan string ditolak
[✓] Token milik user yang sudah dihapus ditolak
[✓] Password lemah ditolak
[✓] Email invalid ditolak
```

---

### Phase 24B.4 — Rate Limit & API Abuse Edge Case Tests

Status:

```txt
[✓] Selesai
```

Coverage:

```txt
[✓] Login rate limit
[✓] Register rate limit
[✓] General API rate limit
[✓] Retry-After
[✓] RateLimit-Limit
[✓] RateLimit-Remaining
[✓] RateLimit-Reset
[✓] Reset rate limit store untuk test
```

---

### Phase 24D — Security Logging & Audit Trail

Status:

```txt
[✓] Selesai untuk baseline production awal
```

Coverage:

```txt
[✓] Request ID middleware
[✓] Safe request logging
[✓] Safe security event logging
[✓] Safe metadata sanitizer
[✓] Audit event contract
[✓] Audit event recorder
[✓] Audit event context helper
[✓] Business audit event integration
[✓] Prisma AuditLog model
[✓] Database audit log sink
[✓] Fail-open audit persistence
[✓] Audit sink reliability polish
```

---

## 36. Manual Security Checklist

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
[ ] Response memiliki X-Request-Id
[ ] PWA tidak cache API private user
```

Checklist audit trail:

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

## 37. Security Roadmap

Urutan security roadmap yang disarankan dari kondisi terbaru:

```txt
Phase 24D.5 - Security Documentation Sync
Phase 24E   - Google Login Design, bukan Gmail reading
Phase 24F   - Gmail Transaction Detection Architecture
Phase 24G   - Distributed Rate Limit / Production Hardening
Phase 24H   - Advanced Auth Security / Cookie Migration Research
```

### Phase 24D.5 — Security Documentation Sync

Status:

```txt
[~] Sedang dikerjakan
```

Target:

```txt
[✓] README.md sinkron dengan audit trail terbaru
[~] docs/SECURITY.md sinkron dengan audit trail terbaru
[ ] docs/HANDOFF.md sinkron dengan audit trail terbaru
[ ] docs/API.md sinkron dengan request ID/security notes terbaru
```

---

### Phase 24E — Google Login Design

Target:

```txt
[ ] Desain Google Login untuk authentication
[ ] Jangan gabungkan dengan Gmail reading
[ ] Tentukan account linking strategy
[ ] Tentukan provider field jika perlu migration
[ ] Pertimbangkan existing email/password user
[ ] Tentukan UX login/register
[ ] Tentukan test coverage
```

Important rule:

```txt
Google Login tidak boleh meminta Gmail read scope.
```

---

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
[ ] Audit event policy
```

Important rule:

```txt
Jangan coding Gmail API sebelum desain security/privacy matang.
```

---

### Phase 24G — Distributed Rate Limit / Production Hardening

Target:

```txt
[ ] Redis/Upstash/KV-based rate limit
[ ] Centralized rate limit store
[ ] Better session/token strategy
[ ] Optional email verification
[ ] Optional secure forgot password flow
```

---

### Phase 24H — Advanced Auth Security / Cookie Migration Research

Target:

```txt
[ ] Evaluasi httpOnly secure cookie
[ ] Evaluasi CSRF strategy
[ ] Evaluasi refresh token rotation
[ ] Evaluasi session revocation
[ ] Evaluasi logout server-side
```

---

## 38. Development Rules for Security-Sensitive Changes

Jika mengubah auth:

```txt
[ ] Test register
[ ] Test login
[ ] Test logout
[ ] Test /api/auth/me
[ ] Test protected route
[ ] Test invalid token
[ ] Test expired token
[ ] Test deleted user token
[ ] Evaluasi token/session security
[ ] Evaluasi CSRF jika pindah ke cookie
```

Jika mengubah ownership/data isolation:

```txt
[ ] Test user tidak bisa akses data user lain
[ ] Test aggregation tidak menghitung data user lain
[ ] Test export tidak memuat data user lain
[ ] Test categoryId/goalId/transactionId user lain
```

Jika mengubah rate limit:

```txt
[ ] Update rate limit tests
[ ] Test login rate limit
[ ] Test register rate limit
[ ] Test general API rate limit
[ ] Pastikan 429 headers tetap benar
[ ] Pastikan tidak log email/password/token
```

Jika mengubah audit/logging:

```txt
[ ] Test redaction metadata
[ ] Test fail-open behavior
[ ] Test tidak log password/token/raw body
[ ] Test audit event tidak menyimpan value sensitif
[ ] Test database sink jika AuditLog berubah
[ ] Cek production log tidak noisy
```

Jika mengubah service worker:

```txt
[ ] Jangan cache API private user
[ ] Jangan cache auth response
[ ] Jangan cache transactions/summary/profile/goals/export
[ ] Test install PWA
[ ] Test reload production
[ ] Test behavior update aplikasi
[ ] Test logout/login ulang
```

Jika mengubah Prisma schema:

```txt
[ ] Buat migration
[ ] Generate Prisma Client
[ ] Jalankan backend typecheck
[ ] Jalankan backend tests
[ ] Jalankan backend build
[ ] Commit migration
[ ] Cek CI
[ ] Cek deploy
```

---

## 39. Validation Commands

Backend validation:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Frontend validation:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
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

Jika hanya dokumentasi Markdown yang berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
git diff -- README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
```

---

## 40. Final Notes

Security Sakuin sudah meningkat signifikan dibanding baseline awal, terutama dengan adanya:

```txt
[✓] Security headers
[✓] Request body size limit
[✓] Rate limiting
[✓] Data isolation tests
[✓] Auth/token edge case tests
[✓] Request ID
[✓] Safe request logging
[✓] Safe security event logging
[✓] Database-backed AuditLog
[✓] Fail-open audit persistence
```

Namun security tetap harus diperlakukan sebagai proses berkelanjutan.

Aturan terakhir:

```txt
Jangan mengklaim aplikasi 100% aman.
Jangan menambahkan fitur sensitif tanpa security design.
Jangan menyimpan data sensitif di log atau audit metadata.
Jangan membaca Gmail/e-wallet/mobile banking data tanpa consent eksplisit.
Jangan auto-save transaksi dari hasil parser/email detection tanpa user review.
```