# Sakuin API Documentation

Dokumentasi ini menjelaskan endpoint backend Sakuin untuk kebutuhan frontend, testing API, maintenance, dan pengembangan lanjutan.

Backend Sakuin digunakan oleh web app production:

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
Database : Supabase PostgreSQL
```

---

## Tech Stack Backend

```txt
Runtime       : Node.js
Framework     : Hono
Language      : TypeScript
ORM           : Prisma
Database      : PostgreSQL / Supabase PostgreSQL
Validation    : Zod
Auth          : JWT Bearer Token
Password Hash : bcryptjs
Google Login  : Google ID Token Verification
Email Sender  : Gmail SMTP / Nodemailer
Export        : JSON, CSV, XLSX
AI Provider   : Gemini API via backend only
Test          : Vitest
```

Security baseline backend:

```txt
[✓] JWT Bearer Token authentication
[✓] Google Login via verified Google ID token
[✓] Password reset dengan hashed reset token
[✓] Gmail SMTP email sender untuk reset password
[✓] Zod request validation
[✓] Prisma ORM
[✓] Ownership/data isolation
[✓] CORS allowlist
[✓] Security headers
[✓] Request body size limit
[✓] Rate limiting
[✓] Request ID
[✓] Safe request logging
[✓] Safe security event logging
[✓] Database-backed AuditLog
[✓] Production error masking
[✓] AI financial-only guardrail
[✓] AI transaction draft no auto-save
[✓] AI transaction draft rule-based tanpa Gemini
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

---

## Standard Response Format

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

Pada production, error internal tidak membocorkan detail mentah.

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": null
}
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
```

---

## Authentication

Sakuin memakai JWT Bearer Token.

Endpoint protected wajib mengirim header:

```txt
Authorization: Bearer <token>
```

Frontend tidak perlu mengirim `userId`.

Backend mengambil identitas user dari token.

---

## Public Endpoints

Endpoint berikut tidak membutuhkan token:

```txt
GET  /health
GET  /api/health

POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/reset-password
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

POST   /api/ai/chat
```

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
    "timestamp": "2026-05-21T00:00:00.000Z"
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
    "timestamp": "2026-05-21T00:00:00.000Z"
  }
}
```

---

# 2. Auth API

## POST `/api/auth/register`

Register user baru menggunakan email dan password.

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
email    dinormalisasi lowercase
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

### Catatan

```txt
passwordHash tidak pernah dikirim ke frontend.
Password disimpan dalam bentuk hash menggunakan bcryptjs.
Register terkena rate limit.
```

---

## POST `/api/auth/login`

Login user menggunakan email dan password.

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

### Catatan

```txt
Login error dibuat generic agar tidak mudah dipakai untuk user enumeration.
Login terkena rate limit.
Failed login dicatat sebagai safe security event tanpa password/email mentah.
User Google-only yang belum punya passwordHash tidak bisa login password biasa sampai membuat password melalui reset password.
```

---

## POST `/api/auth/google`

Login atau register menggunakan akun Google.

### Auth

Tidak perlu token.

### Body

```json
{
  "credential": "google-id-token"
}
```

### Response

```json
{
  "success": true,
  "message": "Login Google berhasil",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "Google User",
      "email": "user@gmail.com",
      "safeBalanceLimit": 0
    }
  }
}
```

### Behavior

```txt
[✓] Backend menerima Google ID token dari frontend.
[✓] Backend memverifikasi token menggunakan Google Auth Library.
[✓] Backend memastikan Google email sudah verified.
[✓] Jika OAuthAccount sudah ada, backend login ke user terkait.
[✓] Jika email Google sama dengan user email/password existing, backend menautkan OAuthAccount ke user tersebut.
[✓] Jika user belum ada, backend membuat user baru dengan passwordHash null.
[✓] Backend tidak menyimpan Google access token.
[✓] Backend tidak menyimpan Google refresh token.
[✓] Backend tidak meminta Gmail scope.
```

### Error Google Credential Invalid

```json
{
  "success": false,
  "message": "Google credential tidak valid",
  "errors": null
}
```

### Error Google Email Belum Verified

```json
{
  "success": false,
  "message": "Google email belum terverifikasi",
  "errors": null
}
```

### Error Google Login Belum Dikonfigurasi

