# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang mobile-friendly, sederhana, dan mudah digunakan. Aplikasi ini membantu pengguna mencatat transaksi, memantau kondisi saldo, mengelola target tabungan, mengatur batas saldo aman, dan mengekspor laporan transaksi.

Project ini menggunakan struktur **monorepo** agar frontend, backend, dan shared package dapat dikelola dalam satu repository secara rapi.

---

## Production URL

Sakuin sudah tersedia secara production melalui Vercel.

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
GitHub   : https://github.com/Risaru9/Sakuin
```

Health check backend:

```txt
https://sakuin-api.vercel.app/health
https://sakuin-api.vercel.app/api/health
```

Status production terakhir:

```txt
Frontend production : active
Backend production  : active
Database            : Supabase PostgreSQL
Deployment platform : Vercel
```

---

## Rumusan Masalah

Banyak pengguna masih mencatat keuangan pribadi secara manual atau tersebar di beberapa tempat, seperti catatan HP, spreadsheet, aplikasi bank, atau ingatan pribadi. Hal ini membuat pengguna sering kesulitan untuk:

- mengetahui kondisi saldo secara cepat;
- memantau pemasukan dan pengeluaran;
- melihat ringkasan keuangan bulanan;
- menjaga saldo tetap berada di atas batas aman;
- membuat dan memantau target tabungan;
- menyimpan laporan transaksi dalam format yang mudah dianalisis.

Sakuin dibuat untuk menjawab masalah tersebut melalui webapp keuangan pribadi yang ringan, responsif, dan terintegrasi.

---

## Tujuan Project

Tujuan utama Sakuin adalah menyediakan aplikasi keuangan pribadi yang:

- mudah digunakan oleh pengguna umum;
- nyaman diakses dari mobile maupun desktop;
- membantu pencatatan pemasukan dan pengeluaran;
- menyediakan ringkasan kondisi keuangan;
- membantu pengguna membuat target tabungan;
- menyediakan export laporan transaksi;
- memiliki struktur kode yang rapi dan mudah dikembangkan.

---

## Fitur Utama

### Authentication

- Register akun baru
- Login
- Logout
- Protected route
- Token-based authentication menggunakan JWT

### Dashboard

- Menampilkan total saldo
- Menampilkan total pemasukan
- Menampilkan total pengeluaran
- Menampilkan batas saldo aman
- Menampilkan status aman/waspada berdasarkan safe balance limit
- Menampilkan transaksi terbaru
- Menampilkan statistik/trend keuangan 6 bulan
- Menampilkan ringkasan goals
- Menampilkan goal prioritas
- Tambah transaksi langsung dari dashboard

### Transactions

- Tambah transaksi pemasukan
- Tambah transaksi pengeluaran
- Edit transaksi
- Hapus transaksi
- Search transaksi berdasarkan catatan/kategori
- Filter transaksi berdasarkan semua/income/expense
- Validasi nominal transaksi
- Confirm dialog untuk aksi hapus
- Toast notification untuk feedback aksi

Aturan validasi nominal transaksi:

```txt
Minimal  : Rp 1
Maksimal : Rp 1.000.000.000.000
Tidak boleh 0
Tidak boleh minus
Tidak boleh format angka tidak valid
```

Validasi dilakukan di frontend dan backend.

### Goals

- Membuat target tabungan
- Edit goal
- Hapus goal
- Tambah dana/progress ke goal
- Melihat progress goal
- Set goal prioritas untuk dashboard
- Validasi current amount tidak boleh melebihi target amount
- Confirm dialog untuk aksi hapus
- Toast notification untuk feedback aksi

### Export

- Export transaksi ke JSON
- Export transaksi ke CSV
- Export transaksi ke XLSX
- Filter export berdasarkan tipe transaksi
- Filter export berdasarkan rentang tanggal
- Custom nama file export
- Toast notification untuk feedback export

### Profile

- Melihat profile user
- Update nama user
- Update safe balance limit
- Logout
- Toast notification untuk feedback aksi

### UI/UX

- Responsive layout untuk mobile, tablet, laptop, dan desktop
- Sidebar desktop
- Bottom navigation mobile
- AppShell reusable untuk halaman utama
- Modal overlay konsisten
- ConfirmDialog custom
- ToastProvider global
- Tampilan clean, sederhana, dan modern

---

## Tech Stack

### Monorepo

- pnpm workspace
- TypeScript

### Frontend

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- lucide-react
- clsx
- tailwind-merge
- Recharts

### Backend

- Node.js
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase
- Zod
- JWT
- bcryptjs
- ExcelJS
- Vitest

### Database

- PostgreSQL
- Supabase PostgreSQL
- Prisma migration
- Prisma seed

### Deployment

- Vercel untuk frontend
- Vercel untuk backend Hono serverless function
- Supabase untuk database
- GitHub sebagai repository

---

## Struktur Project

```txt
sakuin/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  ├─ src/
│  │  ├─ tests/
│  │  ├─ package.json
│  │  └─ .env.example
│  │
│  └─ web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ components/
│     │  ├─ features/
│     │  ├─ lib/
│     │  ├─ types/
│     │  └─ main.tsx
│     ├─ package.json
│     └─ .env.example
│
├─ packages/
│  └─ shared/
│
├─ docs/
│  ├─ API.md
│  └─ HANDOFF.md
│
├─ package.json
├─ pnpm-workspace.yaml
├─ .gitignore
└─ README.md
```

---

## Dokumentasi Tambahan

Dokumentasi API tersedia di:

```txt
docs/API.md
```

Dokumen handoff untuk developer atau agent lanjutan tersedia di:

```txt
docs/HANDOFF.md
```

---

## Environment Variables

Project ini membutuhkan environment variable untuk backend dan frontend.

Jangan menyimpan file `.env` asli ke repository. Gunakan `.env.example` sebagai referensi.

---

### Backend Environment

Buat file:

```txt
apps/api/.env
```

Contoh isi:

```env
NODE_ENV="development"
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

