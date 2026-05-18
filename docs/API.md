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
Security     : Security headers, request body size limit, CORS allowlist, rate limiting, safer production error handling, data isolation tests
```

Catatan penting:

```txt
Dokumentasi ini hanya mencakup API yang sudah ada saat ini.
Quick Transaction / Catat Cepat adalah fitur frontend/parser yang menyimpan hasil final melalui endpoint transaksi biasa.
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
Contoh: token invalid, route tidak ditemukan, validasi gagal, data tidak ditemukan, atau rate limit exceeded.
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
email    wajib format email valid
password wajib memenuhi aturan minimal backend
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
      "safeBalanceLimit": "0"
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
        "Pesan validasi password"
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
      "safeBalanceLimit": "0"
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
    "safeBalanceLimit": "0"
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
name wajib diisi
safeBalanceLimit wajib berupa angka valid
safeBalanceLimit tidak boleh negatif
safeBalanceLimit disarankan berada pada rentang 0 sampai 1.000.000.000.000
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
icon  opsional
color opsional
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
type wajib INCOME atau EXPENSE
name tidak boleh duplikat untuk user dan type yang sama
icon opsional
color opsional
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

### Error Jika Default Category Diedit

```json
{
  "success": false,
  "message": "Kategori default tidak bisa diubah",
  "errors": null
}
```

### Error Jika Bukan Milik User

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan",
  "errors": null
}
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
    "name": "Transportasi Harian",
    "type": "EXPENSE",
    "icon": "bus",
    "color": "#0284c7",
    "isDefault": false
  }
}
```

### Error Jika Default Category Dihapus

```json
{
  "success": false,
  "message": "Kategori default tidak bisa dihapus",
  "errors": null
}
```

### Error Jika Category Masih Dipakai Transaksi

```json
{
  "success": false,
  "message": "Kategori masih digunakan oleh transaksi",
  "errors": null
}
```

### Catatan

```txt
Category yang sudah dipakai transaksi tidak boleh dihapus agar histori transaksi tetap valid.
```

---

# 5. Transactions API

Transaction adalah data pemasukan atau pengeluaran user.

Semua endpoint transaksi wajib user-isolated.

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

### Body Expense

```json
{
  "type": "EXPENSE",
  "amount": "250000",
  "categoryId": "cat_expense_food",
  "date": "2026-05-15T00:00:00.000Z",
  "note": "Makan siang"
}
```

### Body Income

```json
{
  "type": "INCOME",
  "amount": "3000000",
  "categoryId": "cat_income_salary",
  "date": "2026-05-15T00:00:00.000Z",
  "note": "Gaji"
}
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dibuat",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "250000",
    "note": "Makan siang",
    "date": "2026-05-15T00:00:00.000Z",
    "categoryId": "cat_expense_food",
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

### Validasi Amount

```txt
amount wajib diisi
amount harus angka positif
amount harus lebih dari 0
amount maksimal 1.000.000.000.000
amount maksimal 2 angka desimal
amount tidak boleh minus
amount tidak boleh format tidak valid
```

### Validasi Category

```txt
categoryId wajib diisi
category harus ada
category harus bisa dipakai user login
category type harus sama dengan transaction type
category INCOME hanya boleh untuk transaksi INCOME
category EXPENSE hanya boleh untuk transaksi EXPENSE
```

### Error Category Tidak Valid

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi",
  "errors": null
}
```

### Catatan Quick Transaction

```txt
Quick Transaction / Catat Cepat tidak memiliki endpoint khusus.
Frontend parser membuat draft transaksi.
Setelah user review dan approve, frontend menyimpan transaksi final melalui POST /api/transactions.
Jangan membuat endpoint auto-save untuk parser tanpa draft review.
```

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
page        optional, default 1
limit       optional, default 10, max 100
type        optional, INCOME | EXPENSE
categoryId  optional
search      optional
startDate   optional
endDate     optional
sort        optional, date_desc | date_asc | created_desc | created_asc
```

### Contoh Request