```json
{
  "success": false,
  "message": "Google Login belum dikonfigurasi",
  "errors": null
}
```

### Environment

Backend:

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Frontend:

```env
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## POST `/api/auth/forgot-password`

Meminta link reset password.

### Auth

Tidak perlu token.

### Body

```json
{
  "email": "rizal@example.com"
}
```

### Response

Response selalu generic untuk mencegah user enumeration.

```json
{
  "success": true,
  "message": "Jika email terdaftar, link reset password akan dikirim.",
  "data": null
}
```

### Behavior

```txt
[✓] Email dinormalisasi lowercase.
[✓] Jika email tidak terdaftar, backend tetap mengembalikan response generic.
[✓] Jika email terdaftar, backend membuat reset token random.
[✓] Token asli hanya dikirim melalui email.
[✓] Database hanya menyimpan hash token.
[✓] Reset token memiliki expiry.
[✓] Email dikirim menggunakan Gmail SMTP / Nodemailer.
[✓] Backend tidak mengirim reset token melalui response API.
[✓] Backend tidak mencatat reset token di log.
```

### Catatan Email Delivery

Email reset password dapat masuk ke:

```txt
Inbox
Spam
Promotions
Social
Updates
All Mail
```

Frontend menampilkan instruksi agar user mengecek folder tersebut.

---

## POST `/api/auth/reset-password`

Reset password menggunakan token dari email.

### Auth

Tidak perlu token.

### Body

```json
{
  "token": "reset-token-from-email",
  "password": "NewPassword123"
}
```

### Validasi

```txt
token    wajib diisi
password minimal 8 karakter
password harus mengandung angka
```

### Response

```json
{
  "success": true,
  "message": "Password berhasil direset",
  "data": null
}
```

### Behavior

```txt
[✓] Backend meng-hash token dari request.
[✓] Backend mencari user berdasarkan hash token.
[✓] Token harus belum expired.
[✓] Jika valid, backend meng-hash password baru.
[✓] passwordHash user diperbarui.
[✓] resetPasswordToken dihapus.
[✓] resetPasswordExpires dihapus.
[✓] Token tidak bisa dipakai ulang.
[✓] User Google-only dapat membuat password Sakuin melalui reset password.
```

### Error Token Invalid atau Expired

```json
{
  "success": false,
  "message": "Token reset password tidak valid atau sudah kedaluwarsa",
  "errors": null
}
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
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
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
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
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
safeBalanceLimit maksimal 1.000.000.000.000
```

### Audit Event

```txt
profile.updated
```

Audit metadata hanya menyimpan field aman seperti:

```txt
changedFields
```

---

# 4. Categories API

Category digunakan untuk mengelompokkan transaksi.

Sakuin memiliki dua jenis kategori:

```txt
Default category : kategori bawaan sistem, userId null, isDefault true
Custom category  : kategori buatan user, userId dari token, isDefault false
```

---

## GET `/api/categories`

Mengambil daftar kategori yang bisa dipakai user login.

### Auth

Wajib token.

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
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true,
      "createdAt": "2026-05-21T00:00:00.000Z",
      "updatedAt": "2026-05-21T00:00:00.000Z"
    }
  ]
}
```

---

## POST `/api/categories`

Membuat custom category.

### Auth

Wajib token.

### Body

```json
{
  "name": "Kopi",
  "type": "EXPENSE",
  "icon": "coffee",
  "color": "#92400e"
}
```

### Validasi

```txt
name wajib diisi
name maksimal 50 karakter
type wajib INCOME atau EXPENSE
icon optional, maksimal 50 karakter
color optional, maksimal 30 karakter
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil dibuat",
  "data": {
    "id": "category-id",
    "name": "Kopi",
    "type": "EXPENSE",
    "icon": "coffee",
    "color": "#92400e",
    "isDefault": false,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
category.created
```

---

## PUT `/api/categories/:id`

Update custom category milik user login.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Body

Minimal satu field wajib dikirim.

```json
{
  "name": "Kopi Harian",
  "type": "EXPENSE",
  "icon": "coffee",
  "color": "#78350f"
}
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil diupdate",
  "data": {
    "id": "category-id",
    "name": "Kopi Harian",
    "type": "EXPENSE",
    "icon": "coffee",
    "color": "#78350f",
    "isDefault": false,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
category.updated
```

