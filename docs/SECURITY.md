# Sakuin Security Documentation

Dokumen ini menjelaskan security baseline, prinsip keamanan, batasan, risiko, audit trail, dan roadmap security untuk project **Sakuin**.

Sakuin adalah web app pengelola keuangan pribadi. Karena aplikasi ini menyimpan data sensitif seperti transaksi, saldo, kategori, target tabungan, profile user, dan export laporan keuangan, security harus dikembangkan secara bertahap, hati-hati, dan terdokumentasi.

Dokumen ini tidak boleh dipahami sebagai klaim bahwa Sakuin sudah 100% aman. Target realistis security Sakuin adalah:

```txt
Mengurangi risiko.
Mencegah kesalahan umum.
Menjaga data user tetap terisolasi.
Mencegah data sensitif bocor melalui response, log, audit metadata, export, atau cache.
Membuat fondasi yang cukup aman sebelum masuk ke fitur yang lebih sensitif.
```

---

## 1. Current Security Status

Status security terbaru:

```txt
[✓] Email/password authentication aktif
[✓] Google Login aktif
[✓] Forgot/reset password aktif
[✓] Password reset email memakai Gmail SMTP / Nodemailer
[✓] Password di-hash menggunakan bcryptjs
[✓] Google-only user dapat membuat password melalui reset password
[✓] JWT Bearer Token authentication aktif
[✓] Protected route frontend aktif
[✓] Protected API endpoint aktif
[✓] User ownership/data isolation aktif
[✓] CORS allowlist aktif
[✓] Security headers aktif
[✓] Request body size limit aktif
[✓] Rate limiting aktif
[✓] Production error masking aktif
[✓] Request ID aktif
[✓] Safe request logging aktif
[✓] Safe security event logging aktif
[✓] Database-backed AuditLog aktif
[✓] Audit persistence fail-open aktif
[✓] Security tests aktif
[✓] Data isolation tests aktif
[✓] Auth/token edge case tests aktif
[✓] Rate limit/API abuse tests aktif
```

Security yang masih menjadi backlog:

```txt
[ ] Distributed rate limiting dengan Redis/Upstash/KV
[ ] Better JWT/session strategy
[ ] Refresh token strategy
[ ] Migrasi auth ke httpOnly secure cookie
[ ] CSRF strategy jika memakai cookie
[ ] Session invalidation/logout server-side
[ ] Email verification untuk akun email/password
[ ] OAuth token encryption jika nanti memakai provider API sensitif
[ ] Gmail disconnect/revoke mechanism jika Gmail API dibuat
[ ] Privacy policy untuk integrasi sensitif
[ ] Data retention policy untuk hasil ekstraksi transaksi
[ ] Audit log viewer/admin policy
[ ] Formal penetration testing
```

---

## 2. Security Philosophy

Security Sakuin harus mengikuti prinsip berikut:

```txt
Security bukan kondisi absolut.
Security harus dikembangkan bertahap dan tervalidasi.
Security tidak boleh membuat log/audit menjadi sumber kebocoran baru.
Security harus mengutamakan data isolation antar user.
Security harus menghindari penyimpanan data sensitif yang tidak perlu.
Security harus mengutamakan consent user untuk fitur otomatisasi.
Security harus menyediakan review user sebelum data otomatis disimpan.
```

Prinsip khusus untuk fitur otomatisasi:

```txt
Fitur otomatisasi tidak boleh langsung membuat transaksi final tanpa review user.
Parser, AI, Gmail/e-wallet detection, atau financial assistant harus menghasilkan draft terlebih dahulu.
User harus dapat melihat, mengubah, dan menyetujui hasil sebelum disimpan.
```

---

## 3. Production Context

Production saat ini:

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
Database : Supabase PostgreSQL
CI/CD    : GitHub Actions + Vercel Deploy
```

Health check:

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
[✓] Auth flow production aktif
[✓] Google Login production aktif
[✓] Password reset production aktif
[✓] Gmail SMTP email sender aktif
[✓] AuditLog table aktif
```

---

## 4. Authentication Architecture

Sakuin saat ini memakai **JWT Bearer Token**.

Endpoint protected wajib mengirim:

```txt
Authorization: Bearer <token>
```

Backend mengambil `userId` dari payload token. Frontend tidak boleh mengirim `userId` secara manual untuk menentukan ownership data.

Current behavior:

