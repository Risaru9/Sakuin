# Sakuin Security Documentation

Dokumen ini menjelaskan security baseline, prinsip keamanan, batasan, risiko, audit trail, AI safety, dan roadmap security untuk project **Sakuin**.

Sakuin adalah web app pengelola keuangan pribadi. Karena aplikasi ini menyimpan data sensitif seperti transaksi, saldo, kategori, target tabungan, profile user, export laporan keuangan, dan konteks AI finansial, security harus dikembangkan secara bertahap, hati-hati, dan terdokumentasi.

Dokumen ini tidak boleh dipahami sebagai klaim bahwa Sakuin sudah 100% aman. Target realistis security Sakuin adalah:

```txt
Mengurangi risiko.
Mencegah kesalahan umum.
Menjaga data user tetap terisolasi.
Mencegah data sensitif bocor melalui response, log, audit metadata, export, cache, atau AI context.
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
[✓] Asisten Sakuin financial-only guardrail aktif
[✓] AI provider hanya dipanggil dari backend
[✓] AI financial context user-only dan teragregasi
[✓] AI transaction draft rule-based tanpa Gemini
[✓] AI transaction draft tidak auto-save
[✓] Multi transaction draft tetap user-reviewed sebelum disimpan
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
[ ] Password change flow untuk user login
[ ] Cleanup unused Resend env/config reference jika masih ada
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
Security harus menjaga AI agar tidak mengarang, menyimpan otomatis, atau membocorkan data pribadi.
```

Prinsip khusus untuk fitur otomatisasi:

```txt
Fitur otomatisasi tidak boleh langsung membuat transaksi final tanpa review user.
Parser, AI, Gmail/e-wallet detection, bank statement import, atau financial assistant harus menghasilkan draft terlebih dahulu.
User harus dapat melihat, membatalkan, dan menyetujui hasil sebelum disimpan.
```

Prinsip khusus untuk AI:

```txt
AI tidak boleh menjadi sumber kebocoran data.
AI tidak boleh menerima semua transaksi mentah untuk MVP.
AI tidak boleh menerima token, email, password, credential, requestId, atau raw body.
AI tidak boleh membaca data user lain.
AI tidak boleh auto-save transaksi.
AI tidak boleh memakai Gemini untuk transaction draft.
AI tidak boleh menjawab topik di luar finansial Sakuin.
```

---

## 3. Production Context

