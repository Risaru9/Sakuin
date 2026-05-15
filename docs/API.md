# Sakuin API Documentation

Dokumentasi ini menjelaskan endpoint backend Sakuin untuk kebutuhan frontend, testing API, dan pengembangan lanjutan.

---

## Base URL

Development:

```txt
http://127.0.0.1:5000
```

---

## Response Format

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

---

## Authentication

Endpoint protected wajib mengirim header:

```txt
Authorization: Bearer <token>
```

Token didapat dari response login/register.

Frontend tidak perlu mengirim `userId` pada request protected. Backend mengambil user dari JWT token.

---

## Public Endpoints

```txt
GET  /health
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

---

## Protected Endpoints

```txt
GET    /api/auth/me

GET    /api/users/profile
PATCH  /api/users/profile

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

### Body

```json
{
  "name": "Rizal",
  "email": "rizal@example.com",
  "password": "Password123"
}
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

### Error Umum

```json
{
  "success": false,
  "message": "Email sudah digunakan",
  "errors": null
}
```

---

## POST `/api/auth/login`

Login user.

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

### Error Umum

```json
{
  "success": false,
  "message": "Email atau password salah",
  "errors": null
}
```

---

## GET `/api/auth/me`

Mengambil data user dari token.

### Auth

Wajib token.

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

---

# 3. User Profile API

## GET `/api/users/profile`

Mengambil profile user login.

### Auth

Wajib token.

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

---

## PATCH `/api/users/profile`

Update nama dan safe balance limit.

### Auth

Wajib token.

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
safeBalanceLimit tidak boleh negatif
safeBalanceLimit harus berupa angka valid
```

---

# 4. Transactions API

## POST `/api/transactions`

Membuat transaksi baru.

### Auth

Wajib token.

### Body

```json
{
  "type": "EXPENSE",
  "amount": "250000",
  "categoryId": "cat_expense_food",
  "date": "2026-05-15T00:00:00.000Z",
  "note": "Makan siang"
}
```

Untuk income:

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

---

## GET `/api/transactions`

Mengambil daftar transaksi user login.

### Auth

Wajib token.

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
GET /api/transactions?page=1&limit=10&type=EXPENSE
```

### Response

```json
{
  "success": true,
  "message": "Daftar transaksi berhasil diambil",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

---

## GET `/api/transactions/:id`

Mengambil detail transaksi.

### Auth

Wajib token.

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

### Error Jika Tidak Ditemukan

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

### Body

Semua field opsional, tetapi minimal satu field harus dikirim.

```json
{
  "amount": "300000",
  "note": "Makan malam"
}
```

### Response

```json
{
  "success": true,
  "message": "Transaksi berhasil diupdate",
  "data": {
    "id": "transaction-id"
  }
}
```

### Validasi

Validasi `amount` sama seperti saat membuat transaksi.

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
    "id": "transaction-id"
  }
}
```

---

# 5. Summary API

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
    "totalIncome": "3000000.00",
    "totalExpense": "250000.00",
    "balance": "2750000.00",
    "safeBalanceLimit": "500000.00",
    "isBelowSafeLimit": false,
    "incomeThisMonth": "3000000.00",
    "expenseThisMonth": "250000.00",
    "balanceThisMonth": "2750000.00",
    "transactionCount": 2,
    "recentTransactions": [],
    "expenseByCategory": [],
    "incomeByCategory": [],
    "monthlyTrend": []
  }
}
```

### Catatan

```txt
safeBalanceLimit berasal dari profile user
isBelowSafeLimit bernilai true jika balance < safeBalanceLimit
monthlyTrend berisi data 6 bulan terakhir
recentTransactions digunakan dashboard
```

---

# 6. Goals API

## POST `/api/goals`

Membuat goal tabungan.

### Auth

Wajib token.

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

Mengambil semua goal user login.

### Auth

Wajib token.

### Response

```json
{
  "success": true,
  "message": "Daftar goal berhasil diambil",
  "data": []
}
```

---

## GET `/api/goals/:id`

Mengambil detail goal.

### Auth

Wajib token.

### Error Jika Tidak Ditemukan

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

### Body

Semua field opsional, tetapi minimal satu field harus dikirim.

```json
{
  "name": "Beli Laptop Gaming",
  "currentAmount": "5000000"
}
```

### Response

```json
{
  "success": true,
  "message": "Goal berhasil diupdate",
  "data": {
    "id": "goal-id"
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
    "id": "goal-id"
  }
}
```

---

# 7. Export API

## GET `/api/export/transactions`

Export transaksi user login.

### Auth

Wajib token.

### Query Params

```txt
format      optional, json | csv | xlsx, default json
type        optional, INCOME | EXPENSE
categoryId  optional
startDate   optional
endDate     optional
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
    "generatedAt": "2026-05-15T00:00:00.000Z",
    "filters": {
      "type": null,
      "categoryId": null,
      "startDate": null,
      "endDate": null
    },
    "summary": {
      "totalIncome": "3000000.00",
      "totalExpense": "250000.00",
      "balance": "2750000.00",
      "transactionCount": 2
    },
    "transactions": []
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

File download:

```txt
sakuin-transactions-YYYY-MM-DD_HH-MM-SS.csv
```

Content-Type:

```txt
text/csv; charset=utf-8
```

---

## Export XLSX

### Request

```txt
GET /api/export/transactions?format=xlsx
```

### Response

File download:

```txt
sakuin-transactions-YYYY-MM-DD_HH-MM-SS.xlsx
```

Content-Type:

```txt
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Sheet:

```txt
Summary
Transactions
```

---

## Filter Export by Type

```txt
GET /api/export/transactions?format=json&type=EXPENSE
```

---

## Filter Export by Date Range

```txt
GET /api/export/transactions?format=json&startDate=2026-05-01&endDate=2026-05-31
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

# 8. Default Category IDs

Seed default category yang umum dipakai:

```txt
cat_income_salary     Gaji        INCOME
cat_expense_food      Makanan     EXPENSE
```

Catatan:

```txt
Category INCOME hanya boleh dipakai untuk transaksi INCOME
Category EXPENSE hanya boleh dipakai untuk transaksi EXPENSE
Jika category tidak sesuai type, backend akan menolak request
```

---

# 9. Common Errors

## Tanpa Token

```json
{
  "success": false,
  "message": "Authorization header wajib diisi",
  "errors": null
}
```

## Token Tidak Valid

```json
{
  "success": false,
  "message": "Token tidak valid",
  "errors": null
}
```

## Data Tidak Ditemukan

```json
{
  "success": false,
  "message": "Data tidak ditemukan",
  "errors": null
}
```

Contoh spesifik:

```txt
Transaksi tidak ditemukan
Goal tidak ditemukan
User tidak ditemukan
```

## Category Tidak Valid

```json
{
  "success": false,
  "message": "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi",
  "errors": null
}
```

---

# 10. Frontend Notes

Frontend harus menyimpan token dari response login/register.

Setiap request protected harus mengirim:

```txt
Authorization: Bearer <token>
```

Frontend tidak boleh mengirim `userId`.

Nominal uang dikirim sebagai string decimal:

```txt
"1000000.00"
```

Frontend boleh menampilkan nominal dengan format Rupiah.

Untuk export CSV/XLSX, frontend harus membaca response sebagai file download/blob.

---

# 11. Backend Status

Status terakhir backend:

```txt
Typecheck    passed
Build        passed
Test Files   6 passed
Tests        47 passed
```