---

## DELETE `/api/categories/:id`

Hapus custom category milik user login.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Response

```json
{
  "success": true,
  "message": "Kategori berhasil dihapus",
  "data": {
    "id": "category-id",
    "name": "Kopi Harian",
    "type": "EXPENSE",
    "icon": "coffee",
    "color": "#78350f",
    "isDefault": false,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Error

```txt
Default category tidak bisa dihapus.
Category yang sudah dipakai transaksi tidak bisa dihapus.
Category milik user lain tidak bisa diakses.
```

### Audit Event

```txt
category.deleted
```

---

# 5. Transactions API

## GET `/api/transactions`

Mengambil daftar transaksi user login.

### Auth

Wajib token.

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
GET /api/transactions?page=1&limit=10
GET /api/transactions?type=EXPENSE
GET /api/transactions?search=makan
GET /api/transactions?startDate=2026-05-01&endDate=2026-05-31
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
        "amount": "15000.00",
        "note": "makan siang",
        "date": "2026-05-21T00:00:00.000Z",
        "category": {
          "id": "category-id",
          "name": "Makan",
          "type": "EXPENSE",
          "icon": "utensils",
          "color": "#ef4444",
          "isDefault": true
        },
        "createdAt": "2026-05-21T00:00:00.000Z",
        "updatedAt": "2026-05-21T00:00:00.000Z"
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

---

## POST `/api/transactions`

Membuat transaksi baru.

### Auth

Wajib token.

### Body

```json
{
  "type": "EXPENSE",
  "amount": "15000",
  "categoryId": "category-id",
  "date": "2026-05-21",
  "note": "makan siang"
}
```

### Validasi Amount

```txt
Minimal  : lebih dari 0
Maksimal : 1.000.000.000.000
Maksimal 2 angka desimal
Tidak boleh minus
Tidak boleh 0
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dibuat",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "15000.00",
    "note": "makan siang",
    "date": "2026-05-21T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
transaction.created
```

---

## GET `/api/transactions/:id`

Mengambil detail transaksi.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Response

```json
{
  "success": true,
  "message": "Detail transaksi berhasil diambil",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "15000.00",
    "note": "makan siang",
    "date": "2026-05-21T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Error

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

### Params

```txt
id wajib diisi
```

### Body

Minimal satu field wajib dikirim.

```json
{
  "type": "EXPENSE",
  "amount": "20000",
  "categoryId": "category-id",
  "date": "2026-05-21",
  "note": "makan malam"
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
    "amount": "20000.00",
    "note": "makan malam",
    "date": "2026-05-21T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
transaction.updated
```

---

## DELETE `/api/transactions/:id`

Hapus transaksi milik user login.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus",
  "data": {
    "id": "transaction-id"
  }
}
```

### Audit Event

```txt
transaction.deleted
```

---

# 6. Summary API

## GET `/api/summary`

Mengambil ringkasan keuangan user login.

### Auth

Wajib token.

### Query Params

```txt
month optional, format YYYY-MM
```

### Contoh Request

```txt
GET /api/summary
GET /api/summary?month=2026-05
```

### Response

```json
{
  "success": true,
  "message": "Summary berhasil diambil",
  "data": {
    "totalIncome": "5000000.00",
    "totalExpense": "1500000.00",
    "balance": "3500000.00",
    "safeBalanceLimit": "500000.00",
    "transactionCount": 24,
    "recentTransactions": [
      {
        "id": "transaction-id",
        "type": "EXPENSE",
        "amount": "15000.00",
        "note": "makan siang",
        "date": "2026-05-21T00:00:00.000Z",
        "category": {
          "id": "category-id",
          "name": "Makan",
          "type": "EXPENSE",
          "icon": "utensils",
          "color": "#ef4444",
          "isDefault": true
        }
      }
    ],
    "categoryBreakdown": [
      {
        "categoryId": "category-id",
        "categoryName": "Makan",
        "type": "EXPENSE",
        "amount": "300000.00",
        "percentage": 20
      }
    ],
    "monthlyTrend": [
      {
        "month": "2026-05",
        "income": "5000000.00",
        "expense": "1500000.00"
      }
    ]
  }
}
```

### Data Isolation

```txt
Summary hanya menghitung data milik user login.
Summary tidak boleh menghitung transaksi user lain.
Category breakdown tidak boleh memuat custom category user lain.
Recent transactions tidak boleh memuat transaksi user lain.
```

---

# 7. Goals API

## GET `/api/goals`

Mengambil daftar goals user login.

### Auth

Wajib token.

### Response

```json
{
  "success": true,
  "message": "Daftar goal berhasil diambil",
  "data": [
    {
      "id": "goal-id",
      "name": "Dana Darurat",
      "targetAmount": "5000000.00",
      "currentAmount": "2000000.00",
      "deadline": "2026-12-31T00:00:00.000Z",
      "isPriority": true,
      "createdAt": "2026-05-21T00:00:00.000Z",
      "updatedAt": "2026-05-21T00:00:00.000Z"
    }
  ]
}
```

---

## POST `/api/goals`

Membuat goal baru.

### Auth

Wajib token.

### Body

```json
{
  "name": "Dana Darurat",
  "targetAmount": "5000000",
  "currentAmount": "1000000",
  "deadline": "2026-12-31"
}
```

### Validasi

```txt
name wajib diisi
name maksimal 100 karakter
targetAmount wajib lebih dari 0
currentAmount optional, default 0
currentAmount tidak boleh negatif
deadline optional, format tanggal valid
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dibuat",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat",
    "targetAmount": "5000000.00",
    "currentAmount": "1000000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "isPriority": false,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