Production saat ini:

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
Database : Supabase PostgreSQL
CI/CD    : GitHub Actions + Vercel Deploy
Email    : Gmail SMTP / Nodemailer
AI       : Gemini API via backend only
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
[✓] Asisten Sakuin aktif
[✓] AI transaction draft aktif
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
[✓] User hanya bisa membuat AI context dari data miliknya sendiri
[✓] User hanya bisa membuat draft AI berdasarkan akun login miliknya sendiri
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
Quick Transaction
AI financial context
AI assistant response
Future insight/advisor
Future Gmail/e-wallet extraction
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
AI financial context aggregation
AI provider prompt/context
AI assistant response
AI transaction draft category matching
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
[✓] AI financial context hanya mengambil data user login
```

Aturan pengembangan:

```txt
Setiap endpoint baru yang membaca data user harus memiliki ownership filter berdasarkan userId dari token.
Setiap endpoint agregasi harus diuji agar tidak menghitung data user lain.
Setiap endpoint export harus diuji agar tidak memuat data user lain.
Setiap fitur insight/AI harus diuji agar tidak mencampur data antar user.
Setiap fitur import/extraction harus menghasilkan draft dan tetap user-reviewed.
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
AI endpoint wajib validasi message/history.
Transaction draft hasil parser tetap harus melewati validasi createTransaction ketika disimpan.
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
Auth, profile, categories, transactions, goals, AI chat, dan export request tidak membutuhkan body besar.
Limit ini membantu mengurangi risiko request payload abuse.
```

Catatan:

```txt
Jika nanti ada fitur import CSV/XLSX, limit ini harus dievaluasi ulang secara khusus.
Jika nanti ada Gmail/e-wallet extraction, payload harus tetap dibatasi dan diproses hati-hati.
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
AI chat belum bisa diproses
```

Aturan pengembangan:

```txt
Jangan mengirim stack trace ke frontend production.
Jangan mengirim raw database error ke frontend production.
Jangan mengirim secret/env/token ke response.
Jangan mengirim provider AI error mentah ke frontend.
```

---

## 16. Rate Limiting

Backend memiliki baseline rate limiting.

Rate limit yang tersedia:

```txt
Login rate limit
Register rate limit
General API rate limit
AI endpoint rate limit
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
Mengontrol biaya AI provider.
Mengurangi risiko Gemini quota habis.
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
Jangan menghapus rate limit auth.
Jangan menghapus rate limit general API tanpa pengganti.
Jangan membuat endpoint AI tanpa rate limit.
Jangan membuat endpoint import/extraction tanpa rate limit.
```

---

## 17. Request ID

Backend menambahkan request ID pada response.

Header response:

```txt
X-Request-Id: <request-id>
```

Client boleh mengirim request ID sendiri selama formatnya aman:

```txt
X-Request-Id: client-request-123
```

Behavior:

```txt
[✓] Jika client mengirim X-Request-Id yang aman, backend dapat memakai request ID tersebut.
[✓] Jika client tidak mengirim X-Request-Id, backend membuat request ID baru.
[✓] Jika client mengirim X-Request-Id yang tidak aman, backend mengganti dengan request ID baru.
[✓] Response membawa X-Request-Id.
[✓] Request ID dipakai untuk request log, security event, dan audit event.
```

Request ID tidak boleh berisi:

```txt
password
token
Authorization header
cookie
email
raw body
data transaksi pribadi
AI prompt
AI response
```

---

## 18. Safe Request Logging

Backend memiliki safe request logging.

Boleh log:

```txt
requestId
method
path
status
durationMs
timestamp
environment
```

Tidak boleh log:

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
GEMINI_API_KEY
AI prompt penuh jika sensitif
AI response penuh jika sensitif
```

Aturan:

```txt
Log harus membantu debugging tanpa menjadi sumber kebocoran data baru.
Jika ragu apakah data sensitif, jangan log data tersebut.
```

---

## 19. Safe Security Event Logging

Security event logger dipakai untuk event keamanan yang aman.

Security-related safe events:

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

Candidate AI events:

```txt
ai.chat_requested
ai.chat_completed
ai.chat_failed
ai.out_of_scope_blocked
ai.transaction_draft_generated
ai.provider_used
ai.provider_fallback
```

Metadata security event harus disanitasi.

Tidak boleh menyimpan:

```txt
password
token
Authorization header
raw body
email mentah
reset token
Google credential
SMTP secret
GEMINI_API_KEY
AI prompt penuh
AI response penuh
```

---

## 20. Audit Trail

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

Candidate audit events untuk AI:

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

Audit metadata yang aman:

```txt
changedFields
format
typeFilter
hasCategoryFilter
hasDateRange
reason
status
intent
providerRoute
fallbackUsed
safe count/boolean fields
```

---

## 21. AI Security and Privacy

Asisten Sakuin adalah fitur financial-only AI helper.

Prinsip utama:

```txt
AI hanya boleh membantu topik keuangan pribadi di Sakuin.
AI tidak boleh menjawab pertanyaan umum.
AI tidak boleh dipakai sebagai penasihat investasi/pinjaman/pajak/hukum profesional.
AI tidak boleh mengarang data.
AI tidak boleh membaca data user lain.
AI tidak boleh menyimpan transaksi otomatis.
```

Topik yang boleh dijawab:

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

Topik yang harus ditolak:

```txt
coding
politik
hiburan
kesehatan
hukum
pajak profesional
investasi spesifik
pinjaman spesifik
pertanyaan umum di luar finansial Sakuin
permintaan mengarang data pribadi
```

Out-of-scope behavior:

```txt
Out-of-scope harus ditolak dengan sopan.
Out-of-scope tidak boleh memanggil Gemini.
Out-of-scope harus diproses murah dan aman.
```

Data yang boleh masuk ke AI provider:

```txt
Ringkasan pemasukan/pengeluaran teragregasi
Top expense categories teragregasi
Perbandingan periode teragregasi
Goals summary teragregasi
Safe balance status
Signal statistik aman
```

Data yang tidak boleh masuk ke AI provider:

```txt
email user
password
JWT token
Authorization header
raw request body
semua note transaksi mentah
semua ID database
requestId
SMTP secret
Google credential
data user lain
full export content
raw audit metadata
```

---

## 22. AI Provider Security

Provider awal:

```txt
Gemini API
```

Aturan:

```txt
Gemini hanya boleh dipanggil dari backend.
Frontend tidak boleh memanggil Gemini.
GEMINI_API_KEY tidak boleh memakai prefix VITE_.
GEMINI_API_KEY tidak boleh masuk repository.
GEMINI_API_KEY tidak boleh masuk log.
GEMINI_API_KEY tidak boleh dikirim ke frontend.
```

Environment backend:

```env
GEMINI_API_KEY="..."
GEMINI_MODEL_DEFAULT="..."
GEMINI_MODEL_COMPLEX="..."
GEMINI_MODEL_FALLBACK="..."
```

Provider routing:

```txt
Simple financial assistant  : default model
Complex financial analysis  : complex model
Provider error              : fallback model atau rule-based fallback
Out-of-scope                : tidak memanggil provider
Transaction draft           : tidak memanggil provider, wajib rule-based
```

Jika provider error:

```txt
Jangan bocorkan raw provider error ke frontend.
Gunakan pesan error aman.
Fallback boleh dipakai jika tersedia.
Log error harus aman dan tidak memuat prompt penuh/secret.
```

---

## 23. AI Transaction Draft Security

AI transaction draft adalah fitur yang mengubah chat natural menjadi draft transaksi.

Contoh:

```txt
catat makan ayam geprek 15000
catat makan 12000 minum 4000 cimol 4000 cireng 5000
dikasih kakak 100000
bensin 30000 kemarin
```

Policy:

```txt
AI hanya membuat draft.
AI tidak boleh auto-save transaksi.
AI transaction draft tidak boleh memanggil Gemini.
AI transaction draft harus rule-based.
User harus review sebelum simpan.
User bisa membatalkan draft.
User bisa menyimpan draft satu per satu.
User bisa menyimpan semua draft melalui Simpan Semua Draft.
```

Alasan rule-based:

```txt
Lebih deterministik.
Lebih mudah dites.
Lebih murah.
Lebih aman untuk nominal transaksi.
Mengurangi risiko hallucination dari AI provider.
```

Frontend security/UX rules:

```txt
Draft yang sudah disimpan tidak bisa disimpan ulang.
Draft yang sudah dibatalkan tidak bisa disimpan.
Draft belum lengkap tidak bisa disimpan.
Simpan Semua Draft hanya menyimpan draft yang valid dan aktif.
Simpan Semua Draft memakai createTransaction existing.
Save batch dilakukan parallel tetapi tetap melalui endpoint protected.
State saved/cancelled disimpan lokal per user.
No auto-scroll saat save/cancel/save all.
```

State saved/cancelled key:

```txt
${message.id}:${draftIndex}
```

Backward compatibility:

```txt
Draft index 0 masih dapat membaca old message.id state dari localStorage lama.
```

Data validation:

```txt
Draft yang disimpan tetap harus melewati validasi backend POST /api/transactions.
Validasi frontend tidak cukup untuk security.
```

