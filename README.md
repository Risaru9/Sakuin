# Sakuin

Sakuin adalah webapp pengelola keuangan pribadi berbasis web yang dirancang mobile-friendly, sederhana, dan mudah digunakan. Aplikasi ini membantu pengguna mencatat transaksi, memantau saldo, mengelola target tabungan, dan mengekspor laporan keuangan pribadi.

---

## Rumusan Masalah

Banyak pengguna masih mencatat keuangan pribadi secara manual atau tersebar di berbagai aplikasi, sehingga sulit untuk:

- mengetahui kondisi saldo secara cepat;
- memantau pemasukan dan pengeluaran;
- menjaga saldo tetap di atas batas aman;
- membuat dan mengikuti target tabungan;
- menyimpan laporan transaksi dalam format yang mudah dianalisis.

Sakuin dibuat untuk menjawab masalah tersebut melalui webapp keuangan pribadi yang ringan, responsif, dan terintegrasi.

---

## Fitur Utama

- Autentikasi user: register, login, dan logout
- Dashboard ringkasan keuangan
- Pencatatan transaksi pemasukan dan pengeluaran
- Edit dan hapus transaksi
- Validasi nominal transaksi
- Goals atau target tabungan
- Tambah progress dana ke goal
- Goal prioritas untuk dashboard
- Pengaturan profile dan safe balance limit
- Export transaksi ke JSON, CSV, dan XLSX
- Toast notification untuk feedback aksi
- Confirm dialog untuk aksi hapus
- Responsive layout untuk desktop dan mobile

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

### Backend

- Node.js
- Hono
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- JWT
- bcryptjs
- ExcelJS
- Vitest

---

## Struktur Project

```txt
sakuin/
├─ apps/
│  ├─ api/        # Backend API
│  └─ web/        # Frontend web app
├─ packages/
│  └─ shared/     # Shared package
├─ docs/
│  └─ API.md      # Dokumentasi API
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

---

## Persiapan Environment

### Backend

Buat file:

```txt
apps/api/.env
```

Isi contoh:

```env
NODE_ENV="development"
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

JWT_SECRET="replace_with_minimum_32_characters_secret"

FRONTEND_URL="http://localhost:3000"
```

### Frontend

Buat file:

```txt
apps/web/.env
```

Isi contoh:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

---

## Cara Menjalankan Project Secara Lokal

### 1. Install Dependency

Jalankan dari root project:

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

### 5. Jalankan Backend

```bash
pnpm --filter @sakuin/api dev
```

Backend berjalan di:

```txt
http://127.0.0.1:5000
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

### Frontend

```bash
pnpm --filter @sakuin/web dev
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/web preview
```

### Backend

```bash
pnpm --filter @sakuin/api dev
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
pnpm --filter @sakuin/api start
```

### Prisma

```bash
pnpm --filter @sakuin/api db:generate
pnpm --filter @sakuin/api db:migrate
pnpm --filter @sakuin/api db:seed
pnpm --filter @sakuin/api db:studio
pnpm --filter @sakuin/api db:reset
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

Status terakhir:

```txt
Frontend typecheck: passed
Frontend build: passed
Backend typecheck: passed
Backend test: passed
Backend build: passed
API tests: 47 passed
Test files: 6 passed
```

---

## Dokumentasi API

Dokumentasi endpoint backend tersedia di:

```txt
docs/API.md
```

---

## Backlog Lanjutan

Fitur yang belum dibuat pada fase MVP:

- Chat atau command input transaksi, contoh: `/pengeluaran makan 20000`
- Category management custom
- Budgeting per kategori
- Recurring transaction
- Frontend automated test
- PWA
- Deployment production
- AI assistant