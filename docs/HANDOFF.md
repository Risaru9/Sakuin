# Sakuin Project Handoff

Dokumen ini berisi ringkasan teknis dan status terakhir project Sakuin agar project bisa dilanjutkan oleh developer atau agent lain tanpa kehilangan konteks.

---

## 1. Ringkasan Project

Sakuin adalah webapp pengelola keuangan pribadi berbasis web. Aplikasi ini dibuat dengan pendekatan mobile-friendly dan digunakan untuk mencatat transaksi, memantau saldo, mengelola goals tabungan, mengatur batas saldo aman, dan mengekspor laporan transaksi.

Project menggunakan struktur monorepo dengan `pnpm workspace`.

---

## 2. Tech Stack

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
- PostgreSQL / Supabase
- Zod
- JWT
- bcryptjs
- ExcelJS
- Vitest

### Monorepo

- pnpm workspace
- packages/shared

---

## 3. Struktur Folder Utama

```txt
sakuin/
├─ apps/
│  ├─ api/      # Backend API
│  └─ web/      # Frontend web app
├─ packages/
│  └─ shared/   # Shared package
├─ docs/
│  ├─ API.md
│  └─ HANDOFF.md
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

---

## 4. Status Terakhir

Status final regression terakhir:

```txt
Frontend typecheck  passed
Frontend build      passed
Backend typecheck   passed
Backend test        passed
Backend build       passed
API test files      6 passed
API tests           47 passed
```

Semua manual test utama juga sudah berhasil.

---

## 5. Fitur yang Sudah Selesai

### Auth

```txt
[✓] Register
[✓] Login
[✓] Logout
[✓] Protected route
[✓] Token-based authentication
```

### Dashboard

```txt
[✓] Ringkasan saldo
[✓] Total income
[✓] Total expense
[✓] Safe balance limit
[✓] Status aman/waspada
[✓] Statistik 6 bulan
[✓] Transaksi terbaru
[✓] Ringkasan goals
[✓] Goal prioritas dashboard
[✓] Tambah transaksi dari dashboard
```

### Transactions

```txt
[✓] List transaksi
[✓] Tambah transaksi
[✓] Edit transaksi
[✓] Hapus transaksi
[✓] Search transaksi
[✓] Filter semua/income/expense
[✓] Validasi nominal transaksi frontend
[✓] Validasi nominal transaksi backend
[✓] ConfirmDialog untuk delete
[✓] Toast feedback
```

Aturan nominal transaksi:

```txt
Minimal Rp 1
Maksimal Rp 1.000.000.000.000
Tidak boleh 0
Tidak boleh minus
Tidak boleh format angka invalid
```

### Goals

```txt
[✓] List goals
[✓] Tambah goal
[✓] Edit goal
[✓] Tambah dana goal
[✓] Hapus goal
[✓] Set goal prioritas dashboard
[✓] ConfirmDialog untuk delete
[✓] Toast feedback
```

### Export

```txt
[✓] Export JSON
[✓] Export CSV
[✓] Export XLSX
[✓] Filter berdasarkan tipe transaksi
[✓] Filter berdasarkan rentang tanggal
[✓] Custom nama file
[✓] Toast feedback
```

### Profile

```txt
[✓] Ambil profile user
[✓] Update nama
[✓] Update safe balance limit
[✓] Logout
[✓] Toast feedback
```

---

## 6. Refactor dan Polish yang Sudah Selesai

```txt
[✓] Semua halaman utama sudah memakai AppShell
[✓] Sidebar desktop reusable
[✓] Bottom navigation mobile reusable
[✓] ConfirmDialog reusable
[✓] ToastProvider/useToast global
[✓] Modal overlay konsisten
[✓] Tidak ada window.confirm()
[✓] Tidak ada alert()
[✓] Tidak ada successMessage inline lama
```

Halaman yang sudah memakai `AppShell`:

```txt
[✓] DashboardPage
[✓] TransactionsPage
[✓] GoalsPage
[✓] ExportPage
[✓] ProfilePage
```

---

## 7. File Frontend Penting

### App dan Routing

```txt
apps/web/src/main.tsx
apps/web/src/app/App.tsx
apps/web/src/app/router.tsx
```

### Layout dan UI Reusable

```txt
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/ConfirmDialog.tsx
apps/web/src/components/toast/ToastProvider.tsx
apps/web/src/components/ui/button.tsx
apps/web/src/components/ui/input.tsx
```

### Auth

```txt
apps/web/src/features/auth/auth-context.tsx
apps/web/src/features/auth/pages/LoginPage.tsx
apps/web/src/features/auth/pages/RegisterPage.tsx
```

### Dashboard

```txt
apps/web/src/features/dashboard/DashboardPage.tsx
```

### Transactions

```txt
apps/web/src/features/transactions/TransactionsPage.tsx
apps/web/src/features/transactions/AddTransactionModal.tsx
apps/web/src/features/transactions/EditTransactionModal.tsx
apps/web/src/features/transactions/transaction.service.ts
apps/web/src/features/transactions/transaction.types.ts
```

### Goals

```txt
apps/web/src/features/goals/GoalsPage.tsx
apps/web/src/features/goals/GoalFormModal.tsx
apps/web/src/features/goals/AddGoalProgressModal.tsx
apps/web/src/features/goals/dashboard-goal-priority.ts
apps/web/src/features/goals/goal.service.ts
apps/web/src/features/goals/goal.types.ts
```

### Export

```txt
apps/web/src/features/export/ExportPage.tsx
apps/web/src/features/export/export.service.ts
```

### Profile

```txt
apps/web/src/features/profile/ProfilePage.tsx
apps/web/src/features/profile/profile.service.ts
apps/web/src/features/profile/profile.types.ts
```

---

## 8. File Backend Penting

### Server dan Config

```txt
apps/api/src/server.ts
apps/api/src/app.ts
apps/api/src/db/prisma.ts
apps/api/prisma/schema.prisma
```

### Modules

```txt
apps/api/src/modules/auth/
apps/api/src/modules/users/
apps/api/src/modules/transactions/
apps/api/src/modules/summary/
apps/api/src/modules/goals/
apps/api/src/modules/export/
apps/api/src/modules/categories/
```

### Tests

```txt
apps/api/tests/auth.test.ts
apps/api/tests/user.test.ts
apps/api/tests/transaction.test.ts
apps/api/tests/summary.test.ts
apps/api/tests/goal.test.ts
apps/api/tests/export.test.ts
```

---

## 9. Environment

### Backend

File:

```txt
apps/api/.env
```

Contoh:

```env
NODE_ENV="development"
PORT=5000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

