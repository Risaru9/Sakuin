# Sakuin API Documentation

Dokumentasi ini menjelaskan endpoint backend Sakuin untuk kebutuhan frontend, testing API, integrasi, maintenance, dan pengembangan lanjutan.

Backend Sakuin menggunakan:

```txt
Runtime      : Node.js
Framework    : Hono
Language     : TypeScript
ORM          : Prisma
Database     : PostgreSQL / Supabase PostgreSQL
Validation   : Zod
Auth         : JWT Bearer Token
Test         : Vitest
Export       : JSON, CSV, XLSX
Security     : Security headers, request body size limit, CORS allowlist, rate limiting, request ID, safe logging, production error masking, data isolation tests, database-backed audit trail
```

Catatan penting:

```txt
Dokumentasi ini hanya mencakup API yang sudah ada saat ini.
Quick Transaction / Catat Cepat adalah fitur frontend/parser yang menyimpan hasil final melalui endpoint transaksi biasa.
AuditLog sudah aktif secara internal, tetapi belum ada public/protected API untuk membaca AuditLog.
Gmail/e-wallet/mobile banking transaction detection belum diimplementasikan sebagai API.
Google Login belum diimplementasikan sebagai API.
```

---

## Base URL

### Development

```txt
http://127.0.0.1:5000
```

### Production

```txt
https://sakuin-api.vercel.app
```

Health check production:

```txt
GET https://sakuin-api.vercel.app/health
GET https://sakuin-api.vercel.app/api/health
```

---

## Response Format

Semua endpoint JSON mengikuti format response standar.

### Success Response

```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Pesan error",
  "errors": null
}
```

### Validation Error Response

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

### Production Internal Error Response

Untuk error internal 500 pada production, backend tidak mengirim detail error mentah.

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": null
}
```

Catatan:

```txt
HttpError yang memang aman untuk user tetap boleh mengirim pesan spesifik.
Contoh: token invalid, route tidak ditemukan, validasi gagal, data tidak ditemukan, request terlalu besar, atau rate limit exceeded.
```

---

## Request ID

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
[✓] Jika client mengirim X-Request-Id yang aman, backend dapat memakai request ID tersebut
[✓] Jika client tidak mengirim X-Request-Id, backend membuat request ID baru
[✓] Jika client mengirim X-Request-Id yang tidak aman, backend mengganti dengan request ID baru
[✓] Response membawa X-Request-Id
[✓] Request ID dipakai untuk request log, security event, dan audit event
```

Aturan:

```txt
Request ID bukan token.
Request ID bukan session identifier.
Request ID tidak boleh berisi password, token, email, raw body, atau data sensitif lain.
```

---

## Authentication

Sakuin memakai JWT Bearer Token.

Endpoint protected wajib mengirim header:

```txt
Authorization: Bearer <token>
```

Token didapat dari response:

```txt
POST /api/auth/register
POST /api/auth/login
```

Frontend tidak perlu mengirim `userId` pada request protected.

Backend mengambil identitas user dari JWT token.

Catatan security:

```txt
Token saat ini masih disimpan di localStorage pada frontend.
Untuk security tingkat lanjut, migrasi ke httpOnly secure cookie dapat dipertimbangkan pada fase berbeda.
Migrasi ke cookie tidak boleh dilakukan tanpa desain CSRF, CORS credentials, logout flow, dan regression test.
```

---

## Security Notes

Backend sudah menerapkan API security hardening untuk baseline MVP/production awal.

Security bukan kondisi absolut. Project tidak boleh diklaim 100% aman. Target realistis adalah mengurangi risiko:

```txt
[✓] Brute force login
[✓] Credential stuffing dasar
[✓] Token abuse dasar
[✓] Broken access control
[✓] IDOR / BOLA
[✓] Cross-user data leakage
[✓] Oversized payload abuse
[✓] CORS misconfiguration
[✓] Production error leakage
[✓] Export data leakage
[✓] Sensitive data leakage through logs
[✓] Sensitive data leakage through audit metadata
```

---

### Security Headers

Security headers yang diterapkan:

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
[✓] Mencegah clickjacking melalui frame protection
[✓] Membatasi referrer leakage
[✓] Membatasi browser permissions yang tidak dibutuhkan
[✓] Memberikan basic CSP untuk response API
[✓] Mengaktifkan HSTS pada production
```

---

### Request Body Size Limit

Backend membatasi request body berdasarkan `Content-Length`.

Limit saat ini:

```txt
1 MB
```

Jika request body melebihi limit, response:

```json
{
  "success": false,
  "message": "Ukuran request terlalu besar. Maksimal 1 MB.",
  "errors": null
}
```

Catatan:

```txt
Jika nanti ada fitur import CSV/XLSX, limit ini harus dievaluasi ulang.
```

---

### CORS

CORS production dibatasi untuk frontend production dan local development.

Allowed origin utama:

```txt
http://127.0.0.1:3000
http://localhost:3000
FRONTEND_URL dari environment
https://sakuin-web.vercel.app
Vercel preview domain dari akun yang diizinkan
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