goal.created
```

---

## GET `/api/goals/:id`

Mengambil detail goal.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Response

```json
{
  "success": true,
  "message": "Detail goal berhasil diambil",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat",
    "targetAmount": "5000000.00",
    "currentAmount": "1000000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "isPriority": false,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

---

## PUT `/api/goals/:id`

Update goal milik user login.

### Auth

Wajib token.

### Body

Minimal satu field wajib dikirim.

```json
{
  "name": "Dana Darurat Updated",
  "targetAmount": "7000000",
  "currentAmount": "2500000",
  "deadline": "2026-12-31",
  "isPriority": true
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
    "targetAmount": "7000000.00",
    "currentAmount": "2500000.00",
    "deadline": "2026-12-31T00:00:00.000Z",
    "isPriority": true,
    "createdAt": "2026-05-21T00:00:00.000Z",
    "updatedAt": "2026-05-21T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
goal.updated
```

---

## DELETE `/api/goals/:id`

Hapus goal milik user login.

### Auth

Wajib token.

### Params

```txt
id wajib diisi
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dihapus",
  "data": {
    "id": "goal-id"
  }
}
```

### Audit Event

```txt
goal.deleted
```

---

# 8. Export API

## GET `/api/export/transactions`

Export transaksi user login ke JSON, CSV, atau XLSX.

### Auth

Wajib token.

### Query Params

```txt
format     optional, json | csv | xlsx, default json
type       optional, INCOME | EXPENSE
categoryId optional
startDate  optional
endDate    optional
filename   optional
```

### Contoh Request

```txt
GET /api/export/transactions?format=json
GET /api/export/transactions?format=csv&type=EXPENSE
GET /api/export/transactions?format=xlsx&startDate=2026-05-01&endDate=2026-05-31
```

### Response JSON

```json
{
  "success": true,
  "message": "Export transaksi berhasil",
  "data": [
    {
      "id": "transaction-id",
      "type": "EXPENSE",
      "amount": "15000.00",
      "note": "makan siang",
      "date": "2026-05-21T00:00:00.000Z",
      "category": {
        "id": "category-id",
        "name": "Makan",
        "type": "EXPENSE",
        "icon": "utensils",
        "color": "#ef4444",
        "isDefault": true
      }
    }
  ]
}
```

### Response CSV/XLSX

```txt
Response berupa downloadable file.
Frontend memakai auth download flow standar.
```

### Data Isolation

```txt
Export hanya memuat transaksi milik user login.
Export tidak boleh menerima userId dari frontend.
Export filter categoryId milik user lain tidak boleh membocorkan data.
Export content tidak boleh dicatat di log.
Export content tidak boleh masuk audit metadata.
```

### Audit Event

```txt
export.transactions_generated
```

Audit metadata hanya menyimpan informasi aman seperti:

```txt
format
typeFilter
hasCategoryFilter
hasDateRange
```

---

# 9. AI API

## POST `/api/ai/chat`

Endpoint chat utama untuk **Asisten Sakuin**.

Endpoint ini digunakan frontend `/asisten` untuk:

```txt
[✓] menjawab ringkasan keuangan user
[✓] menganalisis pengeluaran
[✓] menganalisis pemasukan
[✓] membandingkan periode
[✓] memberi saran hemat ringan
[✓] menganalisis goals
[✓] menganalisis skenario finansial sederhana
[✓] membuat draft transaksi dari chat natural
[✓] membuat banyak draft transaksi dari satu prompt
[✓] menolak pertanyaan di luar finansial Sakuin
```

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
  "message": "pengeluaran saya bulan ini gimana?",
  "history": [
    {
      "role": "user",
      "content": "goal saya gimana?"
    },
    {
      "role": "assistant",
      "content": "Goal kamu masih berjalan..."
    }
  ]
}
```

### Body Fields

```txt
message wajib diisi
message maksimal sesuai validasi backend
history optional
history hanya berisi role user atau assistant
history dipakai untuk follow-up context
```

### Supported Intents

```txt
FINANCIAL_SUMMARY
SPENDING_ANALYSIS
INCOME_ANALYSIS
PERIOD_COMPARISON
SAVING_ADVICE
GOAL_ANALYSIS
TRANSACTION_DRAFT
OUT_OF_SCOPE
```

---

## General AI Response

### Response

```json
{
  "success": true,
  "message": "AI chat berhasil",
  "data": {
    "reply": "Pengeluaranmu bulan ini Rp500.000 dari 24 transaksi.",
    "intent": "SPENDING_ANALYSIS",
    "cards": [
      {
        "label": "Total Pengeluaran",
        "value": "Rp500.000"
      },
      {
        "label": "Kategori Terbesar",
        "value": "Makanan"
      }
    ],
    "suggestions": [
      "Bandingkan bulan lalu",
      "Lihat kategori terbesar",
      "Buat saran hemat"
    ]
  }
}
```

### Data Policy

```txt
Backend tidak boleh mengirim semua transaksi mentah ke AI provider.
Backend hanya boleh mengirim financial context teragregasi dan aman.
Backend tidak boleh mengirim email, token, password, Authorization header, raw request body, requestId, credential Google, SMTP secret, atau data user lain.
```

---

## Out-of-Scope Response

Jika user bertanya di luar topik keuangan Sakuin:

```txt
buatkan cerpen
siapa istri Naruto?
buatkan kode React
jelaskan sejarah Majapahit
```

### Response

```json
{
  "success": true,
  "message": "AI chat berhasil",
  "data": {
    "reply": "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.",
    "intent": "OUT_OF_SCOPE",
    "cards": [],
    "suggestions": [
      "Pengeluaran bulan ini gimana?",
      "Saya boros di mana?",
      "Target tabungan saya realistis?"
    ]
  }
}
```

### Behavior

```txt
Out-of-scope tidak boleh memanggil Gemini.
Out-of-scope harus diproses murah dan aman.
```

---

## Financial Scenario Response

Contoh request:

```json
{
  "message": "gaji saya 8 juta ingin beli motor 30 juta, realistis nggak?"
}
```

### Expected Behavior

```txt
[✓] Asisten memberi verdict.
[✓] Asisten menghitung kebutuhan per bulan jika ada tenor/deadline.
[✓] Asisten membandingkan dengan pemasukan jika user memberi pemasukan.
[✓] Asisten memberi risiko utama.
[✓] Asisten menjelaskan jika bunga/biaya tambahan belum dihitung.
[✓] Asisten tidak memberi keputusan finansial profesional.
```

### Response Example

```json
{
  "success": true,
  "message": "AI chat berhasil",
  "data": {
    "reply": "Cukup realistis jika targetnya dibuat bertahap, tetapi tetap perlu dijaga. Jika harga motor Rp30.000.000 dan pemasukan Rp8.000.000 per bulan, kamu perlu menentukan tenor atau target bulan agar bisa dihitung lebih presisi. Catatan: simulasi ini belum memasukkan bunga, biaya admin, asuransi, atau biaya tambahan lain.",
    "intent": "GOAL_ANALYSIS",
    "cards": [
      {
        "label": "Pemasukan",
        "value": "Rp8.000.000"
      },
      {
        "label": "Target",
        "value": "Rp30.000.000"
      }
    ],
    "suggestions": [
      "Kalau 8 bulan gimana?",
      "Kalau 12 bulan gimana?",
      "Cek goal saya"
    ]
  }
}
```

---

## Single Transaction Draft Response

Contoh request:

```json
{
  "message": "catat makan ayam geprek 15000"
}
```

### Response

```json
{
  "success": true,
  "message": "AI chat berhasil",
  "data": {
    "reply": "Saya membuat 1 draft transaksi. Silakan review dulu sebelum disimpan.",
    "intent": "TRANSACTION_DRAFT",
    "cards": [
      {
        "label": "Jumlah draft",
        "value": "1"
      },
      {
        "label": "Siap disimpan",
        "value": "1"
      }
    ],
    "suggestions": [
      "Catat transaksi lain",
      "Lihat pengeluaran bulan ini"
    ],
    "transactionDraft": {
      "type": "EXPENSE",
      "amount": "15000",
      "categoryId": "category-id",
      "categoryName": "Makanan",
      "note": "ayam geprek",
      "date": "2026-05-21",
      "confidence": "high",
      "missingFields": [],
      "warnings": []
    },
    "transactionDrafts": [
      {
        "type": "EXPENSE",
        "amount": "15000",
        "categoryId": "category-id",
        "categoryName": "Makanan",
        "note": "ayam geprek",
        "date": "2026-05-21",
        "confidence": "high",
        "missingFields": [],
        "warnings": []
      }
    ]
  }
}
```

### Behavior

```txt
transactionDraft tetap tersedia sebagai draft pertama untuk backward compatibility.
transactionDrafts tetap dikirim sebagai array agar frontend bisa memakai struktur yang sama untuk single dan multi draft.
AI tidak menyimpan transaksi secara otomatis.
User harus klik Simpan Draft di frontend.
```

---

## Multi Transaction Draft Response

Contoh request:

```json
{
  "message": "catat makan 12000 minum 4000 cimol 4000 cireng 5000"
}
```

### Response

```json
{
  "success": true,
  "message": "AI chat berhasil",
  "data": {
    "reply": "Saya menemukan 4 draft transaksi. Silakan review dulu sebelum disimpan.",
    "intent": "TRANSACTION_DRAFT",
    "cards": [
      {
        "label": "Jumlah draft",
        "value": "4"
      },
      {
        "label": "Siap disimpan",
        "value": "4"
      },
      {
        "label": "Total nominal",
        "value": "Rp25.000"
      }
    ],
    "suggestions": [
      "Catat transaksi lain",
      "Lihat pengeluaran bulan ini"
    ],
    "transactionDraft": {
      "type": "EXPENSE",
      "amount": "12000",
      "categoryId": "category-id",
      "categoryName": "Makanan",
      "note": "makan",
      "date": "2026-05-21",
      "confidence": "high",
      "missingFields": [],
      "warnings": []
    },
    "transactionDrafts": [
      {
        "type": "EXPENSE",
        "amount": "12000",
        "categoryId": "category-id",
        "categoryName": "Makanan",
        "note": "makan",
        "date": "2026-05-21",
        "confidence": "high",
        "missingFields": [],
        "warnings": []
      },
      {
        "type": "EXPENSE",
        "amount": "4000",
        "categoryId": "category-id",
        "categoryName": "Minuman",
        "note": "minum",
        "date": "2026-05-21",
        "confidence": "high",
        "missingFields": [],
        "warnings": []
      },
      {
        "type": "EXPENSE",
        "amount": "4000",
        "categoryId": "category-id",
        "categoryName": "Makanan",
        "note": "cimol",
        "date": "2026-05-21",
        "confidence": "high",
        "missingFields": [],
        "warnings": []
      },
      {
        "type": "EXPENSE",
        "amount": "5000",
        "categoryId": "category-id",
        "categoryName": "Makanan",
        "note": "cireng",
        "date": "2026-05-21",
        "confidence": "high",
        "missingFields": [],
        "warnings": []
      }
    ]
  }
}
```

### Behavior

```txt
Backend membuat banyak draft dari satu prompt jika pola nominal berulang terdeteksi.
Backend tetap mengisi transactionDraft sebagai draft pertama.
Backend mengisi transactionDrafts sebagai array semua draft.
Backend tidak auto-save.
Backend tidak memanggil Gemini untuk transaction draft.
Frontend menyediakan Simpan Draft, Batalkan Draft, dan Simpan Semua Draft.
```

---

## Transaction Draft Object

```ts
type AiTransactionDraft = {
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  date: string;
  confidence: "low" | "medium" | "high";
  missingFields: string[];
  warnings: string[];
};
```

### Field Notes

```txt
type          tipe transaksi
amount        nominal dalam string numerik
categoryId    id kategori jika berhasil dideteksi
categoryName  nama kategori untuk UI
note          catatan transaksi yang aman ditampilkan ke user
date          format YYYY-MM-DD
confidence    tingkat keyakinan parser
missingFields field yang belum lengkap
warnings      peringatan untuk user
```

---

## AI Chat Response Type

```ts
type AiChatResponse = {
  reply: string;
  intent:
    | "FINANCIAL_SUMMARY"
    | "SPENDING_ANALYSIS"
    | "INCOME_ANALYSIS"
    | "PERIOD_COMPARISON"
    | "SAVING_ADVICE"
    | "GOAL_ANALYSIS"
    | "TRANSACTION_DRAFT"
    | "OUT_OF_SCOPE";
  cards: {
    label: string;
    value: string;
  }[];
  suggestions: string[];
  transactionDraft?: AiTransactionDraft;
  transactionDrafts?: AiTransactionDraft[];
};
```

---

## AI Frontend UX Contract

Frontend `/asisten` harus mengikuti aturan:

```txt
[✓] Render reply sebagai assistant bubble.
[✓] Render cards jika tersedia.
[✓] Render suggestions jika tersedia.
[✓] Filter suggestion action palsu seperti "Simpan semua".
[✓] Render transactionDraft untuk backward compatibility.
[✓] Render transactionDrafts jika tersedia.
[✓] Gunakan transactionDrafts sebagai sumber utama multi draft.
[✓] Simpan Draft memakai POST /api/transactions.
[✓] Simpan Semua Draft menyimpan beberapa draft secara parallel melalui POST /api/transactions.
[✓] Batalkan Draft hanya mengubah state lokal.
[✓] Draft yang dibatalkan tidak bisa disimpan.
[✓] Draft yang sudah disimpan tidak bisa disimpan ulang.
[✓] No auto-scroll saat save/cancel/save all.
[✓] Typewriter effect tidak boleh memaksa scroll user.
```

Frontend menyimpan state lokal:

```txt
sakuin_ai_chat_history_v1:<userId>
sakuin_ai_saved_draft_ids_v1:<userId>
sakuin_ai_cancelled_draft_ids_v1:<userId>
```

State saved/cancelled per draft memakai key:

```txt
${message.id}:${draftIndex}
```

---

## AI Security Notes

```txt
Frontend tidak boleh memanggil Gemini.
Frontend tidak boleh menerima GEMINI_API_KEY.
Out-of-scope tidak boleh memanggil Gemini.
Transaction draft tidak boleh memanggil Gemini.
Transaction draft harus rule-based.
AI tidak boleh auto-save transaksi.
AI tidak boleh mengarang data transaksi, goals, saldo, atau kategori.
AI tidak boleh mencampur data user lain.
AI financial context harus user-only dan teragregasi.
```

---

# 10. Rate Limiting

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

---

# 11. Logging and Audit

Backend memiliki safe request logging, safe security event logging, dan database-backed audit trail.

## Safe Request Log

Boleh log:

```txt
requestId
method
path
status
durationMs
timestamp
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