JWT_SECRET="replace_with_minimum_32_characters_secret"

FRONTEND_URL="http://localhost:3000"
```

Keterangan:

```txt
NODE_ENV      : mode environment, misalnya development atau production
PORT          : port backend lokal
DATABASE_URL  : connection string PostgreSQL untuk aplikasi
DIRECT_URL    : direct connection string PostgreSQL untuk Prisma migration
JWT_SECRET    : secret key minimal 32 karakter untuk JWT
FRONTEND_URL  : URL frontend yang diizinkan oleh CORS
```

---

### Frontend Environment

Buat file:

```txt
apps/web/.env
```

Contoh isi untuk lokal:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

Contoh isi untuk production:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

Catatan:

```txt
VITE_API_BASE_URL tidak boleh diakhiri slash /
```

Benar:

```txt
https://sakuin-api.vercel.app
```

Salah:

```txt
https://sakuin-api.vercel.app/
```

---

## Cara Menjalankan Project Secara Lokal

Pastikan sudah berada di root project:

```bash
cd sakuin
```

### 1. Install Dependency

```bash
pnpm install
```

### 2. Generate Prisma Client

```bash
pnpm --filter @sakuin/api db:generate
```

### 3. Jalankan Database Migration

```bash
pnpm --filter @sakuin/api db:migrate
```

### 4. Seed Database

```bash
pnpm --filter @sakuin/api db:seed
```

Seed digunakan untuk membuat data awal seperti default category.

### 5. Jalankan Backend

```bash
pnpm --filter @sakuin/api dev
```

Backend berjalan di:

```txt
http://127.0.0.1:5000
```

Cek backend:

```txt
http://127.0.0.1:5000/health
http://127.0.0.1:5000/api/health
```

### 6. Jalankan Frontend

Buka terminal baru, lalu jalankan:

```bash
pnpm --filter @sakuin/web dev
```

Frontend berjalan di:

```txt
http://127.0.0.1:3000
```

---

## Script Penting

### Root Script

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm dev:api
pnpm dev:web
```

Catatan:

```txt
Script root "dev" saat ini menjalankan backend.
Untuk menjalankan frontend, gunakan pnpm dev:web.
```

---

### Frontend Script

```bash
pnpm --filter @sakuin/web dev
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/web preview
```

Keterangan:

```txt
dev       : menjalankan frontend lokal
typecheck : mengecek TypeScript frontend
build     : build frontend untuk production
preview   : preview hasil build frontend
```

---

### Backend Script

```bash
pnpm --filter @sakuin/api dev
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
pnpm --filter @sakuin/api start
```

Keterangan:

```txt
dev       : menjalankan backend lokal
typecheck : mengecek TypeScript backend dan test config
test      : menjalankan backend test
build     : build backend
start     : menjalankan hasil build backend
```

---

### Prisma Script

```bash
pnpm --filter @sakuin/api db:generate
pnpm --filter @sakuin/api db:migrate
pnpm --filter @sakuin/api db:seed
pnpm --filter @sakuin/api db:studio
pnpm --filter @sakuin/api db:reset
```

Keterangan:

```txt
db:generate : generate Prisma Client
db:migrate  : menjalankan migration development
db:seed     : menjalankan seed database
db:studio   : membuka Prisma Studio
db:reset    : reset database development
```

---

## Testing dan Build

### Frontend

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
```

### Backend

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

### Full Regression

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Status regression terakhir:

```txt
Frontend typecheck : passed
Frontend build     : passed
Backend typecheck  : passed
Backend test       : passed
Backend build      : passed
API test files     : 6 passed
API tests          : 47 passed
```

---

## Backend API Summary

Base URL production:

```txt
https://sakuin-api.vercel.app
```

Base URL local:

```txt
http://127.0.0.1:5000
```

Public endpoints:

```txt
GET  /health
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Protected endpoints:

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

