# Sakuin AI Specification

Dokumen ini menjelaskan spesifikasi awal fitur **Asisten Sakuin**, yaitu AI financial helper untuk membantu user memahami kondisi keuangan pribadi, bertanya tentang transaksi, melihat ringkasan pemasukan/pengeluaran, mendapatkan saran hemat, dan nantinya membuat draft transaksi dari chat natural.

Dokumen ini wajib menjadi acuan sebelum implementasi backend atau frontend AI.

---

## 1. Product Goal

Asisten Sakuin dibuat untuk membuat Sakuin lebih dari sekadar aplikasi pencatat transaksi.

Tujuan utama:

```txt
[✓] Membantu user memahami kondisi keuangan pribadi
[✓] Membantu user melihat pengeluaran, pemasukan, dan saldo dengan bahasa sederhana
[✓] Memberi insight dan saran hemat yang ringan, aman, dan tidak menghakimi
[✓] Membantu user bertanya bebas tanpa harus menghafal command
[✓] Nantinya membantu user membuat draft transaksi dari chat natural
```

Asisten Sakuin bukan:

```txt
[✗] penasihat investasi
[✗] penasihat pinjaman
[✗] penasihat pajak/hukum
[✗] AI umum untuk menjawab semua pertanyaan
[✗] sistem yang menyimpan transaksi otomatis tanpa review user
```

---

## 2. Feature Name

Nama fitur:

```txt
Asisten Sakuin
```

Nama internal:

```txt
Sakuin AI Financial Helper
```

---

## 3. UI Placement

Asisten Sakuin akan ditempatkan sebagai floating action button di seluruh halaman authenticated.

Halaman yang menampilkan floating button:

```txt
/dashboard
/transactions
/goals
/categories
/export
/profile
```

Button tidak tampil di halaman public/auth:

```txt
/
/login
/register
/forgot-password
/reset-password
```

Lokasi button:

```txt
Desktop : fixed bottom-right
Mobile  : fixed right, above bottom navigation
```

Saat diklik, user diarahkan ke:

```txt
/asisten
```

Route `/asisten` adalah room chat utama Asisten Sakuin.

---

## 4. Main User Experience

User tidak wajib menggunakan slash command.

User bisa bertanya natural, misalnya:

```txt
pengeluaran saya bulan ini gimana?
saya boros di mana minggu ini?
bandingkan bulan ini dengan bulan lalu
apakah saldo saya masih aman?
apa saran hemat untuk bulan ini?
catat makan ayam geprek 15000 tadi siang
```

Sistem backend akan mengklasifikasikan maksud user menjadi intent internal.

---

## 5. Supported Intents

MVP intent:

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

### FINANCIAL_SUMMARY

Menjawab pertanyaan ringkasan kondisi keuangan.

Contoh:

```txt
pengeluaran dan pemasukan saya bulan ini gimana?
keuangan saya bulan ini aman nggak?
```

### SPENDING_ANALYSIS

Menganalisis pengeluaran.

Contoh:

```txt
saya boros di mana?
pengeluaran terbesar saya apa?
kategori apa yang paling banyak bulan ini?
```

### INCOME_ANALYSIS

Menganalisis pemasukan.

Contoh:

```txt
pemasukan saya bulan ini berapa?
pemasukan saya naik atau turun?
```

### PERIOD_COMPARISON

Membandingkan periode.

Contoh:

```txt
bandingkan bulan ini dengan bulan lalu
pengeluaran minggu ini dibanding minggu lalu gimana?
```

### SAVING_ADVICE

Memberi saran hemat yang aman.

Contoh:

```txt
kasih saran hemat
apa yang harus saya kurangi bulan ini?
```

### GOAL_ANALYSIS

Membantu membaca goal tabungan.

Contoh:

```txt
goal saya aman nggak?
target dana darurat saya progresnya gimana?
```

### TRANSACTION_DRAFT

Membuat draft transaksi dari chat natural.

Contoh:

```txt
catat makan ayam geprek 15000 tadi siang
dikasih kakak 100000
bensin 30000 kemarin
```

Penting:

```txt
AI hanya membuat draft.
AI tidak boleh langsung menyimpan transaksi final tanpa review user.
```

### OUT_OF_SCOPE

Pertanyaan di luar finansial Sakuin.

Contoh:

```txt
buatkan cerpen
jelaskan sejarah Majapahit
buatkan kode React
siapa presiden sekarang?
```

Response:

```txt
Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.
```

---

## 6. Financial-Only Guardrail

