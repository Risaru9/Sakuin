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

## Health Check

```txt
GET /health
GET /api/health
```

Production health check:

```txt
GET https://sakuin-api.vercel.app/health
GET https://sakuin-api.vercel.app/api/health
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
    "timestamp": "2026-05-19T00:00:00.000Z"
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
    "timestamp": "2026-05-19T00:00:00.000Z"
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

### Catatan Environment

Backend membutuhkan:

```txt
GOOGLE_CLIENT_ID
```

Frontend membutuhkan:

```txt
VITE_GOOGLE_CLIENT_ID
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

Karena email reset password saat ini dikirim melalui Gmail SMTP, email dapat masuk ke:

```txt
Inbox
Spam
Promotions
Social
Updates
All Mail
```

Frontend menampilkan instruksi agar user mengecek semua folder email tersebut.

### Safe Diagnostic Logs

Backend dapat mencatat log aman seperti:

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
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
        "date": "2026-05-19T00:00:00.000Z",
        "category": {
          "id": "category-id",
          "name": "Makan",
          "type": "EXPENSE",
          "icon": "utensils",
          "color": "#ef4444",
          "isDefault": true
        },
        "createdAt": "2026-05-19T00:00:00.000Z",
        "updatedAt": "2026-05-19T00:00:00.000Z"
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
  "date": "2026-05-19",
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
    "date": "2026-05-19T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "date": "2026-05-19T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
}
```

---

## PUT `/api/transactions/:id`

Update transaksi.

### Auth

Wajib token.

### Body

Minimal satu field wajib dikirim.

```json
{
  "type": "EXPENSE",
  "amount": "18000",
  "categoryId": "category-id",
  "date": "2026-05-19",
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
    "amount": "18000.00",
    "note": "makan malam",
    "date": "2026-05-19T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
transaction.updated
```

---

## DELETE `/api/transactions/:id`

Hapus transaksi.

### Auth

Wajib token.

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus",
  "data": {
    "id": "transaction-id",
    "type": "EXPENSE",
    "amount": "18000.00",
    "note": "makan malam",
    "date": "2026-05-19T00:00:00.000Z",
    "category": {
      "id": "category-id",
      "name": "Makan",
      "type": "EXPENSE",
      "icon": "utensils",
      "color": "#ef4444",
      "isDefault": true
    },
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "recentTransactions": [],
    "monthlyTrend": [],
    "categoryBreakdown": []
  }
}
```

### Catatan

```txt
Summary hanya menghitung transaksi milik user login.
Summary tidak boleh menghitung transaksi user lain.
```

---

# 7. Goals API

## GET `/api/goals`

Mengambil daftar goal user login.

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
      "currentAmount": "1000000.00",
      "progressPercentage": 20,
      "remainingAmount": "4000000.00",
      "isCompleted": false,
      "deadline": "2026-12-31T00:00:00.000Z",
      "isOverdue": false,
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
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
targetAmount harus lebih dari 0
currentAmount tidak boleh negatif
currentAmount tidak boleh lebih besar dari targetAmount
deadline optional
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
    "progressPercentage": 20,
    "remainingAmount": "4000000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
    "progressPercentage": 20,
    "remainingAmount": "4000000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
}
```

---

## PUT `/api/goals/:id`

Update goal.

### Auth

Wajib token.

### Body

Minimal satu field wajib dikirim.

```json
{
  "name": "Dana Darurat Updated",
  "targetAmount": "7000000",
  "currentAmount": "1500000",
  "deadline": "2026-12-31"
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
    "currentAmount": "1500000.00",
    "progressPercentage": 21.43,
    "remainingAmount": "5500000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
}
```

### Audit Event

```txt
goal.updated
```

---

## DELETE `/api/goals/:id`

Hapus goal.

### Auth

Wajib token.

### Response

```json
{
  "success": true,
  "message": "Goal berhasil dihapus",
  "data": {
    "id": "goal-id",
    "name": "Dana Darurat Updated",
    "targetAmount": "7000000.00",
    "currentAmount": "1500000.00",
    "progressPercentage": 21.43,
    "remainingAmount": "5500000.00",
    "isCompleted": false,
    "deadline": "2026-12-31T00:00:00.000Z",
    "isOverdue": false,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
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
```

### Contoh Request

```txt
GET /api/export/transactions?format=json
GET /api/export/transactions?format=csv
GET /api/export/transactions?format=xlsx
GET /api/export/transactions?format=xlsx&type=EXPENSE
GET /api/export/transactions?format=csv&startDate=2026-05-01&endDate=2026-05-31
```

### JSON Response

```json
{
  "success": true,
  "message": "Export transaksi berhasil dibuat",
  "data": {
    "generatedAt": "2026-05-19T00:00:00.000Z",
    "filters": {
      "type": null,
      "categoryId": null,
      "startDate": null,
      "endDate": null
    },
    "summary": {
      "totalIncome": "5000000.00",
      "totalExpense": "1500000.00",
      "balance": "3500000.00",
      "transactionCount": 10
    },
    "transactions": []
  }
}
```

### CSV Response

```txt
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="sakuin-transactions-YYYY-MM-DD_HH-MM-SS.csv"
```

### XLSX Response

```txt
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="sakuin-transactions-YYYY-MM-DD_HH-MM-SS.xlsx"
```

### Audit Event

```txt
export.transactions_generated
```

### Data Isolation

```txt
Export hanya boleh memuat transaksi milik user login.
Export tidak boleh memuat transaksi user lain.
Export dengan categoryId milik user lain tidak boleh membocorkan data.
```

---

# 9. Common Types

## TransactionType

```txt
INCOME
EXPENSE
```

## ExportFormat

```txt
json
csv
xlsx
```

## Transaction Sort

```txt
date_desc
date_asc
created_desc
created_asc
```

## Date Format

Untuk field tanggal, gunakan ISO string:

```txt
2026-05-19T00:00:00.000Z
```

Untuk query filter tanggal, format `YYYY-MM-DD` juga dapat digunakan:

```txt
2026-05-19
```

## Decimal Money Format

Nominal uang umumnya dikirim sebagai string decimal:

```txt
"250000.00"
"1000000.00"
```

Frontend boleh menampilkan nominal dengan format Rupiah.

---

# 10. Security and Logging Rules

Backend tidak boleh mencatat data sensitif berikut:

```txt
password
JWT token
Authorization header
cookie
raw request body
email mentah
reset password token
Google credential
Google access token
Google refresh token
transaction amount dalam audit metadata
transaction note dalam audit metadata
goal amount dalam audit metadata
goal name dalam audit metadata
category name dalam audit metadata
export content
SMTP_PASS
```

Safe logs yang boleh dicatat:

```txt
requestId
method
path
status
durationMs
timestamp
event type
safe reason
identifier hash
userId
```

---

# 11. Audit Trail

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

## Google Login

```env
GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

Frontend juga membutuhkan:

```env
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
```

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

## Frontend Required

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
VITE_GOOGLE_CLIENT_ID="google-client-id.apps.googleusercontent.com"
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

Jika hanya dokumentasi berubah:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/api typecheck
git status
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
[ ] Wajib mempertimbangkan audit event untuk mutation penting.
[ ] Wajib update docs/API.md setelah endpoint ditambahkan.
```

Fitur sensitif yang belum boleh dibuat sembarangan:

```txt
[ ] Gmail transaction detection
[ ] E-wallet transaction detection
[ ] Mobile banking transaction detection
[ ] Financial assistant/advisor berbasis data pribadi
```

Fitur tersebut harus memiliki desain khusus untuk:

```txt
consent
privacy
token storage
token revocation
data retention
audit trail
draft-first review
user approval
security testing
```