Aturan penting:

```txt
Jangan memakai wildcard origin untuk endpoint yang memakai token.
Jangan mengubah CORS production tanpa regression test.
Jangan memakai preview URL yang terkena Vercel Authentication sebagai API production.
```

---

### Rate Limiting

Backend sudah memiliki baseline rate limiting.

Rate limit yang tersedia:

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

Contoh response 429:

```json
{
  "success": false,
  "message": "Terlalu banyak request. Coba lagi nanti.",
  "errors": null
}
```

Catatan:

```txt
Exact limit/window mengikuti konfigurasi middleware backend.
Jangan menulis angka limit di dokumentasi ini kecuali sudah diverifikasi dari source code terbaru.
```

Batasan saat ini:

```txt
Rate limit menggunakan in-memory store.
Ini cukup untuk baseline/MVP dan low-scale usage.
Namun untuk production serverless/multi-instance, in-memory store tidak ideal karena setiap instance dapat memiliki state berbeda.
Jika traffic meningkat, pertimbangkan Redis/Upstash/KV-based rate limiting.
```

---

### Safe Logging

Backend memiliki safe request logging dan safe security event logging.

Safe request log dapat mencatat:

```txt
requestId
method
path
status
durationMs
timestamp
```

Safe security event yang didukung:

```txt
auth.login_failed
auth.auth_failed
rate_limit.hit
```

Log tidak boleh memuat:

```txt
password
token
Authorization header
cookie
raw request body
email mentah
transaction amount
transaction note
goal name
goal amount
category name
export content
OAuth token
```

---

### Audit Trail

Backend memiliki database-backed audit trail menggunakan Prisma model `AuditLog`.

Audit trail adalah proses internal. Saat ini tidak ada endpoint API untuk membaca AuditLog.

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

Audit event tidak mengubah response API. Audit event dicatat setelah mutation/export berhasil.

Audit persistence bersifat **fail-open**:

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
```

---

### Data Isolation

Data isolation wajib untuk semua endpoint yang membaca atau memodifikasi data user.

Prinsip:

```txt
Frontend tidak boleh menentukan userId.
Backend harus mengambil userId dari JWT token.
Query backend harus selalu membatasi data berdasarkan userId dari token.
Jika resource bukan milik user, response sebaiknya sama seperti data tidak ditemukan.
```

Data isolation yang sudah diterapkan:

```txt
[✓] User hanya bisa membaca transaksi miliknya sendiri
[✓] User hanya bisa update transaksi miliknya sendiri
[✓] User hanya bisa delete transaksi miliknya sendiri
[✓] User tidak bisa memakai custom category milik user lain
[✓] User tidak bisa update/delete category milik user lain
[✓] User tidak bisa akses/update/delete goal milik user lain
[✓] Summary hanya menghitung data user login
[✓] Export hanya memuat data user login
```

---

### Auth and Token Edge Cases

Auth/token behavior yang harus dijaga:

```txt
[✓] Authorization header wajib ada untuk protected endpoint
[✓] Format wajib Bearer token
[✓] Bearer token kosong ditolak
[✓] Token signature salah ditolak
[✓] Token expired ditolak
[✓] Token tanpa userId ditolak
[✓] Token dengan userId bukan string ditolak
[✓] Token milik user yang sudah dihapus tidak bisa mengambil profile
```

---

## Public Endpoints

Endpoint berikut tidak membutuhkan token:

```txt
GET  /health
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

---

## Protected Endpoints

Endpoint berikut membutuhkan token:

```txt
GET    /api/auth/me

GET    /api/users/profile
PATCH  /api/users/profile

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/summary

GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PUT    /api/goals/:id
DELETE /api/goals/:id

GET    /api/export/transactions
```

---

## Internal-Only Behavior

Behavior berikut berjalan secara internal dan bukan endpoint publik:

```txt
Request ID generation
Safe request logging
Safe security event logging
Audit event recorder
Database AuditLog persistence
```

Saat ini tidak ada endpoint:

```txt
GET /api/audit-logs
GET /api/security-events
```

Jika endpoint audit log dibuat nanti, harus ada desain authorization, pagination, filter, rate limit, dan test khusus.

---

## Common Types

### TransactionType

```txt
INCOME
EXPENSE
```