Asisten Sakuin hanya boleh menjawab topik:

```txt
transaksi
pemasukan
pengeluaran
kategori
goals
budget
safe balance
ringkasan keuangan
saran hemat ringan
draft transaksi
```

Asisten Sakuin harus menolak:

```txt
pertanyaan umum di luar finansial
coding
politik
kesehatan
hukum
pajak profesional
investasi spesifik
pinjaman
prediksi finansial pasti
```

---

## 7. Advice Policy

AI boleh memberi:

```txt
[✓] saran hemat ringan
[✓] saran mengurangi kategori tertentu
[✓] saran membuat batas mingguan
[✓] saran mengevaluasi transaksi kecil
[✓] saran melihat kategori terbesar
```

AI tidak boleh memberi:

```txt
[✗] rekomendasi investasi spesifik
[✗] rekomendasi pinjaman
[✗] klaim pasti tentang kondisi finansial masa depan
[✗] saran yang menghakimi user
[✗] komentar seperti "gaji kamu kecil"
```

Contoh kalimat yang benar:

```txt
Dengan pemasukan bulan ini Rp1.500.000, pengeluaran makanan Rp500.000 berarti sekitar 33% dari pemasukan. Angka ini cukup besar, jadi kamu bisa mencoba menurunkannya secara bertahap.
```

Contoh kalimat yang tidak boleh:

```txt
Gaji kamu kecil, jadi kamu harus berhenti membeli makanan di luar.
```

---

## 8. Response Style

Jawaban default harus:

```txt
singkat
jelas
tidak overwhelming
tidak terlalu teknis
tidak memakai istilah database/provider
tidak menampilkan ID internal
tidak menampilkan detail terlalu panjang kecuali diminta
```

Format default:

```txt
1. Ringkasan utama
2. Angka penting
3. Saran singkat
```

Contoh:

```txt
Pengeluaranmu bulan ini Rp500.000 dari 24 transaksi.

Kategori terbesar adalah Makanan sebesar Rp300.000. Jika pemasukan bulan ini Rp1.500.000, maka pengeluaran makanan sekitar 20% dari pemasukan.

Saran: coba batasi pengeluaran makanan sekitar Rp70.000 per minggu agar saldo tetap lebih aman.
```

---

## 9. Data Sent to AI

Backend tidak boleh langsung mengirim semua transaksi mentah.

Data yang boleh dikirim untuk MVP:

```json
{
  "period": "bulan ini",
  "totalIncome": 1500000,
  "totalExpense": 500000,
  "balance": 1000000,
  "safeBalanceLimit": 50000,
  "transactionCount": 24,
  "topExpenseCategories": [
    {
      "name": "Makanan",
      "amount": 300000,
      "percentageOfExpense": 60,
      "percentageOfIncome": 20
    }
  ],
  "incomeThisMonth": 1500000,
  "expenseThisMonth": 500000,
  "previousPeriodExpense": 450000,
  "previousPeriodIncome": 1400000
}
```

Data yang tidak boleh dikirim ke AI:

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
```

---

## 10. Transaction Draft Policy

Jika user meminta AI mencatat transaksi, AI hanya boleh membuat draft.

Contoh response:

```txt
Saya menemukan 3 draft transaksi:

1. Pengeluaran — Makanan — Rp15.000 — ayam geprek
2. Pemasukan — Hadiah/Keluarga — Rp100.000 — dikasih kakak
3. Pengeluaran — Transport — Rp30.000 — bensin

Silakan cek dulu sebelum disimpan.
```

Frontend wajib menyediakan review flow:

```txt
[ ] edit draft
[ ] hapus draft
[ ] simpan draft
[ ] batal
```

AI tidak boleh auto-save transaksi.

---

## 11. Backend Architecture

Frontend tidak boleh memanggil AI provider secara langsung.

Arsitektur:

```txt
Frontend
  ↓
POST /api/ai/chat
  ↓
Backend auth middleware
  ↓
AI intent classifier
  ↓
Financial data aggregation
  ↓
AI provider abstraction
  ↓
Output validation
  ↓