```txt
GET /api/transactions?page=1&limit=10
GET /api/transactions?page=1&limit=10&type=EXPENSE
GET /api/transactions?page=1&limit=20&categoryId=custom-category-id
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
        "amount": "250000",
        "note": "Makan siang",
        "date": "2026-05-15T00:00:00.000Z",
        "categoryId": "cat_expense_food",
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

### Catatan Pagination

```txt
page dimulai dari 1
limit maksimal 100
total adalah jumlah semua data sesuai filter
totalPages adalah jumlah halaman sesuai total dan limit
```

### Error Date Range Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "fieldErrors": {
      "endDate": [
        "endDate tidak boleh lebih awal dari startDate"
      ]
    }
  }
}
```

---

## GET `/api/transactions/:id`

Mengambil detail transaksi.

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
    "amount": "250000",
    "note": "Makan siang",
    "date": "2026-05-15T00:00:00.000Z",
    "categoryId": "cat_expense_food",
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

### Error Jika Tidak Ditemukan atau Bukan Milik User

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
```

---

## PUT `/api/transactions/:id`

Update transaksi.

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

Semua field opsional, tetapi minimal satu field harus dikirim.

```json
{
  "type": "EXPENSE",
  "amount": "300000",
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
    "amount": "300000",
    "note": "Makan malam",
    "date": "2026-05-16T00:00:00.000Z",
    "categoryId": "cat_expense_food",
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

### Validasi

```txt
Minimal satu field harus diisi
Validasi amount sama seperti create transaction
Jika type/categoryId berubah, category harus sesuai type transaksi
User hanya bisa update transaksi miliknya sendiri
```

---

## DELETE `/api/transactions/:id`

Hapus transaksi.

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
    "amount": "300000",
    "note": "Makan malam",
    "date": "2026-05-16T00:00:00.000Z",
    "categoryId": "cat_expense_food",
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

### Error Jika Tidak Ditemukan atau Bukan Milik User

```json
{
  "success": false,
  "message": "Transaksi tidak ditemukan",
  "errors": null
}
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
    "totalIncome": "3000000.00",
    "totalExpense": "250000.00",
    "balance": "2750000.00",
    "safeBalanceLimit": "500000.00",
    "isBelowSafeLimit": false,
    "incomeThisMonth": "3000000.00",
    "expenseThisMonth": "250000.00",
    "balanceThisMonth": "2750000.00",
    "transactionCount": 2,
    "recentTransactions": [
      {
        "id": "transaction-id",
        "type": "EXPENSE",
        "amount": "250000",
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
    "expenseByCategory": [
      {
        "categoryId": "cat_expense_food",
        "categoryName": "Makanan",
        "type": "EXPENSE",
        "totalAmount": "250000.00",
        "transactionCount": 1
      }
    ],
    "incomeByCategory": [
      {
        "categoryId": "cat_income_salary",
        "categoryName": "Gaji",
        "type": "INCOME",
        "totalAmount": "3000000.00",
        "transactionCount": 1
      }
    ],
    "monthlyTrend": [
      {
        "month": "2026-05",
        "income": "3000000.00",
        "expense": "250000.00",
        "balance": "2750000.00"
      }
    ]
  }
}
```

### Catatan

```txt
safeBalanceLimit berasal dari profile user
isBelowSafeLimit bernilai true jika balance < safeBalanceLimit
monthlyTrend berisi data 6 bulan terakhir
recentTransactions digunakan dashboard
expenseByCategory dan incomeByCategory digunakan untuk ringkasan kategori
summary wajib hanya menghitung data user login
```

---

# 7. Goals API

Goal digunakan untuk target tabungan user.

Semua endpoint goal wajib user-isolated.

---

## POST `/api/goals`

Membuat goal tabungan.

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
  "name": "Beli Laptop",
  "targetAmount": "10000000",
  "currentAmount": "2500000",
  "deadline": "2026-12-31T00:00:00.000Z",
  "description": "Laptop untuk kuliah dan kerja"
}
```

### Field

```txt
name          wajib
targetAmount  wajib, lebih dari 0
currentAmount optional, default 0
deadline      optional
description   optional
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dibuat",
  "data": {
    "id": "goal-id",
    "name": "Beli Laptop",
    "targetAmount": "10000000.00",
    "currentAmount": "2500000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "description": "Laptop untuk kuliah dan kerja",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Validasi

```txt
name wajib diisi
targetAmount harus lebih dari 0
currentAmount tidak boleh negatif
currentAmount tidak boleh lebih besar dari targetAmount
```

---

## GET `/api/goals`

Mengambil daftar goals user login.

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
      "name": "Beli Laptop",
      "targetAmount": "10000000.00",
      "currentAmount": "2500000.00",
      "deadline": "2026-12-31T00:00:00.000Z",
      "description": "Laptop untuk kuliah dan kerja",
      "createdAt": "2026-05-15T00:00:00.000Z",
      "updatedAt": "2026-05-15T00:00:00.000Z"
    }
  ]
}
```

---

## GET `/api/goals/:id`

Mengambil detail goal.

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
    "name": "Beli Laptop",
    "targetAmount": "10000000.00",
    "currentAmount": "2500000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "description": "Laptop untuk kuliah dan kerja",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-15T00:00:00.000Z"
  }
}
```