---

## Security Events

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

AI candidate events:

```txt
ai.chat_requested
ai.chat_completed
ai.chat_failed
ai.out_of_scope_blocked
ai.transaction_draft_generated
ai.provider_used
ai.provider_fallback
```

---

## Business Audit Events

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

# 12. Environment Variables

## Backend Required

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="minimum_32_characters_secret"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

---

## Google Login

Backend:

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Frontend:

```env
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## Gmail SMTP / Nodemailer

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
Email reset password dapat masuk ke Spam/Promotions, sehingga frontend memberi instruksi kepada user untuk mengecek folder tersebut.
```

---

## AI / Gemini

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

---

## Frontend Required

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

---

## CI Database Safety

CI harus memakai database test, bukan production database.

Secrets CI:

```env
CI_DATABASE_URL="postgresql://..."
CI_DIRECT_URL="postgresql://..."
CI_JWT_SECRET="minimum_32_characters_secret"
```

Environment safety:

```env
SAKUIN_DATABASE_TARGET="test"
SAKUIN_PRODUCTION_DATABASE_PROJECT_REF="bwzxtjgrerjimcuyslci"
```

Aturan:

```txt
Jangan menjalankan automated test ke production database.
Jangan mengubah database safety guard tanpa alasan kuat.
Jangan commit .env atau secret.
```