---

## 24. Local Storage Security

Frontend saat ini memakai localStorage untuk beberapa data UX.

Data yang disimpan:

```txt
JWT token
AI chat history lokal
AI saved draft keys
AI cancelled draft keys
PWA/user preference tertentu jika ada
```

AI chat localStorage keys:

```txt
sakuin_ai_chat_history_v1:<userId>
sakuin_ai_saved_draft_ids_v1:<userId>
sakuin_ai_cancelled_draft_ids_v1:<userId>
```

Risiko:

```txt
localStorage dapat dibaca jika terjadi XSS.
Chat history lokal dapat berisi teks yang user ketik.
Token localStorage dapat dicuri jika halaman terkena script injection.
```

Mitigasi saat ini:

```txt
Tidak ada dangerouslySetInnerHTML untuk chat content.
Chat content dirender sebagai teks biasa.
Tidak menyimpan secret backend di frontend.
Clear chat history tersedia.
```

Backlog:

```txt
[ ] Migrasi auth token ke httpOnly secure cookie
[ ] Evaluasi apakah AI chat history perlu opsi disable
[ ] Evaluasi server-side encrypted chat history jika fitur memory lintas device dibuat
```

---

## 25. PWA Security

Sakuin mendukung PWA installable.

Aturan service worker:

```txt
Service worker tidak boleh cache API private user.
Service worker tidak boleh cache auth response.
Service worker tidak boleh cache transactions.
Service worker tidak boleh cache summary.
Service worker tidak boleh cache profile.
Service worker tidak boleh cache goals.
Service worker tidak boleh cache export.
Service worker tidak boleh cache AI chat response.
```

Boleh cache:

```txt
static assets
icons
manifest
offline page
non-sensitive frontend shell
```

Alasan:

```txt
Data keuangan user tidak boleh tersimpan di cache yang sulit dikontrol.
```

---

## 26. Export Security

Export adalah fitur sensitif karena menghasilkan data transaksi user.

Rules:

```txt
Export wajib protected.
Export wajib user-only.
Export tidak boleh menerima userId dari frontend.
Export harus memakai userId dari token.
Export filter categoryId milik user lain tidak boleh membocorkan data.
Export content tidak boleh masuk log.
Export content tidak boleh masuk audit metadata.
```

Format export:

```txt
JSON
CSV
XLSX
```

Audit event:

```txt
export.transactions_generated
```

Audit metadata aman:

```txt
format
typeFilter
hasCategoryFilter
hasDateRange
```

Audit metadata tidak boleh menyimpan:

```txt
transaction amount
transaction note
export file content
raw query lengkap jika berisi detail sensitif
```

---

## 27. Database Safety

Pernah terjadi risiko karena local/CI test bisa diarahkan ke production database jika environment salah.

Aturan keras:

```txt
Jangan menjalankan automated test ke production database.
Jangan memakai DATABASE_URL production untuk test.
Jangan menghapus database safety guard.
Jangan menghapus SAKUIN_DATABASE_TARGET.
Jangan menghapus SAKUIN_PRODUCTION_DATABASE_PROJECT_REF.
```

CI secrets harus memakai database test:

```env
CI_DATABASE_URL="postgresql://..."
CI_DIRECT_URL="postgresql://..."
CI_JWT_SECRET="minimum_32_characters_secret"
```

Safety env:

```env
SAKUIN_DATABASE_TARGET="test"
SAKUIN_PRODUCTION_DATABASE_PROJECT_REF="bwzxtjgrerjimcuyslci"
```

CI memiliki step:

```txt
Verify CI database safety
```

Tujuan:

```txt
Mencegah test cleanup/deleteMany menyentuh database production.
Mencegah false confidence dari test yang berjalan di environment salah.
```

---

## 28. Secrets Management

Secret tidak boleh masuk repository.