### ExportFormat

```txt
json
csv
xlsx
```

### Transaction Sort

```txt
date_desc
date_asc
created_desc
created_asc
```

### Date Format

Untuk field tanggal, gunakan ISO string:

```txt
2026-05-15T00:00:00.000Z
```

Untuk query filter tanggal, format `YYYY-MM-DD` juga dapat digunakan:

```txt
2026-05-15
```

### Decimal Money Format

Nominal uang umumnya dikirim sebagai string decimal:

```txt
"250000.00"
"1000000.00"
```

Frontend boleh menampilkan nominal dengan format Rupiah.

---

# 1. Health API

## GET `/health`

Cek status server.

### Auth

Tidak perlu token.

### Response

```json
{
  "success": true,
  "message": "Server sehat",
  "data": {
    "status": "ok",
    "timestamp": "2026-05-15T00:00:00.000Z"
  }
}
```

---

## GET `/api/health`

Cek status API route.

### Auth

Tidak perlu token.

### Response

```json
{
  "success": true,
  "message": "API sehat",
  "data": {
    "status": "ok",
    "timestamp": "2026-05-15T00:00:00.000Z"
  }
}
```

---

# 2. Auth API

## POST `/api/auth/register`

Register user baru.

### Auth

Tidak perlu token.

### Body

```json
{
  "name": "Rizal",
  "email": "rizal@example.com",
  "password": "Password123"
}
```

### Validasi

```txt
name     wajib diisi
name     maksimal 100 karakter
email    wajib format email valid
email    akan dinormalisasi lowercase
password minimal 8 karakter
password harus mengandung angka
email    harus unik
```

### Response

```json
{
  "success": true,
  "message": "Register berhasil",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "Rizal",
      "email": "rizal@example.com",
      "safeBalanceLimit": 0
    }
  }
}
```

### Error Email Sudah Digunakan

```json
{
  "success": false,
  "message": "Email sudah digunakan",
  "errors": null
}
```

### Error Password Lemah

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "password": [
        "Password minimal 8 karakter",
        "Password harus mengandung angka"
      ]
    }
  }
}
```

### Catatan

```txt
passwordHash tidak pernah dikirim ke frontend.
Token dari response disimpan frontend untuk request protected.
Register terkena rate limit.
```

---

## POST `/api/auth/login`

Login user.

### Auth

Tidak perlu token.

### Body

```json
{
  "email": "rizal@example.com",
  "password": "Password123"
}
```

### Response

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "Rizal",
      "email": "rizal@example.com",
      "safeBalanceLimit": 0
    }
  }
}
```

### Error Email atau Password Salah

```json
{
  "success": false,
  "message": "Email atau password salah",
  "errors": null
}
```

### Error Email Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "email": [
        "Email tidak valid"
      ]
    }
  }
}
```

### Catatan

```txt
Login error dibuat generic agar tidak mudah dipakai untuk user enumeration.
Login terkena rate limit.
Failed login dicatat sebagai safe security event tanpa password/email mentah.
```

---

## GET `/api/auth/me`

Mengambil data user dari token.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "message": "Profile berhasil diambil",
  "data": {
    "id": "user-id",
    "name": "Rizal",
    "email": "rizal@example.com",
    "safeBalanceLimit": 0
  }
}
```

### Error Tanpa Token

```json
{
  "success": false,
  "message": "Authorization header wajib diisi",
  "errors": null
}
```

### Error Format Token Salah

```json
{
  "success": false,
  "message": "Format token harus Bearer token",
  "errors": null
}
```

### Error Token Invalid atau Expired

```json
{
  "success": false,
  "message": "Token tidak valid atau sudah kedaluwarsa",
  "errors": null
}
```

---

# 3. User Profile API

## GET `/api/users/profile`