---

# 13. Deployment Notes

```txt
[✓] Frontend dideploy ke Vercel.
[✓] Backend dideploy ke Vercel.
[✓] Database menggunakan Supabase PostgreSQL.
[✓] Environment variable Vercel harus diset pada project yang benar.
[✓] Setelah environment variable diubah, deployment perlu redeploy.
```

Project Vercel:

```txt
Frontend : sakuin-web
Backend  : sakuin-api
```

Health check production:

```txt
GET https://sakuin-api.vercel.app/health
GET https://sakuin-api.vercel.app/api/health
```

---

# 14. Validation Commands

Jika backend berubah:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Jika frontend berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

Jika AI backend berubah:

```bash
pnpm --filter @sakuin/api test -- tests/ai-intent.test.ts
pnpm --filter @sakuin/api test -- tests/ai-chat-service.test.ts
pnpm --filter @sakuin/api test -- tests/ai-financial-scenario.test.ts
pnpm --filter @sakuin/api test -- tests/ai-transaction-draft.test.ts
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api build
```

Jika hanya dokumentasi berubah:

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

# 15. Notes for Future API Development

Aturan endpoint baru:

```txt
[ ] Wajib menggunakan Zod validation untuk body/query/params.
[ ] Wajib menggunakan authMiddleware jika endpoint membaca data user.
[ ] Wajib membatasi data berdasarkan userId dari token.
[ ] Wajib menjaga response format standar.
[ ] Wajib menghindari log data sensitif.
[ ] Wajib menambahkan test untuk data isolation.
[ ] Wajib mempertimbangkan audit event jika endpoint melakukan mutasi penting.
[ ] Wajib mempertimbangkan rate limit jika endpoint rawan abuse.
```