Response to frontend
```

API key AI hanya disimpan di backend environment variable.

---

## 12. Provider

Provider awal:

```txt
Gemini API
```

Model awal:

```txt
gemini-2.5-flash-lite
```

Jika hasil kurang bagus, evaluasi:

```txt
gemini-2.5-flash
```

Environment variable backend:

```env
GEMINI_API_KEY="..."
```

Jangan pernah memakai prefix `VITE_` untuk secret AI.

---

## 13. Backend Endpoint

Endpoint MVP:

```txt
POST /api/ai/chat
```

Auth:

```txt
Required
```

Request body:

```json
{
  "message": "pengeluaran saya bulan ini gimana?"
}
```

Response body:

```json
{
  "reply": "Pengeluaranmu bulan ini Rp500.000 dari 24 transaksi...",
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
```

---

## 14. Rate Limit

Endpoint AI harus punya rate limit.

Rekomendasi awal:

```txt
10 request per user per hari
```

Untuk development bisa lebih longgar.

Alasan:

```txt
mengontrol biaya
mencegah spam
mencegah abuse
menjaga latency
```

---

## 15. Logging and Audit

Log AI tidak boleh menyimpan data sensitif.

Boleh log:

```txt
event type
intent
status
userId
requestId
durationMs
timestamp
```

Tidak boleh log:

```txt
raw message penuh jika mengandung data transaksi
AI API key
token
email
raw financial detail
full AI response jika terlalu sensitif
```

Audit event kandidat:

```txt
ai.chat_requested
ai.chat_completed
ai.chat_failed
ai.out_of_scope_blocked
ai.transaction_draft_generated
```

---

## 16. Frontend UI

Route:

```txt
/asisten
```

Floating button:

```txt
AppShell bottom-right
```

Chat page layout:

```txt
Header:
Asisten Sakuin
"Tanya tentang pengeluaran, pemasukan, goals, atau kondisi keuanganmu."

Suggested prompts:
[Pengeluaran bulan ini gimana?]
[Saya boros di mana?]
[Bandingkan bulan ini dengan bulan lalu]
[Kasih saran hemat]

Chat:
User bubble
AI bubble

Input:
"Tanya tentang transaksi, pengeluaran, pemasukan, goals..."
```

---

## 17. MVP Scope

Phase AI MVP:

```txt
[✓] Floating button
[✓] /asisten page
[✓] Financial-only chat
[✓] Out-of-scope rejection
[✓] Summary/pengeluaran/pemasukan analysis
[✓] Saran hemat ringan
[✓] Backend Gemini provider
[✓] Rate limit
[✓] Safe logging
```

Tidak masuk MVP pertama:

```txt
[ ] cronjob mingguan
[ ] Telegram/WhatsApp notification
[ ] auto-save transaksi
[ ] full free-form financial report panjang
[ ] investment advice
[ ] Gmail/e-wallet transaction detection
```

---

## 18. Implementation Phases

### Phase 26A — Specification

```txt
[ ] docs/AI.md dibuat
[ ] scope AI disepakati
[ ] provider disepakati
[ ] route disepakati
[ ] guardrail disepakati
```

### Phase 26B — Backend Foundation

```txt
[ ] GEMINI_API_KEY env schema
[ ] AI module structure
[ ] AI provider abstraction
[ ] financial-only intent classifier
[ ] POST /api/ai/chat
[ ] rate limit
[ ] tests
```

### Phase 26C — Frontend Foundation

```txt
[ ] route /asisten
[ ] Floating AI button di AppShell
[ ] AsistenPage
[ ] chat UI
[ ] suggested prompts
[ ] loading/error states
```

### Phase 26D — Financial Data Integration

```txt
[ ] aggregate monthly summary
[ ] aggregate category breakdown
[ ] period comparison
[ ] goal summary
[ ] response cards
```

### Phase 26E — Transaction Draft

```txt
[ ] AI transaction draft intent
[ ] draft response format
[ ] review before save
[ ] integration with Quick Transaction flow
```

---

## 19. Non-Negotiable Rules

```txt
Jangan panggil AI provider dari frontend.
Jangan expose GEMINI_API_KEY ke frontend.
Jangan jawab pertanyaan di luar finansial Sakuin.
Jangan kirim semua transaksi mentah ke AI untuk MVP.
Jangan kirim token/email/password ke AI.
Jangan auto-save transaksi dari AI.
Jangan memberi saran investasi/pinjaman/pajak/hukum.
Jangan membuat output panjang secara default.
Jangan tampilkan ID database/internal ke user.
```

---

## 20. Current Decision

Keputusan awal:

```txt
Feature name   : Asisten Sakuin
Route          : /asisten
Entry point    : floating button di AppShell
Provider       : Gemini API
Model awal     : gemini-2.5-flash-lite
Scope          : financial-only personal finance assistant
Output style   : short, practical, non-overwhelming
First MVP      : chat insight + out-of-scope guardrail
Later phase    : transaction draft via AI
```