Mengambil profile user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "message": "Profile berhasil diambil",
  "data": {
    "id": "user-id",
    "name": "Rizal",
    "email": "rizal@example.com",
    "safeBalanceLimit": "500000.00",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Catatan

```txt
safeBalanceLimit dikirim sebagai string decimal.
passwordHash tidak pernah dikirim.
```

---

## PATCH `/api/users/profile`

Update nama user dan safe balance limit.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Body

Minimal satu field wajib dikirim.

```json
{
  "name": "Rizal Updated",
  "safeBalanceLimit": "500000"
}
```

### Response

```json
{
  "success": true,
  "message": "Profile berhasil diupdate",
  "data": {
    "id": "user-id",
    "name": "Rizal Updated",
    "email": "rizal@example.com",
    "safeBalanceLimit": "500000.00",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Validasi

```txt
name wajib diisi jika dikirim
name maksimal 100 karakter
safeBalanceLimit wajib berupa angka valid jika dikirim
safeBalanceLimit tidak boleh negatif
safeBalanceLimit maksimal 2 angka desimal
```

### Catatan Frontend

Frontend Sakuin membatasi input safe balance limit dengan aturan:

```txt
Minimal  : Rp 0
Maksimal : Rp 1.000.000.000.000
Hanya angka
Tidak boleh minus
Tidak boleh huruf
Tidak boleh simbol
```

### Audit Event

Jika update berhasil, backend mencatat audit event internal:

```txt
profile.updated
```

Metadata aman:

```txt
changedFields
```

Audit event tidak menyimpan:

```txt
nama baru user
safeBalanceLimit value
token
raw body
```

---

# 4. Categories API

Category digunakan untuk mengelompokkan transaksi.

Sakuin memiliki dua jenis kategori:

```txt
Default category : kategori bawaan sistem, userId null, isDefault true
Custom category  : kategori buatan user, userId dari token, isDefault false
```

Default category dapat digunakan oleh semua user, tetapi tidak boleh diedit atau dihapus oleh user.

---

## GET `/api/categories`

Mengambil daftar kategori yang bisa dipakai user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Query Params

```txt
type optional, INCOME | EXPENSE
```

### Contoh Request

```txt
GET /api/categories
GET /api/categories?type=INCOME
GET /api/categories?type=EXPENSE
```

### Response

```json
{
  "success": true,
  "message": "Daftar kategori berhasil diambil",
  "data": [
    {
      "id": "cat_income_salary",
      "name": "Gaji",
      "type": "INCOME",
      "icon": "wallet",
      "color": "#22c55e",
      "isDefault": true
    },
    {
      "id": "custom-category-id",
      "name": "Freelance",
      "type": "INCOME",
      "icon": "briefcase",
      "color": "#0ea5e9",
      "isDefault": false
    }
  ]
}
```

### Catatan

```txt
Response berisi default category dan custom category milik user login.
User tidak bisa melihat custom category milik user lain.
```

---

## POST `/api/categories`

Membuat custom category baru.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Body

```json
{
  "name": "Transportasi",
  "type": "EXPENSE",
  "icon": "car",
  "color": "#0ea5e9"
}
```

### Field

```txt
name  wajib
type  wajib, INCOME atau EXPENSE
icon  opsional, maksimal 50 karakter
color opsional, maksimal 30 karakter
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil dibuat",
  "data": {
    "id": "custom-category-id",
    "name": "Transportasi",
    "type": "EXPENSE",
    "icon": "car",
    "color": "#0ea5e9",
    "isDefault": false
  }
}
```

### Validasi

```txt
name wajib diisi
name maksimal 50 karakter
type wajib INCOME atau EXPENSE
name tidak boleh duplikat untuk user dan type yang sama
name tidak boleh sama dengan default category visible untuk type yang sama
icon opsional
color opsional
```

### Audit Event

Jika create berhasil, backend mencatat audit event internal:

```txt
category.created
```

Metadata aman:

```txt
type
hasIcon
hasColor
```

Audit event tidak menyimpan:

```txt
category name
icon value
color value
token
raw body
```

---

## PUT `/api/categories/:id`

Update custom category milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Params

```txt
id wajib, category id
```

### Body

Semua field opsional, tetapi minimal satu field dikirim.

```json
{
  "name": "Transportasi Harian",
  "type": "EXPENSE",
  "icon": "bus",
  "color": "#0284c7"
}
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil diupdate",
  "data": {
    "id": "custom-category-id",
    "name": "Transportasi Harian",
    "type": "EXPENSE",
    "icon": "bus",
    "color": "#0284c7",
    "isDefault": false
  }
}
```

### Error Jika Default Category atau Category User Lain

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan atau tidak bisa diubah",
  "errors": null
}
```

### Error Jika Type Diubah Saat Category Sudah Dipakai

```json
{
  "success": false,
  "message": "Tipe kategori tidak bisa diubah karena kategori sudah digunakan oleh transaksi",
  "errors": null
}
```

### Audit Event

Jika update berhasil, backend mencatat audit event internal:

```txt
category.updated
```

Metadata aman:

```txt
changedFields
typeProvided
iconProvided
hasIcon
colorProvided
hasColor
```

Audit event tidak menyimpan:

```txt
category name
icon value
color value
token
raw body
```

---

## DELETE `/api/categories/:id`

Menghapus custom category milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Params

```txt
id wajib, category id
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil dihapus",
  "data": {
    "id": "custom-category-id",
    "name": "Transportasi",
    "type": "EXPENSE",
    "icon": "car",
    "color": "#0ea5e9",
    "isDefault": false
  }
}
```