Secret yang dilarang commit:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
SMTP_PASS
SMTP_USER jika dianggap sensitif
GOOGLE_CLIENT_ID boleh public-ish tetapi tetap jangan hardcode sembarangan
GEMINI_API_KEY
RESEND_API_KEY jika masih ada
Vercel token
Supabase password
Google credential
Gmail App Password
```

File yang tidak boleh dicommit jika berisi secret:

```txt
.env
.env.local
.env.production
.env.development
.env.test jika berisi credential nyata
```

Aturan:

```txt
Gunakan Vercel Environment Variables untuk production.
Gunakan GitHub Actions Secrets untuk CI.
Gunakan .env lokal hanya di mesin developer.
Jika secret bocor, revoke/rotate segera.
```

---

## 29. Environment Variables

### Backend Required

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="minimum_32_characters_secret"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

### Google Login

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

### AI / Gemini

```env
GEMINI_API_KEY="..."
GEMINI_MODEL_DEFAULT="..."
GEMINI_MODEL_COMPLEX="..."
GEMINI_MODEL_FALLBACK="..."
```

Aturan AI env:

```txt
GEMINI_API_KEY hanya boleh di backend.
Jangan membuat VITE_GEMINI_API_KEY.
Frontend tidak boleh memanggil Gemini langsung.
Transaction draft tidak memakai Gemini.
```

### Frontend

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## 30. Security Testing

Security-related test yang sudah/harus dijaga:

```txt
Auth tests
Auth token edge case tests
Rate limit tests
API abuse edge case tests
Data isolation tests
Export isolation tests
Request ID tests
Security event logger tests
Audit event metadata tests
Audit sink tests
AI intent tests
AI chat service tests
AI transaction draft tests
AI financial context tests jika tersedia
AI scenario tests
```

Backend validation:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

AI-specific validation:

```bash
pnpm --filter @sakuin/api test -- tests/ai-intent.test.ts
pnpm --filter @sakuin/api test -- tests/ai-chat-service.test.ts
pnpm --filter @sakuin/api test -- tests/ai-financial-scenario.test.ts
pnpm --filter @sakuin/api test -- tests/ai-transaction-draft.test.ts
```

Frontend validation:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
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

---

## 31. Manual Security Regression Checklist

### Auth

```txt
[ ] Register email/password normal
[ ] Login email/password normal
[ ] Login error tetap generic
[ ] Login Google normal
[ ] Register Google normal
[ ] Forgot password response tetap generic
[ ] Reset password normal
[ ] Reset token tidak bisa dipakai ulang
[ ] Logout normal
```

### Protected API

```txt
[ ] Endpoint protected gagal tanpa token
[ ] Endpoint protected gagal dengan token invalid
[ ] Endpoint protected gagal dengan format Authorization salah
[ ] Endpoint private hanya mengembalikan data user login
```

### Export

```txt
[ ] Export JSON hanya data user login
[ ] Export CSV hanya data user login
[ ] Export XLSX hanya data user login
[ ] Export filter categoryId user lain tidak bocor
```

### AI

```txt
[ ] /asisten hanya bisa diakses user login
[ ] Prompt financial dijawab
[ ] Prompt out-of-scope ditolak
[ ] Transaction draft tidak auto-save
[ ] Single draft muncul
[ ] Multi draft muncul
[ ] Simpan Draft bekerja
[ ] Batalkan Draft bekerja
[ ] Simpan Semua Draft bekerja
[ ] Draft batal tidak bisa disimpan
[ ] Draft tersimpan tidak bisa disimpan ulang
[ ] Tidak ada auto-scroll saat save/cancel/save all
[ ] Transactions page hanya menampilkan transaksi user login
```

Out-of-scope test:

```txt
siapa istri Naruto?
buatkan cerpen
buatkan kode React
jelaskan sejarah Majapahit
```

Transaction draft test:

```txt
catat makan ayam geprek 15000
dikasih kakak 100000
bensin 30000 kemarin
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

---