```txt
[✓] Register email/password menghasilkan JWT token
[✓] Login email/password menghasilkan JWT token
[✓] Login Google menghasilkan JWT token Sakuin
[✓] Token digunakan untuk request protected
[✓] Backend memverifikasi token
[✓] Backend mengambil userId dari token
[✓] Endpoint private gagal jika token tidak ada
[✓] Endpoint private gagal jika format token bukan Bearer
[✓] Endpoint private gagal jika token invalid
[✓] Endpoint private gagal jika token expired
[✓] Endpoint private gagal jika token tidak memiliki userId valid
```

Catatan risiko:

```txt
Token saat ini masih disimpan di localStorage pada frontend.
Ini cukup untuk MVP/production awal, tetapi memiliki risiko jika terjadi XSS.
Jika halaman terkena XSS, script berbahaya dapat membaca token dari localStorage.
```

Backlog peningkatan:

```txt
[ ] Evaluasi migrasi token ke httpOnly secure sameSite cookie
[ ] Evaluasi CSRF protection jika memakai cookie
[ ] Evaluasi refresh token rotation
[ ] Evaluasi session invalidation
[ ] Evaluasi logout server-side
```

Migrasi ke cookie tidak boleh dilakukan terburu-buru karena berdampak ke:

```txt
Backend login/register response
Cookie setting
Frontend API client
CORS credentials
Logout flow
CSRF strategy
Automated tests
Production deployment
```

---

## 5. Password Handling

Password tidak pernah disimpan dalam bentuk plaintext.

Current behavior:

```txt
[✓] Password di-hash menggunakan bcryptjs
[✓] passwordHash tidak pernah dikirim ke frontend
[✓] Login error dibuat generic
[✓] Register menolak password lemah berdasarkan validasi backend
[✓] Reset password mengganti passwordHash dengan hash baru
```

Password policy saat ini:

```txt
Minimal 8 karakter
Wajib mengandung angka
```

Login error generic:

```txt
Email atau password salah
```

Tujuan generic error:

```txt
Mengurangi risiko user enumeration melalui pesan error login.
```

Catatan:

```txt
User Google-only memiliki passwordHash null sampai user membuat password melalui reset password.
Login email/password untuk user tanpa passwordHash akan gagal dengan pesan generic.
```

Backlog:

```txt
[ ] Password strength meter di frontend
[ ] Password policy yang lebih jelas di UI
[ ] Optional email verification
[ ] Optional password change flow untuk user yang sedang login
```

---

## 6. Google Login Security

Google Login sudah aktif.

Prinsip penting:

```txt
Google Login hanya digunakan untuk autentikasi identitas.
Sakuin tidak meminta Gmail scope.
Sakuin tidak membaca Gmail.
Sakuin tidak menyimpan Google access token.
Sakuin tidak menyimpan Google refresh token.
```

Behavior:

```txt
[✓] Frontend menerima Google ID token dari Google Identity Services
[✓] Frontend mengirim credential ke POST /api/auth/google
[✓] Backend memverifikasi Google ID token menggunakan Google Auth Library
[✓] Backend memastikan email Google sudah verified
[✓] Backend menautkan OAuthAccount ke user
[✓] Backend membuat user baru jika user belum ada
[✓] Backend memakai nullable passwordHash untuk user Google-only
```

Data yang disimpan untuk OAuth:

```txt
provider
providerAccountId
userId
createdAt
updatedAt
```

Data yang tidak boleh disimpan:

```txt
Google access token
Google refresh token
Gmail token
Gmail message content
Gmail raw email body
Google credential mentah
```

Environment terkait:

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Frontend:

```env
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## 7. Forgot/Reset Password Security

Forgot/reset password sudah aktif.

Flow:

```txt
User submit email
Backend selalu mengembalikan response generic
Jika email terdaftar, backend membuat token random
Token asli hanya dikirim melalui email
Database hanya menyimpan hash token
Token memiliki expiry
User membuka link reset password
Backend meng-hash token dari request
Backend mencari user berdasarkan hash token yang masih valid
Backend meng-hash password baru
Backend menghapus reset token setelah berhasil
```

Response forgot password harus tetap generic:

```txt
Jika email terdaftar, link reset password akan dikirim.
```

Alasan:

```txt
Mencegah user enumeration.
Attacker tidak boleh tahu apakah email tertentu terdaftar atau tidak.
```

Data yang tidak boleh muncul di response/log:

```txt
reset token
password baru
email mentah
SMTP_PASS
isi email
hash token
```

Safe diagnostic logs yang boleh muncul:

```txt
password_reset_requested
password_reset_user_not_found
password_reset_email_attempted
password_reset_email_sent
password_reset_email_failed
```

Log reset password hanya boleh memuat:

```txt
identifierHash
userId
status
reason
timestamp
```

Catatan delivery:

```txt
Email reset password saat ini dikirim melalui Gmail SMTP / Nodemailer.
Email dapat masuk ke Inbox, Spam, Promotions, Social, Updates, atau All Mail.
Frontend sudah memberi instruksi kepada user untuk mengecek folder tersebut.
```

---

## 8. Email Sender Security

Email reset password saat ini memakai **Gmail SMTP + Nodemailer**.

Environment backend:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_pengirim@gmail.com"
SMTP_PASS="gmail_app_password_16_karakter_tanpa_spasi"
EMAIL_FROM="Sakuin <email_pengirim@gmail.com>"
```