Aturan AI endpoint baru:

```txt
[ ] Jangan expose provider API key ke frontend.
[ ] Jangan kirim semua transaksi mentah ke AI provider.
[ ] Jangan simpan prompt penuh jika berisi data sensitif.
[ ] Jangan membuat AI auto-save transaksi.
[ ] Jangan memakai Gemini untuk transaction draft jika rule-based sudah cukup.
[ ] Jangan menjawab out-of-scope dengan provider call.
[ ] Jangan mengarang data user.
[ ] Jangan mencampur data antar user.
```

Aturan export/import endpoint:

```txt
[ ] Export wajib protected.
[ ] Export wajib user-only.
[ ] Export content tidak boleh masuk log/audit metadata.
[ ] Import file harus punya size limit dan validasi format.
[ ] Import tidak boleh langsung membuat data final tanpa preview/review jika hasil parsing tidak pasti.
```

---

# 16. Current API Status Summary

```txt
[✓] Health API berjalan
[✓] Register/login email password berjalan
[✓] Google Login berjalan
[✓] Forgot/reset password berjalan
[✓] Gmail SMTP/Nodemailer berjalan
[✓] Profile API berjalan
[✓] Category API berjalan
[✓] Transaction API berjalan
[✓] Summary API berjalan
[✓] Goals API berjalan
[✓] Export API berjalan
[✓] AI chat API berjalan
[✓] AI financial-only guardrail berjalan
[✓] AI financial context berjalan
[✓] AI provider router berjalan
[✓] AI financial scenario analyzer berjalan
[✓] AI transaction draft single berjalan
[✓] AI transaction draft multi berjalan
[✓] transactionDraft backward compatibility berjalan
[✓] transactionDrafts array berjalan
[✓] Transaction draft tetap no auto-save
[✓] Transaction draft tetap rule-based tanpa Gemini
[✓] CI dan deployment terakhir hijau
```