JWT_SECRET="replace_with_minimum_32_characters_secret"

FRONTEND_URL="http://localhost:3000"
```

### Frontend

File:

```txt
apps/web/.env
```

Contoh:

```env
VITE_API_BASE_URL="http://127.0.0.1:5000"
```

---

## 10. Cara Menjalankan Lokal

Install dependency:

```bash
pnpm install
```

Generate Prisma Client:

```bash
pnpm --filter @sakuin/api db:generate
```

Jalankan migration:

```bash
pnpm --filter @sakuin/api db:migrate
```

Seed database:

```bash
pnpm --filter @sakuin/api db:seed
```

Jalankan backend:

```bash
pnpm --filter @sakuin/api dev
```

Jalankan frontend:

```bash
pnpm --filter @sakuin/web dev
```

URL lokal:

```txt
Frontend: http://127.0.0.1:3000
Backend:  http://127.0.0.1:5000
```

---

## 11. Command Validasi

Frontend:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
```

Backend:

```bash
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Full regression command:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web build
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

---

## 12. Prinsip Pengembangan yang Sudah Dipakai

```txt
1. Jangan mengubah logic yang sudah stabil tanpa alasan kuat.
2. Perubahan besar harus dilakukan per fase.
3. Setelah satu fase selesai, lakukan typecheck/build/manual test.
4. Validasi penting harus ada di frontend dan backend.
5. Aksi destructive memakai ConfirmDialog.
6. Feedback user memakai ToastProvider.
7. Layout halaman protected memakai AppShell.
8. Modal overlay harus konsisten.
9. Hindari alert() dan window.confirm().
10. Hindari menambah fitur besar sebelum QA dan dokumentasi selesai.
```

---

## 13. Backlog Lanjutan

Fitur yang belum dibuat:

```txt
[ ] Chat/command input transaksi, contoh: /pengeluaran makan 20000
[ ] Category management custom
[ ] Budgeting per kategori
[ ] Recurring transaction
[ ] Frontend automated tests
[ ] Dark mode
[ ] PWA installable
[ ] Deployment production
[ ] CI/CD
[ ] AI assistant
```

---

## 14. Rekomendasi Next Step

Urutan lanjutan yang disarankan:

```txt
1. Review final dokumentasi.
2. Tambahkan frontend automated test.
3. Siapkan deployment frontend dan backend.
4. Tambahkan fitur category management.
5. Tambahkan budgeting per kategori.
6. Setelah fitur utama stabil, baru pertimbangkan chat/command input transaksi.
```

---

## 15. Catatan Penting untuk Agent/Developer Berikutnya

Project ini sudah stabil pada fase MVP. Jangan langsung melakukan refactor besar tanpa menjalankan regression test.

Jika ingin menambah fitur baru, mulai dari:

```txt
1. Cek file service/types terkait.
2. Cek UI pattern yang sudah ada.
3. Ikuti AppShell, ConfirmDialog, dan ToastProvider.
4. Tambahkan validasi frontend.
5. Tambahkan validasi backend jika fitur menyentuh data penting.
6. Jalankan typecheck/build/test.
7. Lakukan manual test.
```