Aturan:

```txt
SMTP_PASS harus memakai Gmail App Password, bukan password login Gmail biasa.
SMTP_PASS tidak boleh dikirim ke chat.
SMTP_PASS tidak boleh dicatat di log.
SMTP_PASS tidak boleh disimpan di repository.
SMTP_USER sebaiknya sama dengan alamat email di EMAIL_FROM.
Jika App Password bocor, segera revoke dari Google Account.
```

Catatan:

```txt
Resend sebelumnya dicoba tetapi membutuhkan verified domain untuk pengiriman umum.
Runtime reset password sekarang memakai Gmail SMTP/Nodemailer.
Jika masih ada RESEND_API_KEY di Vercel, secret tersebut sebaiknya dihapus saat cleanup karena tidak lagi dipakai.
```

Risiko Gmail SMTP:

```txt
Email bisa masuk Spam.
Gmail memiliki limit pengiriman.
Gmail personal tidak ideal untuk email skala besar.
Deliverability lebih baik jika memakai domain resmi dengan SPF/DKIM/DMARC.
```

Backlog peningkatan:

```txt
[ ] Gunakan domain resmi untuk email production
[ ] Setup SPF/DKIM/DMARC
[ ] Gunakan provider transactional email dengan domain verified
[ ] Tambahkan email verification jika diperlukan
```

---

## 9. Authorization and Ownership Rules

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

## 10. Data Isolation

Data isolation adalah prinsip utama Sakuin.

Data user tidak boleh bercampur dalam:

```txt
Transactions
Categories
Goals
Summary
Export
Profile
Dashboard
Future insight/advisor
```

Area rawan data leakage:

```txt
Summary aggregation
Recent transactions
Category breakdown
Export JSON
Export CSV
Export XLSX
Filter berdasarkan categoryId
Dashboard data
Future financial insight/advisor
Future Gmail/e-wallet extraction
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

## 11. Request Validation

Sakuin menggunakan Zod untuk validasi request.

Validasi dilakukan pada:

```txt
Request body
Query params
Route params
```

Tujuan:

```txt
Mencegah input invalid masuk ke service layer.
Membuat error lebih konsisten.
Mengurangi risiko malformed request.
Mengurangi risiko bug karena tipe data tidak sesuai.
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

## 12. Request Body Size Limit

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

## 13. Security Headers

Backend menerapkan basic security headers.

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
Mengurangi risiko MIME sniffing.
Mengurangi risiko clickjacking.
Membatasi referrer leakage.
Membatasi browser permissions yang tidak dibutuhkan.
Memberikan basic CSP untuk response API.
Mengaktifkan HSTS pada production.
```

Catatan:

```txt
CSP backend untuk API tidak sama dengan CSP frontend.
Jika ingin membuat CSP frontend yang lebih ketat, lakukan sebagai fase tersendiri.
```

---

## 14. CORS Policy

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
CORS tidak boleh memantulkan origin asing sembarangan.
Production frontend harus diizinkan.
Local development harus tetap bisa berjalan.
Authorization header harus diizinkan untuk protected endpoint.
X-Request-Id boleh dikirim client untuk request tracing.
```

Aturan pengembangan:

```txt
Jangan mengubah CORS production tanpa regression test.
Jangan menggunakan wildcard origin untuk endpoint yang memakai credential/token.
Jangan memakai preview URL yang terkena Vercel Authentication sebagai production API URL.
```

---

## 15. Production Error Handling

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
Token reset password tidak valid atau sudah kedaluwarsa
Google email belum terverifikasi
```

Aturan pengembangan:

```txt
Jangan mengirim stack trace ke frontend production.
Jangan mengirim raw database error ke frontend production.
Jangan mengirim secret/env/token ke response.
```

---

## 16. Rate Limiting

Backend memiliki baseline rate limiting.

Rate limit yang tersedia:

```txt
Login rate limit
Register rate limit
General API rate limit
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
Mengurangi brute force login.
Mengurangi spam register.
Mengurangi request abuse umum.
Memberikan sinyal retry ke client.
```

Batasan saat ini:

```txt
Rate limit menggunakan in-memory store.
Cukup untuk baseline/MVP dan low traffic.
Tidak ideal untuk serverless/multi-instance production karena state bisa berbeda antar instance.
```

Backlog:

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

## 17. Request ID

Backend menambahkan request ID pada response.

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
Mempermudah debugging production.
Menghubungkan request log, security event, dan audit event.
Membantu tracing tanpa menyimpan token/body sensitif.
```