### Error Jika Tidak Ditemukan atau Bukan Milik User

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

---

## PUT `/api/goals/:id`

Update goal.

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

Semua field opsional, tetapi minimal satu field harus dikirim.

```json
{
  "name": "Beli Laptop Gaming",
  "targetAmount": "15000000",
  "currentAmount": "5000000",
  "deadline": "2026-12-31T00:00:00.000Z",
  "description": "Laptop gaming untuk kerja dan belajar"
}
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil diupdate",
  "data": {
    "id": "goal-id",
    "name": "Beli Laptop Gaming",
    "targetAmount": "15000000.00",
    "currentAmount": "5000000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "description": "Laptop gaming untuk kerja dan belajar",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

### Error Jika Current Amount Melebihi Target

```json
{
  "success": false,
  "message": "Current amount tidak boleh lebih besar dari target amount",
  "errors": null
}
```

### Error Jika Tidak Ditemukan atau Bukan Milik User

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

---

## DELETE `/api/goals/:id`

Hapus goal.

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
    "name": "Beli Laptop Gaming",
    "targetAmount": "15000000.00",
    "currentAmount": "5000000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "description": "Laptop gaming untuk kerja dan belajar",
    "createdAt": "2026-05-15T00:00:00.000Z",
    "updatedAt": "2026-05-16T00:00:00.000Z"
  }
}
```

### Error Jika Tidak Ditemukan atau Bukan Milik User

```json
{
  "success": false,
  "message": "Goal tidak ditemukan",
  "errors": null
}
```

---