### Error Jika Default Category atau Category User Lain

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan atau tidak bisa diubah",
  "errors": null
}
```

### Error Jika Category Sudah Digunakan Transaksi

```json
{
  "success": false,
  "message": "Kategori tidak bisa dihapus karena sudah digunakan oleh transaksi",
  "errors": null
}
```

### Audit Event

Jika delete berhasil, backend mencatat audit event internal:

```txt
category.deleted
```

Metadata aman:

```txt
reason
```

Audit event tidak menyimpan:

```txt
category name
icon value
color value
token
raw body
```

---

# 5. Transactions API

Transaction adalah data utama untuk pemasukan dan pengeluaran user.

---

## GET `/api/transactions`

Mengambil daftar transaksi user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Query Params

```txt
page       optional, default 1
limit      optional, default 10, maksimal 100
type       optional, INCOME | EXPENSE
categoryId optional
search     optional
startDate  optional
endDate    optional
sort       optional, date_desc | date_asc | created_desc | created_asc
```

### Contoh Request

```txt
GET /api/transactions
GET /api/transactions?page=1&limit=10
GET /api/transactions?type=EXPENSE
GET /api/transactions?categoryId=category-id
GET /api/transactions?search=makan
GET /api/transactions?startDate=2026-05-01&endDate=2026-05-31
GET /api/transactions?sort=date_asc
```

### Response

```json
{
  "success": true,
  "message": "Daftar transaksi berhasil diambil",
  "data": {
    "items": [
      {
        "id": "transaction-id",
        "type": "EXPENSE",
        "amount": "25000",
        "note": "Makan siang",
        "date": "2026-05-15T00:00:00.000Z",
        "category": {
          "id": "cat_expense_food",
          "name": "Makanan",
          "type": "EXPENSE",
          "icon": "utensils",
          "color": "#f97316",
          "isDefault": true
        },
        "createdAt": "2026-05-15T00:00:00.000Z",
        "updatedAt": "2026-05-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Catatan

```txt
User hanya menerima transaksi miliknya sendiri.
Search saat ini berbasis catatan/note transaksi.
```

---

## POST `/api/transactions`

Membuat transaksi baru.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Body

```json
{
  "type": "EXPENSE",
  "amount": "25000",
  "categoryId": "cat_expense_food",
  "date": "2026-05-15T00:00:00.000Z",
  "note": "Makan siang"
}
```

### Field

```txt
type       wajib, INCOME atau EXPENSE
amount     wajib
categoryId wajib
date       wajib
note       opsional, nullable, maksimal 255 karakter
```

### Validasi Amount

```txt
amount wajib diisi
amount harus angka positif
amount harus lebih dari 0
amount maksimal 1.000.000.000.000
amount maksimal 2 angka desimal
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dibuat",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "25000",
    "note": "Makan siang",
    "date": "2026-05-15T00:00:00.000Z",
    "category": {
      "id": "cat_expense_food",
      "name": "Makanan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#f97316",
      "isDefault": true
    },
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Category Tidak Valid atau Type Tidak Sesuai

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi",
  "errors": null
}
```

### Audit Event

Jika create berhasil, backend mencatat audit event internal:

```txt
transaction.created
```

Metadata aman:

```txt
type
hasNote
dateProvided
```

Audit event tidak menyimpan:

```txt
amount
note
categoryId
category name
token
raw body
```

---

## GET `/api/transactions/:id`

Mengambil detail transaksi milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Params

```txt
id wajib, transaction id
```

### Response

```json
{
  "success": true,
  "message": "Detail transaksi berhasil diambil",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "25000",
    "note": "Makan siang",
    "date": "2026-05-15T00:00:00.000Z",
    "category": {
      "id": "cat_expense_food",
      "name": "Makanan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#f97316",
      "isDefault": true
    },
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

---

## PUT `/api/transactions/:id`

Update transaksi milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Params

```txt
id wajib, transaction id
```

### Body

Semua field opsional, tetapi minimal satu field dikirim.

```json
{
  "type": "EXPENSE",
  "amount": "30000",
  "categoryId": "cat_expense_food",
  "date": "2026-05-16T00:00:00.000Z",
  "note": "Makan malam"
}
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil diupdate",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "30000",
    "note": "Makan malam",
    "date": "2026-05-16T00:00:00.000Z",
    "category": {
      "id": "cat_expense_food",
      "name": "Makanan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#f97316",
      "isDefault": true
    },
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

### Audit Event

Jika update berhasil, backend mencatat audit event internal:

```txt
transaction.updated
```

Metadata aman:

```txt
changedFields
hasNote
```

Audit event tidak menyimpan:

```txt
amount
note
categoryId
category name
token
raw body
```

---

## DELETE `/api/transactions/:id`

Menghapus transaksi milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Params

```txt
id wajib, transaction id
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "25000",
    "note": "Makan siang",
    "date": "2026-05-15T00:00:00.000Z",
    "category": {
      "id": "cat_expense_food",
      "name": "Makanan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#f97316",
      "isDefault": true
    },
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

### Audit Event

Jika delete berhasil, backend mencatat audit event internal:

```txt
transaction.deleted
```

Metadata aman:

```txt
reason
```

Audit event tidak menyimpan:

```txt
amount
note
categoryId
category name
token
raw body
```

---

# 6. Summary API

## GET `/api/summary`

Mengambil ringkasan keuangan user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "message": "Summary berhasil diambil",
  "data": {
    "totalIncome": "1000000.00",
    "totalExpense": "250000.00",
    "balance": "750000.00",
    "safeBalanceLimit": "500000.00",
    "isBelowSafeLimit": false,
    "incomeThisMonth": "1000000.00",
    "expenseThisMonth": "250000.00",
    "balanceThisMonth": "750000.00",
    "transactionCount": 2,
    "recentTransactions": [],
    "expenseByCategory": [],
    "incomeByCategory": [],
    "monthlyTrend": [
      {
        "month": "2026-05",
        "income": "1000000.00",
        "expense": "250000.00",
        "balance": "750000.00"
      }
    ]
  }
}
```

### Catatan

```txt
Summary hanya menghitung data user login.
Summary tidak boleh menghitung transaksi user lain.
Summary category breakdown tidak boleh memuat custom category user lain.
```

---

# 7. Goals API

Goal digunakan untuk target tabungan atau target finansial user.

---

## GET `/api/goals`

Mengambil daftar goal user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "message": "Daftar goal berhasil diambil",
  "data": [
    {
      "id": "goal-id",
      "name": "Dana Darurat",
      "targetAmount": "10000000.00",
      "currentAmount": "2500000.00",
      "progressPercentage": 25,
      "remainingAmount": "7500000.00",
      "isCompleted": false,
      "deadline": "2026-12-31T00:00:00.000Z",
      "isOverdue": false,
      "createdAt": "2026-05-15T00:00:00.000Z",
      "updatedAt": "2026-05-15T00:00:00.000Z"
    }
  ]
}
```

---

## POST `/api/goals`

Membuat goal baru.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Body

```json
{
  "name": "Dana Darurat",
  "targetAmount": "10000000",
  "currentAmount": "2500000",
  "deadline": "2026-12-31T00:00:00.000Z"
}
```

### Field

```txt
name          wajib
targetAmount  wajib
currentAmount opsional
deadline      opsional, nullable
```

### Validasi

```txt
name wajib diisi
name maksimal 100 karakter
targetAmount harus lebih dari 0
currentAmount tidak boleh negatif
currentAmount tidak boleh lebih besar dari targetAmount
nominal maksimal 2 angka desimal
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dibuat",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat",
    "targetAmount": "10000000.00",
    "currentAmount": "2500000.00",
    "progressPercentage": 25,
    "remainingAmount": "7500000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Current Amount Lebih Besar dari Target

```json
{
  "success": false,
  "message": "Current amount tidak boleh lebih besar dari target amount",
  "errors": null
}
```

### Audit Event

Jika create berhasil, backend mencatat audit event internal:

```txt
goal.created
```

Metadata aman:

```txt
hasCurrentAmount
hasDeadline
```

Audit event tidak menyimpan:

```txt
goal name
targetAmount
currentAmount
deadline value
token
raw body
```

---

## GET `/api/goals/:id`

Mengambil detail goal milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Params

```txt
id wajib, goal id
```

### Response

```json
{
  "success": true,
  "message": "Detail goal berhasil diambil",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat",
    "targetAmount": "10000000.00",
    "currentAmount": "2500000.00",
    "progressPercentage": 25,
    "remainingAmount": "7500000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

---

## PUT `/api/goals/:id`

Update goal milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

### Params

```txt
id wajib, goal id
```

### Body

Semua field opsional, tetapi minimal satu field dikirim.

```json
{
  "name": "Dana Darurat Updated",
  "targetAmount": "12000000",
  "currentAmount": "5000000",
  "deadline": "2026-12-31T00:00:00.000Z"
}
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil diupdate",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat Updated",
    "targetAmount": "12000000.00",
    "currentAmount": "5000000.00",
    "progressPercentage": 41.67,
    "remainingAmount": "7000000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

### Audit Event

Jika update berhasil, backend mencatat audit event internal:

```txt
goal.updated
```

Metadata aman:

```txt
changedFields
hasDeadline
```

Audit event tidak menyimpan:

```txt
goal name
targetAmount
currentAmount
deadline value
token
raw body
```

---

## DELETE `/api/goals/:id`

Menghapus goal milik user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Params

```txt
id wajib, goal id
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dihapus",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat",
    "targetAmount": "10000000.00",
    "currentAmount": "2500000.00",
    "progressPercentage": 25,
    "remainingAmount": "7500000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Bukan Milik User atau Tidak Ada

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

### Audit Event

Jika delete berhasil, backend mencatat audit event internal:

```txt
goal.deleted
```

Metadata aman:

```txt
reason
```

Audit event tidak menyimpan:

```txt
goal name
targetAmount
currentAmount
token
raw body
```

---

# 8. Export API

Export transaksi menghasilkan laporan transaksi user login.

Format yang tersedia:

```txt
json
csv
xlsx
```

---

## GET `/api/export/transactions`

Export transaksi user login.

### Auth

Wajib token.

### Headers

```txt
Authorization: Bearer <token>
```

### Query Params

```txt
format     optional, json | csv | xlsx, default json
type       optional, INCOME | EXPENSE
categoryId optional
startDate  optional
endDate    optional
```

### Contoh Request

```txt
GET /api/export/transactions
GET /api/export/transactions?format=json
GET /api/export/transactions?format=csv
GET /api/export/transactions?format=xlsx
GET /api/export/transactions?format=json&type=EXPENSE
GET /api/export/transactions?format=json&startDate=2026-05-01&endDate=2026-05-31
```

---

## JSON Export Response

Jika `format=json`, response mengikuti format JSON standar.

```json
{
  "success": true,
  "message": "Export transaksi berhasil dibuat",
  "data": {
    "generatedAt": "2026-05-15T00:00:00.000Z",
    "filters": {
      "type": null,
      "categoryId": null,
      "startDate": null,
      "endDate": null
    },
    "summary": {
      "totalIncome": "1000000.00",
      "totalExpense": "250000.00",
      "balance": "750000.00",
      "transactionCount": 2
    },
    "transactions": [
      {
        "id": "transaction-id",
        "date": "2026-05-15T00:00:00.000Z",
        "type": "EXPENSE",
        "amount": "250000.00",
        "note": "Makan",
        "category": {
          "id": "cat_expense_food",
          "name": "Makanan",
          "type": "EXPENSE",
          "icon": "utensils",
          "color": "#f97316"
        },
        "createdAt": "2026-05-15T00:00:00.000Z",
        "updatedAt": "2026-05-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

## CSV Export Response

Jika `format=csv`, response berupa file CSV.

### Response Headers

```txt
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="sakuin-transactions-YYYY-MM-DD_HH-MM-SS.csv"
```

### Catatan

```txt
CSV hanya memuat transaksi user login.
CSV tidak boleh memuat data user lain.
```

---

## XLSX Export Response

Jika `format=xlsx`, response berupa file XLSX.

### Response Headers

```txt
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="sakuin-transactions-YYYY-MM-DD_HH-MM-SS.xlsx"
```

### Catatan

```txt
XLSX hanya memuat transaksi user login.
XLSX tidak boleh memuat data user lain.
```

---

## Validasi Export

```txt
format wajib json/csv/xlsx jika dikirim
type wajib INCOME/EXPENSE jika dikirim
startDate harus tanggal valid jika dikirim
endDate harus tanggal valid jika dikirim
endDate tidak boleh lebih awal dari startDate
```

### Error Format Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "format": [
        "Invalid enum value"
      ]
    }
  }
}
```

### Error Date Range Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "formErrors": [],
    "fieldErrors": {
      "endDate": [
        "endDate tidak boleh lebih awal dari startDate"
      ]
    }
  }
}
```

---

## Export Data Isolation

Aturan penting:

```txt
Export hanya boleh memuat data user login.
Filter categoryId milik user lain tidak boleh membocorkan transaksi user lain.
Summary export hanya menghitung transaksi user login.
CSV/XLSX tidak boleh memuat catatan, transaksi, atau custom category user lain.
```

---

## Audit Event

Jika export berhasil, backend mencatat audit event internal:

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

Audit event tidak menyimpan:

```txt
isi export
amount
note
category name
file content
token
raw query/body sensitif
```

---

# 9. AuditLog Internal Behavior

AuditLog bukan public API.

Tidak ada endpoint berikut:

```txt
GET /api/audit-logs
GET /api/audit-logs/:id
GET /api/security-events
```

AuditLog hanya berjalan sebagai internal persistence untuk business audit trail.

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

Business event yang dicatat:

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

AuditLog persistence:

```txt
Fail-open.
Jika gagal menyimpan audit event, endpoint utama tetap tidak langsung gagal.
```

Jika nanti ingin membuat AuditLog API:

```txt
[ ] Harus protected
[ ] Harus punya authorization policy
[ ] Harus pagination
[ ] Harus filter aman
[ ] Harus rate limited
[ ] Harus punya tests
[ ] Tidak boleh expose metadata sensitif
```

---

# 10. Error Reference

## 400 Validation Error

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

## 400 Business Rule Error

```json
{
  "success": false,
  "message": "Pesan business rule",
  "errors": null
}
```

Contoh:

```txt
Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi
Current amount tidak boleh lebih besar dari target amount
Kategori tidak bisa dihapus karena sudah digunakan oleh transaksi
Tipe kategori tidak bisa diubah karena kategori sudah digunakan oleh transaksi
```

## 401 Unauthorized

```json
{
  "success": false,
  "message": "Authorization header wajib diisi",
  "errors": null
}
```

```json
{
  "success": false,
  "message": "Format token harus Bearer token",
  "errors": null
}
```

```json
{
  "success": false,
  "message": "Token tidak valid atau sudah kedaluwarsa",
  "errors": null
}
```

## 404 Not Found

```json
{
  "success": false,
  "message": "Route tidak ditemukan",
  "errors": null
}
```

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

## 409 Conflict

```json
{
  "success": false,
  "message": "Email sudah digunakan",
  "errors": null
}
```

```json
{
  "success": false,
  "message": "Nama kategori sudah digunakan untuk tipe transaksi tersebut",
  "errors": null
}
```

## 413 Payload Too Large

```json
{
  "success": false,
  "message": "Ukuran request terlalu besar. Maksimal 1 MB.",
  "errors": null
}
```

## 429 Rate Limit

```json
{
  "success": false,
  "message": "Terlalu banyak request. Coba lagi nanti.",
  "errors": null
}
```

## 500 Internal Server Error

Production:

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": null
}
```

---

# 11. Validation and Regression

Backend validation commands:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Frontend validation commands:

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

Backend test status terakhir setelah database-backed audit trail:

```txt
Test Files : 17 passed
Tests      : 114 passed
Build      : passed
```

Jika hanya dokumentasi Markdown yang berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
git diff -- README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
```

---

# 12. Development Rules

Aturan untuk endpoint baru:

```txt
[ ] Tentukan apakah endpoint public atau protected
[ ] Jika protected, pakai authMiddleware
[ ] Jangan menerima userId dari frontend untuk ownership
[ ] Ambil userId dari JWT context
[ ] Tambahkan Zod schema untuk body/query/params
[ ] Tambahkan service-layer ownership check
[ ] Tambahkan test success
[ ] Tambahkan test validation error
[ ] Tambahkan test unauthorized
[ ] Tambahkan test cross-user access jika endpoint menyentuh data user
[ ] Tambahkan audit event jika endpoint melakukan business mutation penting
[ ] Pastikan audit metadata aman
[ ] Update dokumentasi API
```

Aturan untuk endpoint export/agregasi:

```txt
[ ] Query wajib dibatasi userId dari token
[ ] Test data isolation
[ ] Test filter dengan resource user lain
[ ] Jangan bocorkan data user lain di JSON/CSV/XLSX
[ ] Audit event hanya boleh menyimpan metadata aman
```

Aturan untuk audit/logging:

```txt
[ ] Jangan log password/token/Authorization header
[ ] Jangan log raw body
[ ] Jangan log transaction amount/note
[ ] Jangan log goal amount/name
[ ] Jangan log category name/icon/color value
[ ] Jangan log export content
[ ] Gunakan safe metadata sanitizer
[ ] Test redaction
[ ] Test fail-open behavior
```

---

# 13. Future API Roadmap

API yang belum ada dan perlu desain dahulu:

```txt
[ ] Google Login API
[ ] Gmail connect/disconnect API
[ ] Gmail sync API
[ ] Draft transaction API untuk hasil deteksi email/e-wallet
[ ] Budgeting per Category API
[ ] Recurring Transaction API
[ ] AuditLog viewer API
[ ] Account deletion/export privacy API
```

Catatan penting:

```txt
Google Login harus dipisahkan dari Gmail reading.
Gmail API tidak boleh dibuat sebelum security/privacy design matang.
AuditLog viewer API tidak boleh dibuat sebelum authorization policy jelas.
Budgeting per Category adalah kandidat fitur produk berikutnya setelah security documentation sync.
```