Request ID tidak boleh dianggap sebagai:

```txt
Token
Session ID
Secret
User identifier
```

Request ID tidak boleh berisi:

```txt
password
token
email
Authorization header
cookie
raw body
```

---

## 18. Safe Logging

Backend memiliki safe request logging.

Safe request log boleh mencatat:

```txt
requestId
method
path
status
durationMs
timestamp
```

Safe request log tidak boleh mencatat:

```txt
Authorization header
JWT token
password
raw request body
cookie
email mentah
transaction amount
transaction note
goal name
goal amount
category name
export content
Google credential
SMTP_PASS
reset token
```

Safe security event yang didukung:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Password reset diagnostic logs yang aman:

```txt
password_reset_requested
password_reset_user_not_found
password_reset_email_attempted
password_reset_email_sent
password_reset_email_failed
```

Aturan:

```txt
Jika butuh identifikasi email dalam log, gunakan hash identifier.
Jangan log email mentah.
Jangan log reset token.
Jangan log body request.
```

---

## 19. Audit Trail

Backend memiliki database-backed audit trail menggunakan Prisma model `AuditLog`.

Audit trail berjalan internal dan belum memiliki endpoint publik.

Business audit events yang sudah dicatat:

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
goal targetAmount
goal currentAmount
category name
category icon value
category color value
export content
```

---

## 20. PWA and Cache Security

Sakuin memiliki basic PWA support.

Aturan penting:

```txt
Service worker tidak boleh cache API private user.
Service worker tidak boleh cache response auth.
Service worker tidak boleh cache transaksi, profile, goals, summary, export, atau endpoint yang memuat data personal.
Offline fallback boleh bersifat statis dan tidak memuat data user.
```

Risiko:

```txt
Jika API private di-cache, data user bisa tersimpan di device/browser secara tidak aman.
Jika user logout tetapi cache private masih ada, data bisa bocor.
```

Aturan pengembangan:

```txt
Setiap perubahan service worker harus direview dari sisi security.
Jangan menambahkan cache strategy untuk endpoint /api/* tanpa desain security.
```

---

## 21. Export Security

Export adalah area sensitif karena dapat memuat seluruh transaksi user.

Aturan:

```txt
Export wajib protected.
Export wajib memakai userId dari token.
Export tidak boleh menerima userId dari frontend.
Export tidak boleh memuat transaksi user lain.
Export filter categoryId milik user lain tidak boleh membocorkan data.
Export content tidak boleh dicatat di log.
Export content tidak boleh masuk audit metadata.
```

Audit event untuk export:

```txt
export.transactions_generated
```

Metadata audit export hanya boleh menyimpan informasi non-sensitif seperti:

```txt
format
typeFilter
hasCategoryFilter
hasDateRange
```

Tidak boleh menyimpan:

```txt
transaction notes
amounts
export contents
raw query
token
```

---

## 22. Sensitive Integration Policy

Fitur berikut belum boleh dibuat sembarangan:

```txt
Gmail transaction detection
E-wallet transaction detection
Mobile banking transaction detection
Financial assistant/advisor berbasis data pribadi
```

Sebelum fitur tersebut dibuat, harus ada desain untuk:

```txt
Consent
Privacy notice
Scope minimization
Token storage
Token encryption
Token revocation
Disconnect flow
Audit event
Data retention
Draft-first review
User approval
Error handling
Security testing
```

---

## 23. Google Login vs Gmail API

Google Login dan Gmail API adalah dua hal berbeda.

Google Login saat ini:

```txt
[✓] Dipakai untuk login/register
[✓] Memakai Google ID token
[✓] Tidak meminta Gmail scope
[✓] Tidak membaca email
[✓] Tidak menyimpan access token
[✓] Tidak menyimpan refresh token
```

Gmail API future integration:

```txt
[ ] Akan membutuhkan OAuth consent khusus
[ ] Akan membutuhkan Gmail scope
[ ] Akan membutuhkan token storage aman
[ ] Akan membutuhkan disconnect/revoke flow
[ ] Akan membutuhkan privacy policy yang jelas
[ ] Akan membutuhkan draft-first transaction detection
```

Aturan:

```txt
Jangan mencampur Google Login dengan Gmail reading.
Jangan menambahkan Gmail scope ke Google Login biasa.
Jangan menyimpan OAuth token sebelum desain token encryption siap.
```

---

## 24. Secret Management

Secret tidak boleh disimpan di repository.

Secret yang wajib dijaga:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
GOOGLE_CLIENT_ID
SMTP_USER
SMTP_PASS
EMAIL_FROM
VITE_GOOGLE_CLIENT_ID
VITE_API_BASE_URL
```

Catatan:

```txt
VITE_* akan terekspos ke frontend build.
Jangan pernah menyimpan secret backend dengan prefix VITE_.
GOOGLE_CLIENT_ID bukan secret seperti client secret, tetapi tetap harus dikonfigurasi dengan origin yang benar.
SMTP_PASS adalah secret sensitif.
DATABASE_URL dan DIRECT_URL adalah secret sensitif.
JWT_SECRET adalah secret sensitif.
```

Aturan:

```txt
Jangan commit .env.
Jangan kirim secret ke chat.
Jangan menulis secret di README/docs.
Gunakan Vercel Environment Variables untuk production.
Gunakan GitHub Actions Secrets untuk CI.
Redeploy setelah mengubah environment variable Vercel.
```

---

## 25. Environment Variables

Backend production membutuhkan:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="minimum_32_characters_secret"
FRONTEND_URL="https://sakuin-web.vercel.app"
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_pengirim@gmail.com"
SMTP_PASS="gmail_app_password_16_karakter_tanpa_spasi"
EMAIL_FROM="Sakuin <email_pengirim@gmail.com>"
```

Frontend production membutuhkan:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Catatan:

```txt
SMTP_PASS harus menggunakan Gmail App Password.
EMAIL_FROM sebaiknya memakai alamat yang sama dengan SMTP_USER.
RESEND_API_KEY tidak lagi dipakai untuk runtime reset password dan sebaiknya dihapus dari Vercel saat cleanup.
```

---

## 26. Security Testing

Security-related tests yang harus dipertahankan:

```txt
Auth tests
Auth token edge case tests
Security headers tests
Request body size limit tests
Rate limit tests
Rate limit abuse edge case tests
Data isolation tests
Summary isolation tests
Export isolation tests
Audit event contract tests
Audit recorder tests
Audit sink tests
Password reset tests
Google Login tests
```

Validasi backend:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Validasi frontend jika auth UI berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

---

## 27. Security Regression Checklist

Sebelum merge/push fitur auth/security:

```txt
[ ] Register email/password normal
[ ] Login email/password normal
[ ] Login Google normal
[ ] Register Google normal
[ ] Forgot password normal
[ ] Reset password normal
[ ] Token reset tidak bisa dipakai ulang
[ ] Token invalid/expired ditolak
[ ] Protected endpoint menolak request tanpa token
[ ] Protected endpoint menolak token invalid
[ ] Data user lain tidak bocor
[ ] Export hanya memuat data user login
[ ] Log tidak memuat password/token/email mentah
[ ] Audit metadata tidak memuat data sensitif
[ ] CI passed
[ ] Frontend deployment passed
[ ] Backend deployment passed
[ ] Production /health normal
[ ] Production /api/health normal
```

---

## 28. Future Security Roadmap

Prioritas security lanjutan:

```txt
[ ] Cleanup unused Resend env/code reference jika sudah tidak dibutuhkan
[ ] Distributed rate limiting
[ ] Better session strategy
[ ] httpOnly secure cookie migration
[ ] CSRF strategy
[ ] Password change flow
[ ] Email verification
[ ] Account deletion/export privacy flow
[ ] Audit log viewer policy
[ ] Frontend CSP hardening
[ ] Security review for future financial assistant
[ ] Security review for future Gmail/e-wallet/mobile banking integration
```

---

## 29. Non-Negotiable Security Rules

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

## 30. Summary

Security Sakuin saat ini sudah memiliki baseline yang layak untuk MVP/production awal:

```txt
Authentication berjalan.
Google Login berjalan.
Reset password berjalan.
Data isolation berjalan.
Safe logging berjalan.
Audit trail berjalan.
Security tests berjalan.
```

Namun security harus terus dikembangkan secara bertahap.

Fokus terdekat:

```txt
[ ] Cleanup unused secret/config
[ ] Dokumentasi tetap sinkron
[ ] Session hardening
[ ] Distributed rate limiting
[ ] Privacy/security design sebelum integrasi sensitif
```