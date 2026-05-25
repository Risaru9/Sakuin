# Sakuin Performance Notes

Dokumen ini mencatat keputusan, temuan, dan baseline optimisasi performance untuk Sakuin, terutama setelah fase optimisasi transaksi, dashboard, dan deployment production.

Fokus dokumen ini adalah membantu developer atau agent berikutnya memahami:

- apa saja optimisasi performance yang sudah dilakukan,
- kenapa production sebelumnya terasa lambat,
- keputusan deployment region yang penting,
- cara diagnosis jika production kembali lambat,
- dan kandidat optimisasi lanjutan yang masih masuk akal.

---

## 1. Current Performance Status

Sakuin sudah melewati beberapa fase optimisasi utama untuk transaksi dan dashboard.

Status terbaru:

```txt
[✓] Stable transaction ordering selesai
[✓] True optimistic add transaction selesai
[✓] True optimistic edit transaction selesai
[✓] True optimistic delete transaction selesai
[✓] True optimistic Quick Transaction selesai
[✓] Backend bulk transaction endpoint selesai
[✓] Frontend Quick Transaction sudah memakai bulk endpoint
[✓] Summary endpoint query shape optimization selesai
[✓] Summary cache patch untuk nilai dashboard dasar selesai
[✓] Production latency membaik setelah Vercel region disesuaikan dengan region Supabase
```

Setelah region deployment diperbaiki, production webapp terasa jauh lebih cepat.

---

## 2. Important Production Finding

Masalah performance production sebelumnya bukan terutama berasal dari React, ukuran bundle frontend, atau rendering chart.

Berdasarkan observasi Network tab di browser, endpoint kecil seperti:

```txt
/api/auth/me
/api/profile
/api/goals
/api/categories
/api/transactions
```

juga sempat memakan waktu beberapa detik.

Ini menunjukkan bahwa bottleneck utama production bukan hanya `/api/summary`, tetapi latency antara backend API dan database.

Root cause paling penting yang ditemukan:

```txt
Vercel backend function sebelumnya tidak optimal secara region terhadap Supabase database.
```

Supabase project Sakuin menggunakan database region:

```txt
Oceania / Sydney
```

Setelah region Vercel deployment disesuaikan agar sama atau lebih dekat dengan region Supabase, production webapp terasa jauh lebih cepat.

---

## 3. Deployment Region Rule

Sakuin menggunakan:

```txt
Frontend: Vercel
Backend API: Vercel Functions
Database: Supabase PostgreSQL
Database region: Oceania / Sydney
```

Aturan penting:

```txt
Backend API region harus sama atau paling dekat dengan region database Supabase.
```

Jangan hanya mengubah region frontend. Yang paling penting adalah region backend API, karena backend API yang melakukan koneksi ke Supabase/PostgreSQL.

Jika backend API region terlalu jauh dari database region, endpoint kecil pun bisa terasa lambat walaupun payload response kecil.

Contoh gejala:

```txt
/api/profile 300-500 B tetapi butuh 2-4 detik
/api/auth/me kecil tetapi butuh beberapa detik
/api/transactions kecil tetapi tetap lambat
/api/summary bisa 5-8 detik
```

Jika gejala ini muncul lagi, cek region backend API terlebih dahulu sebelum refactor frontend.

---

## 4. Request Timing and Safe Logs

Backend sudah memiliki request timing log di middleware berikut:

```txt
apps/api/src/middlewares/request-id.middleware.ts
```

Tidak ada file terpisah bernama:

```txt
request-logger.middleware.ts
```

Request ID dan request timing sudah digabung dalam `request-id.middleware.ts`.

Log request aman berisi:

```txt
requestId
method
path
status
durationMs
timestamp
```

Contoh event log:

```json
{
  "level": "info",
  "event": "http_request",
  "requestId": "example-request-id",
  "method": "GET",
  "path": "/api/summary",
  "status": 200,
  "durationMs": 523,
  "timestamp": "2026-05-25T00:00:00.000Z"
}
```

Log ini tidak boleh berisi data sensitif seperti:

```txt
password
token
Authorization header
raw request body
transaction note
transaction amount
categoryId mentah dari payload
email mentah dari payload
private financial details
```

Tujuan log ini adalah membedakan apakah bottleneck terjadi di:

```txt
frontend/browser/network
backend function
database query
cold start/serverless
```

---

## 5. Transaction Performance Improvements

Optimisasi transaksi yang sudah dilakukan:

### 5.1 Stable Transaction Ordering

Sebelumnya transaksi dengan tanggal yang sama bisa tampil tidak stabil. Transaksi baru kadang muncul di bawah transaksi lama walaupun baru saja diinput.

Perbaikannya:

```txt
date digunakan sebagai primary sort
createdAt digunakan sebagai secondary sort
```

Aturan sorting:

```txt
date_desc:
  date DESC
  createdAt DESC

date_asc:
  date ASC
  createdAt DESC

created_desc:
  createdAt DESC

created_asc:
  createdAt ASC
```

Dengan aturan ini:

```txt
Jika user input transaksi tanggal 5 Mei,
transaksi tetap berada di grup tanggal 5 Mei,
tetapi input terbaru tampil paling atas di tanggal tersebut.
```

Frontend cache sorting juga disamakan dengan backend agar optimistic row tidak berubah posisi secara aneh setelah refetch.

---

### 5.2 True Optimistic Add Transaction

Tambah transaksi manual sudah dibuat optimistic.

Flow sekarang:

```txt
User klik Simpan
→ modal langsung tertutup
→ row transaksi sementara langsung masuk cache
→ request backend berjalan di background
→ jika sukses, optimistic row diganti dengan row final dari backend
→ jika gagal, cache rollback ke kondisi sebelumnya
```

Ini membuat user tidak perlu menunggu response backend untuk melihat transaksi baru di UI.

---

### 5.3 True Optimistic Edit Transaction

Edit transaksi sudah dibuat optimistic.

Flow sekarang:

```txt
User klik Simpan perubahan
→ modal langsung tertutup
→ row transaksi langsung berubah di cache
→ request backend berjalan di background
→ jika sukses, data final backend menggantikan optimistic data
→ jika gagal, cache rollback
```

Summary dasar juga dipatch secara optimistic agar angka dashboard ikut terasa responsif.

---

### 5.4 True Optimistic Delete Transaction

Delete transaksi sudah dibuat optimistic.

Flow sekarang:

```txt
User konfirmasi hapus
→ row langsung hilang dari list
→ summary dasar langsung dipatch
→ request backend berjalan di background
→ jika gagal, row dan summary dikembalikan
```

---

### 5.5 True Optimistic Quick Transaction

Quick Transaction juga sudah memakai optimistic update.

Flow sekarang:

```txt
User membuat beberapa draft
→ user klik Simpan Semua
→ modal langsung tertutup
→ semua draft langsung tampil sebagai optimistic rows
→ request backend berjalan di background
→ jika sukses, optimistic rows diganti dengan data final backend
→ jika gagal, cache rollback
```

---

### 5.6 Backend Bulk Transaction Endpoint

Quick Transaction sebelumnya mengirim banyak request:

```txt
POST /api/transactions
POST /api/transactions
POST /api/transactions
```

Sekarang Quick Transaction menggunakan satu endpoint bulk:

```txt
POST /api/transactions/bulk
```

Manfaat:

```txt
lebih sedikit network round-trip
lebih sedikit auth validation overhead
lebih sedikit request middleware overhead
lebih efisien untuk multi-draft
lebih stabil untuk input banyak transaksi
```

Bulk endpoint memiliki behavior:

```txt
Jika semua transaksi valid:
  semua transaksi dibuat.

Jika ada satu transaksi invalid:
  seluruh bulk operation gagal.
  tidak ada transaksi yang dibuat.
```

Audit event tetap dicatat secara aman per transaksi tanpa menyimpan amount, note, atau categoryId mentah di metadata audit.

---

## 6. Summary Performance Improvements

Summary endpoint sebelumnya melakukan beberapa pekerjaan berat:

```txt
multiple aggregate queries
mengambil semua transaksi untuk category summary
menghitung category summary di Node.js
mengambil transaksi monthly trend
memanggil getAiFinancialContext
menghitung safeToSpend
menghitung financialCheckup
```

Optimisasi yang sudah dilakukan:

```txt
[✓] Multiple amount aggregate diganti dengan groupBy per type
[✓] Category summary diganti dengan groupBy categoryId + type
[✓] Recent transactions memakai date DESC + createdAt DESC
[✓] getAiFinancialContext dijalankan paralel dengan query summary
[✓] Response contract /api/summary tetap sama
```

Response `/api/summary` tetap mempertahankan field yang dibutuhkan frontend:

```txt
totalIncome
totalExpense
balance
safeBalanceLimit
isBelowSafeLimit
safeToSpend
financialCheckup
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
expenseByCategory
incomeByCategory
monthlyTrend
```

---

## 7. Summary Cache Patch

Frontend juga sudah menambahkan patch optimistic untuk summary dasar.

Field yang dipatch secara optimistic:

```txt
totalIncome
totalExpense
balance
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
```

Field yang tetap disinkronkan dari backend:

```txt
safeToSpend
financialCheckup
monthlyTrend
incomeByCategory
expenseByCategory
```

Alasannya:

```txt
safeToSpend dan financialCheckup adalah derived insight yang lebih kompleks.
Lebih aman dihitung oleh backend agar konsisten.
```

Jadi ekspektasi yang benar:

```txt
Angka dasar dashboard bisa terasa cepat berubah.
Insight berat boleh menyusul dari backend.
```

---

## 8. Frontend Query Refetch Behavior

Optimistic update bisa terasa tidak efektif jika setelah mutation frontend langsung melakukan active refetch berat.

Yang perlu dijaga:

```txt
refreshDashboardData tidak boleh memaksa invalidate summary + transactions aktif.
refreshTransactionData tidak boleh memaksa invalidate summary + transactions aktif.
markTransactionDerivedDataStale harus menghindari refetch aktif berlebihan.
```

Ideal behavior setelah transaksi:

```txt
1. Cache list transaksi berubah optimistic.
2. Cache summary dasar berubah optimistic.
3. Derived data ditandai stale atau disinkronkan background.
4. UI tidak langsung tertimpa loading/refetch berat.
```

Jika transaksi mulai terasa lambat lagi, cek file:

```txt
apps/web/src/features/transactions/transaction-cache.ts
apps/web/src/features/dashboard/DashboardPage.tsx
apps/web/src/features/transactions/TransactionsPage.tsx
apps/web/src/features/transactions/AddTransactionModal.tsx
apps/web/src/features/transactions/EditTransactionModal.tsx
apps/web/src/features/transactions/QuickTransactionModal.tsx
```

Hal yang perlu dicek:

```txt
Apakah parent page masih memanggil invalidateQueries aktif?
Apakah mutation handlers masih melakukan optimistic cache update?
Apakah markTransactionDerivedDataStale masih memakai refetchType yang aman?
Apakah query dashboard diberi staleTime yang wajar?
```

---

## 9. Production Performance Diagnosis Checklist

Jika production terasa lambat lagi, lakukan diagnosis dengan urutan ini.

### 9.1 Browser Network Check

Buka:

```txt
Browser DevTools
→ Network
→ Filter Fetch/XHR
→ Preserve log
```

Cek durasi endpoint berikut:

```txt
/api/auth/me
/api/profile
/api/goals
/api/categories
/api/transactions
/api/transactions/bulk
/api/summary
```

Catat dalam format:

```txt
/api/auth/me: 800ms
/api/profile: 900ms
/api/goals: 1.2s
/api/categories: 700ms
/api/transactions: 1.1s
/api/transactions/bulk: 1.4s
/api/summary: 2.5s
```

### 9.2 Interpretasi Hasil

Jika endpoint kecil seperti `/api/profile` dan `/api/auth/me` lambat:

```txt
Kemungkinan masalah:
- Vercel backend region jauh dari Supabase database
- cold start serverless
- Prisma startup overhead
- database connection/pooling
- Supabase compute lambat/idle
```

Jika hanya `/api/summary` yang lambat:

```txt
Kemungkinan masalah:
- summary query masih berat
- getAiFinancialContext berat
- safeToSpend/financialCheckup makin kompleks
- perlu split summary basic dan insights
```

Jika endpoint transaksi lambat tetapi UI tetap cepat:

```txt
Optimistic UI bekerja.
Backend masih perlu dioptimasi, tetapi user experience masih cukup baik.
```

Jika UI transaksi lambat dan endpoint juga lambat:

```txt
Cek optimistic cache update.
Cek active refetch.
Cek region backend/database.
```

---

## 10. Production Region Checklist

Jika production API lambat, cek:

```txt
1. Supabase database region
2. Vercel backend function region
3. Apakah yang diubah region-nya backend API, bukan hanya frontend
4. Apakah backend sudah redeploy setelah region diubah
5. Apakah Network tab membaik setelah redeploy
```

Untuk Sakuin saat ini:

```txt
Supabase database region: Oceania / Sydney
```

Backend Vercel function harus memakai region yang sama atau paling dekat dengan Sydney.

---

## 11. Future Optimization Candidate

Jika dashboard first load masih terasa berat meskipun region sudah benar, kandidat optimisasi berikutnya adalah split summary endpoint.

### 11.1 Basic Summary Endpoint

Endpoint kandidat:

```txt
GET /api/summary/basic
```

Isi data ringan:

```txt
totalIncome
totalExpense
balance
incomeThisMonth
expenseThisMonth
balanceThisMonth
transactionCount
recentTransactions
safeBalanceLimit
isBelowSafeLimit
```

Tujuan:

```txt
Dashboard bisa render data utama secepat mungkin.
```

### 11.2 Insights Summary Endpoint

Endpoint kandidat:

```txt
GET /api/summary/insights
```

Isi data berat:

```txt
safeToSpend
financialCheckup
monthlyTrend
incomeByCategory
expenseByCategory
```

Tujuan:

```txt
Insight berat tidak menghambat render awal dashboard.
Setiap card insight bisa loading secara granular.
```

### 11.3 Expected Dashboard Behavior

Target dashboard jika split endpoint diterapkan:

```txt
1. Header dan saldo utama tampil cepat dari /summary/basic.
2. Recent transactions tampil cepat.
3. Trend, category summary, safe-to-spend, dan financial checkup menyusul.
4. Tidak ada full-page loading hanya karena insight berat belum selesai.
```

Untuk sekarang, split endpoint belum wajib jika production sudah terasa cepat setelah region diperbaiki.

---

## 12. Final Regression Checklist

Setelah perubahan performance, cek production:

```txt
[ ] Homepage terbuka normal
[ ] Login email/password normal
[ ] Login Google normal
[ ] Dashboard first load terasa cepat
[ ] Dashboard tidak full reload berat saat balik dari halaman lain
[ ] Tambah transaksi manual dari dashboard terasa instan
[ ] Tambah transaksi manual dari /transactions terasa instan
[ ] Edit transaksi terasa instan
[ ] Delete transaksi terasa instan
[ ] Quick Transaction 3-5 item terasa cepat
[ ] Urutan transaksi tanggal sama: input terbaru tampil lebih atas
[ ] Safe-to-Spend tetap tampil
[ ] Financial Checkup tetap tampil
[ ] AI Assistant tetap bisa menjawab
[ ] Export tetap normal
[ ] Profile tetap normal
[ ] Goals tetap normal
```

---

## 13. Current Recommendation

Karena production sudah terasa cepat setelah region diperbaiki, jangan langsung melakukan refactor besar seperti split summary endpoint.

Rekomendasi saat ini:

```txt
1. Pertahankan arsitektur sekarang.
2. Dokumentasikan deployment region rule.
3. Jalankan final regression.
4. Lanjut fitur baru hanya setelah core CRUD dan dashboard tetap stabil.
```