# 8. Export API

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
format      optional, json | csv | xlsx, default json
type        optional, INCOME | EXPENSE
categoryId  optional
startDate   optional
endDate     optional
```

### Contoh Request

```txt
GET /api/export/transactions?format=json
GET /api/export/transactions?format=csv
GET /api/export/transactions?format=xlsx
GET /api/export/transactions?format=xlsx&type=EXPENSE
GET /api/export/transactions?format=csv&startDate=2026-05-01&endDate=2026-05-31
GET /api/export/transactions?format=json&categoryId=custom-category-id
```

### Catatan Security

```txt
Export wajib hanya memuat transaksi user login.
Export tidak boleh memuat transaksi user lain.
Jika categoryId milik user lain digunakan, export tidak boleh membocorkan data user lain.
```

---

## Export JSON

### Request

```txt
GET /api/export/transactions?format=json
```

### Response

```json
{
  "success": true,
  "message": "Export transaksi berhasil dibuat",
  "data": {
    "format": "json",
    "generatedAt": "2026-05-15T00:00:00.000Z",
    "filters": {
      "type": null,
      "categoryId": null,
      "startDate": null,
      "endDate": null
    },
    "transactions": [
      {
        "id": "transaction-id",
        "type": "EXPENSE",
        "amount": "250000",
        "note": "Makan siang",
        "date": "2026-05-15T00:00:00.000Z",
        "category": {
          "id": "cat_expense_food",
          "name": "Makanan",
          "type": "EXPENSE"
        },
        "createdAt": "2026-05-15T00:00:00.000Z",
        "updatedAt": "2026-05-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Export CSV

### Request

```txt
GET /api/export/transactions?format=csv
```

### Response

Response berupa file/blob CSV.

Frontend harus memakai download helper, bukan parser JSON biasa.

Contoh header response yang mungkin dikirim:

```txt
Content-Type: text/csv
Content-Disposition: attachment; filename="transactions.csv"
```

---

## Export XLSX

### Request

```txt
GET /api/export/transactions?format=xlsx
```

### Response

Response berupa file/blob XLSX.

Frontend harus memakai download helper, bukan parser JSON biasa.

Contoh header response yang mungkin dikirim:

```txt
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="transactions.xlsx"
```

---

## Error Format Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "fieldErrors": {
      "format": [
        "Format export tidak valid"
      ]
    }
  }
}
```

---

## Error Date Range Tidak Valid

```json
{
  "success": false,
  "message": "Validasi request gagal",
  "errors": {
    "fieldErrors": {
      "endDate": [
        "endDate tidak boleh lebih awal dari startDate"
      ]
    }
  }
}
```

---

# 9. API yang Belum Ada

Fitur berikut belum memiliki endpoint backend saat ini.

## Quick Transaction / Catat Cepat

Status:

```txt
Tidak ada endpoint khusus.
```

Alur saat ini:

```txt
1. User mengetik transaksi natural di frontend.
2. Parser rule-based frontend membuat draft.
3. User review/edit/hapus draft.
4. User approve.
5. Frontend menyimpan transaksi final lewat POST /api/transactions.
```

Prinsip:

```txt
Jangan auto-save hasil parser tanpa review user.
```

---

## Google Login

Status:

```txt
Belum diimplementasikan.
```

Catatan:

```txt
Google Login hanya untuk authentication.
Google Login tidak sama dengan Gmail API.
Jika dibuat, scope awal harus openid, email, profile.
Jangan meminta Gmail scope hanya untuk login.
```

---

## Gmail / E-wallet / Mobile Banking Detection

Status:

```txt
Belum diimplementasikan.
```

Prinsip sebelum implementasi:

```txt
[ ] Buat security/privacy documentation
[ ] Buat architecture design
[ ] Tentukan OAuth/consent flow
[ ] Tentukan scope minimal
[ ] Tentukan token encryption strategy
[ ] Tentukan disconnect/revoke flow
[ ] Tentukan draft-first transaction review flow
[ ] Jangan simpan raw email
[ ] Jangan auto-save transaksi final
```

---

# 10. Frontend Integration Notes

Frontend Sakuin memakai:

```txt
apiRequest  : request JSON API
apiDownload : request file/blob API
```

Gunakan `apiRequest` untuk:

```txt
GET /api/auth/me
GET /api/users/profile
PATCH /api/users/profile
GET /api/categories
POST /api/categories
PUT /api/categories/:id
DELETE /api/categories/:id
GET /api/transactions
POST /api/transactions
GET /api/transactions/:id
PUT /api/transactions/:id
DELETE /api/transactions/:id
GET /api/summary
GET /api/goals
POST /api/goals
GET /api/goals/:id
PUT /api/goals/:id
DELETE /api/goals/:id
```

Gunakan `apiDownload` untuk:

```txt
GET /api/export/transactions?format=csv
GET /api/export/transactions?format=xlsx
```

Untuk export JSON, frontend dapat memakai JSON request biasa atau download flow sesuai implementasi frontend saat ini.

---

# 11. Caching dan Invalidation Notes

Frontend Sakuin memakai TanStack Query.

Query key utama:

```txt
summary
profile
categories
goals
transactions
```

Invalidation yang perlu dilakukan setelah mutation:

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
- remove auth token
```

Catatan:

```txt
Jangan mengganti query key sembarangan karena dipakai lintas fitur.
Jika API response shape berubah, update frontend types dan tests.
```

---

# 12. Manual API Testing Notes

Urutan testing API manual yang disarankan:

```txt
1. GET /health
2. GET /api/health
3. POST /api/auth/register
4. POST /api/auth/login
5. Simpan token dari login
6. GET /api/auth/me dengan Bearer token
7. GET /api/categories
8. POST /api/categories
9. POST /api/transactions
10. GET /api/transactions
11. GET /api/summary
12. POST /api/goals
13. GET /api/goals
14. GET /api/export/transactions?format=json
15. GET /api/export/transactions?format=csv
16. GET /api/export/transactions?format=xlsx
```

Header umum untuk protected endpoint:

```txt
Authorization: Bearer <token>
Content-Type: application/json
```

Untuk export file, response dapat berupa blob/file sehingga tidak selalu JSON.

---

# 13. Security Testing Notes

Minimal security check setelah perubahan backend:

```txt
[ ] GET /health tetap sukses
[ ] GET /api/health tetap sukses
[ ] Login tetap sukses
[ ] Protected endpoint tanpa token tetap 401
[ ] Protected endpoint dengan token invalid tetap 401
[ ] Authorization header format salah tetap ditolak
[ ] Request body besar mengembalikan 413
[ ] Response production error 500 tidak membocorkan detail error
[ ] Header security muncul pada response API
[ ] CORS tidak memantulkan origin asing
[ ] Login rate limit bekerja
[ ] Register rate limit bekerja
[ ] General API rate limit bekerja
[ ] Summary tidak menghitung data user lain
[ ] Export tidak memuat data user lain
```

Header yang bisa dicek di browser devtools, Postman, Insomnia, atau curl:

```txt
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
Permissions-Policy
Content-Security-Policy
X-Permitted-Cross-Domain-Policies
Strict-Transport-Security pada production
```

---

# 14. Backend Validation Summary

Validasi penting backend:

```txt
[✓] Register email unik
[✓] Login password valid
[✓] Login email invalid ditolak sebelum auth service
[✓] JWT required untuk protected endpoint
[✓] JWT payload harus valid
[✓] userId token harus string
[✓] User yang sudah dihapus tidak bisa memakai token lama untuk profile
[✓] User hanya bisa membaca/mengubah data miliknya sendiri
[✓] Transaction amount > 0
[✓] Transaction amount maksimal 1.000.000.000.000
[✓] Transaction amount maksimal 2 angka desimal
[✓] Category harus sesuai type transaksi
[✓] Category harus default atau milik user login
[✓] Goal currentAmount tidak boleh lebih besar dari targetAmount
[✓] Export date range valid
[✓] Profile safeBalanceLimit tidak boleh negatif
[✓] Request body size limit aktif
[✓] Production error handling lebih aman
[✓] Rate limiting aktif
```

---

# 15. Backend Status

Status backend terakhir yang diharapkan sebelum push/release:

```txt
Typecheck : passed
Build     : passed
Tests     : passed
```

Command validasi backend:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Command validasi frontend terkait integrasi API:

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

---

# 16. Documentation Finalization

Setelah update `docs/API.md`, cek diff:

```bash
git status
git diff -- README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
```

Jika hanya Markdown yang berubah, jalankan minimal:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
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

Setelah validasi aman:

```bash
git status
git add README.md docs/SECURITY.md docs/HANDOFF.md docs/API.md
git commit -m "Update documentation for security hardening"
git push
```

Setelah push:

```txt
[ ] Cek GitHub Actions CI
[ ] Cek Vercel deployment
[ ] Cek production /health
[ ] Cek production /api/health
[ ] Cek production smoke test singkat jika perlu
```

Catatan:

```txt
Tidak perlu membuat tag baru hanya untuk update dokumentasi, kecuali diputuskan sebagai release milestone.
```