Endpoint protected wajib mengirim header:

```txt
Authorization: Bearer <token>
```

Detail endpoint tersedia di:

```txt
docs/API.md
```

---

## Deployment

### Frontend

Frontend dideploy ke Vercel:

```txt
https://sakuin-web.vercel.app
```

Environment production frontend:

```env
VITE_API_BASE_URL="https://sakuin-api.vercel.app"
```

### Backend

Backend dideploy ke Vercel:

```txt
https://sakuin-api.vercel.app
```

Backend menggunakan Hono app sebagai Vercel serverless function.

Environment production backend:

```env
NODE_ENV="production"
DATABASE_URL="<Supabase PostgreSQL URL>"
DIRECT_URL="<Supabase Direct URL>"
JWT_SECRET="<production secret>"
FRONTEND_URL="https://sakuin-web.vercel.app"
```

### Database

Database production menggunakan Supabase PostgreSQL.

Jangan menyimpan value asli berikut di repository:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
```

---

## Catatan Deployment Penting

Beberapa hal penting yang perlu diperhatikan saat deployment:

1. Environment variable Vercel harus diset pada environment yang benar.
2. Untuk production domain seperti `https://sakuin-api.vercel.app`, variable harus tersedia di environment `Production`.
3. Setelah mengubah environment variable di Vercel, lakukan redeploy.
4. Frontend Vite hanya membaca environment variable dengan prefix `VITE_`.
5. `VITE_API_BASE_URL` tidak boleh diakhiri slash `/`.
6. Backend CORS harus mengizinkan URL frontend production.
7. Jangan menggunakan URL dashboard Vercel sebagai API URL.
8. Jangan menggunakan preview URL yang terkena Vercel Authentication sebagai API production.

---

## Status Project

Status project saat ini:

```txt
MVP Production Ready
```

Yang sudah selesai:

```txt
[✓] Frontend selesai
[✓] Backend selesai
[✓] Database Supabase aktif
[✓] Auth berjalan
[✓] Dashboard berjalan
[✓] Transactions berjalan
[✓] Goals berjalan
[✓] Export berjalan
[✓] Profile berjalan
[✓] Toast notification berjalan
[✓] Confirm dialog berjalan
[✓] Responsive layout berjalan
[✓] Production deployment berhasil
[✓] Semua fitur utama berjalan normal di production
```

---

## Manual Production Smoke Test

Checklist production terakhir:

```txt
[✓] Buka frontend production
[✓] Backend /health aktif
[✓] Backend /api/health aktif
[✓] Register
[✓] Login
[✓] Dashboard tampil normal
[✓] Tambah transaksi
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Tambah goal
[✓] Tambah dana goal
[✓] Set goal prioritas dashboard
[✓] Export JSON
[✓] Export CSV
[✓] Export XLSX
[✓] Update profile
[✓] Logout
[✓] Login ulang
```

---

## Prinsip Pengembangan

Prinsip yang digunakan selama pengembangan Sakuin:

```txt
1. Jangan mengubah logic stabil tanpa alasan kuat.
2. Perubahan dilakukan bertahap per fase.
3. Setelah perubahan besar, jalankan typecheck/build/test.
4. Validasi penting harus ada di frontend dan backend.
5. Aksi destructive menggunakan ConfirmDialog.
6. Feedback user menggunakan ToastProvider.
7. Layout halaman protected menggunakan AppShell.
8. Modal overlay harus konsisten.
9. Hindari window.confirm() dan alert().
10. Dokumentasi harus jelas, ringkas, dan bisa dipakai developer lain.
```

---

## Backlog Lanjutan

Fitur yang belum dibuat pada fase MVP dan bisa dikembangkan selanjutnya:

```txt
[ ] Category management custom
[ ] Budgeting per kategori
[ ] Recurring transaction
[ ] Frontend automated tests
[ ] Dark mode
[ ] PWA installable
[ ] CI/CD workflow
[ ] AI assistant
[ ] Chat/command input transaksi, contoh: /pengeluaran makan 20000
```

---

## Rekomendasi Pengembangan Berikutnya

Urutan pengembangan yang disarankan setelah MVP production:

```txt
1. Tambahkan frontend automated test.
2. Tambahkan category management custom.
3. Tambahkan budgeting per kategori.
4. Tambahkan recurring transaction.
5. Tambahkan PWA support.
6. Tambahkan dark mode.
7. Tambahkan chat/command input transaksi.
8. Tambahkan AI assistant jika fitur utama sudah stabil.
```

---

## License

Project ini dibuat sebagai project pengembangan aplikasi web pengelola keuangan pribadi.

Lisensi dapat ditentukan kemudian sesuai kebutuhan pemilik repository.