## 32. Future Sensitive Integrations

Fitur seperti Gmail/e-wallet/mobile banking detection sangat sensitif.

Tidak boleh dibuat sebelum ada desain untuk:

```txt
Explicit user consent
Data minimization
Token handling
Token encryption jika token disimpan
Disconnect/revoke flow
Draft-first extraction
User review before save
Audit event aman
Data retention policy
Privacy policy
Rate limiting
Provider error handling
Data isolation tests
Manual regression checklist
```

Aturan:

```txt
Jangan langsung membaca Gmail user hanya karena Google Login sudah ada.
Google Login saat ini hanya untuk autentikasi.
Sakuin tidak meminta Gmail scope.
Jika Gmail integration dibuat, harus menjadi fase security besar tersendiri.
```

---

## 33. Security Backlog

Prioritas backlog:

```txt
[ ] Cleanup unused Resend env/config reference jika masih ada
[ ] Distributed rate limiting
[ ] httpOnly secure cookie migration
[ ] CSRF strategy jika memakai cookie
[ ] Refresh token strategy
[ ] Server-side session invalidation
[ ] Email verification untuk akun email/password
[ ] Password change flow untuk user login
[ ] Frontend CSP hardening
[ ] Formal privacy policy
[ ] Data retention policy
[ ] Audit log viewer/admin policy
[ ] Financial AI audit events yang aman
[ ] Persistent AI chat history privacy design
[ ] Import/export security review
[ ] Gmail/e-wallet integration security design
[ ] Formal penetration testing
```

---

## 34. Non-Negotiable Security Rules

```txt
Jangan commit secret.
Jangan jalankan test ke production database.
Jangan expose JWT token ke log.
Jangan expose password/reset token ke response/log.
Jangan expose SMTP_PASS.
Jangan expose GEMINI_API_KEY.
Jangan buat VITE_GEMINI_API_KEY.
Jangan panggil AI provider dari frontend.
Jangan kirim semua transaksi mentah ke AI provider.
Jangan auto-save transaksi dari AI.
Jangan pakai Gemini untuk transaction draft.
Jangan jawab out-of-scope dengan provider call.
Jangan cache API private user di service worker.
Jangan log export content.
Jangan simpan prompt/response AI penuh jika sensitif.
Jangan mencampur data user lain dalam summary/export/AI context.
Jangan membuat integrasi Gmail/e-wallet tanpa explicit consent dan security design.
```

---

## 35. Current Security Summary

Sakuin saat ini sudah memiliki security baseline yang cukup baik untuk MVP/production awal:

```txt
[✓] Auth protected
[✓] Google Login aman untuk autentikasi
[✓] Password reset token di-hash
[✓] Gmail SMTP berjalan dengan App Password
[✓] Data isolation diterapkan
[✓] Request validation diterapkan
[✓] Rate limit baseline diterapkan
[✓] Request ID diterapkan
[✓] Safe request logging diterapkan
[✓] Safe security event logging diterapkan
[✓] AuditLog database-backed diterapkan
[✓] Production error masking diterapkan
[✓] AI guardrail diterapkan
[✓] AI provider hanya backend
[✓] AI financial context teragregasi
[✓] AI transaction draft no auto-save
[✓] AI transaction draft rule-based
```

Namun beberapa hal masih perlu ditingkatkan sebelum fitur makin sensitif:

```txt
[ ] Token masih di localStorage
[ ] Rate limit masih in-memory
[ ] Belum ada httpOnly cookie/session hardening
[ ] Belum ada privacy policy formal
[ ] Belum ada data retention policy
[ ] Belum ada formal penetration testing
[ ] Belum ada security design untuk Gmail/e-wallet extraction
```

Kesimpulan:

```txt
Sakuin boleh lanjut pengembangan fitur non-sensitif dengan tetap menjalankan validasi.
Untuk fitur sensitif, lakukan security design dulu sebelum coding.
```