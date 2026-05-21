# Sakuin AI Specification

Dokumen ini menjelaskan spesifikasi fitur **Asisten Sakuin**, yaitu AI financial helper di dalam Sakuin yang membantu user memahami kondisi keuangan pribadi, membaca ringkasan pemasukan/pengeluaran, menganalisis transaksi, membaca goals, memberi saran hemat ringan, menganalisis skenario finansial sederhana, dan membuat draft transaksi dari chat natural.

Dokumen ini wajib menjadi acuan sebelum mengubah backend atau frontend AI.

---

## 1. Product Goal

Asisten Sakuin dibuat agar Sakuin tidak hanya menjadi aplikasi pencatat transaksi seperti spreadsheet.

Tujuan utama:

```txt
[✓] Membantu user memahami kondisi keuangan pribadi
[✓] Membantu user melihat pengeluaran, pemasukan, saldo, dan goals dengan bahasa sederhana
[✓] Memberi insight dan saran hemat yang ringan, aman, dan tidak menghakimi
[✓] Membantu user bertanya bebas tanpa harus menghafal command
[✓] Membantu user membuat draft transaksi dari chat natural
[✓] Membantu user mencatat banyak transaksi sekaligus dari satu prompt
[✓] Mengurangi effort input manual agar Sakuin lebih efektif daripada pencatatan spreadsheet
```

Asisten Sakuin bukan:

```txt
[✗] penasihat investasi
[✗] penasihat pinjaman
[✗] penasihat pajak/hukum
[✗] AI umum untuk menjawab semua pertanyaan
[✗] sistem auto-save transaksi tanpa review user
[✗] sistem yang boleh mengarang data transaksi, goals, saldo, atau kategori
[✗] sistem yang boleh membaca atau menampilkan data user lain
```

---

## 2. Current AI Status

Status Asisten Sakuin saat ini:

```txt
[✓] Route /asisten tersedia
[✓] Floating AI launcher tersedia di authenticated pages
[✓] Financial-only intent classifier tersedia
[✓] Out-of-scope guardrail tersedia
[✓] Backend Gemini provider foundation tersedia
[✓] AI provider router tersedia
[✓] Default/complex/fallback model routing tersedia
[✓] Safe AI financial context aggregation tersedia
[✓] AI chat endpoint tersedia
[✓] AI chat endpoint security tests tersedia
[✓] Rule-based fallback response tersedia
[✓] Financial scenario analyzer tersedia
[✓] Chat history lokal tersedia di /asisten
[✓] Clear chat history dialog tersedia
[✓] Follow-up context dari chat history tersedia
[✓] Transaction draft engine rule-based tersedia
[✓] Single transaction draft tersedia
[✓] Multi transaction draft tersedia
[✓] transactionDraft backward compatibility tersedia
[✓] transactionDrafts array tersedia
[✓] Draft bisa disimpan satu per satu
[✓] Draft bisa dibatalkan satu per satu
[✓] Banyak draft bisa disimpan sekaligus melalui Simpan Semua Draft
[✓] Draft yang dibatalkan tidak bisa disimpan
[✓] Draft yang sudah tersimpan tidak bisa disimpan ulang
[✓] AI transaction draft tidak auto-save
[✓] AI transaction draft tidak memanggil Gemini
[✓] UI /asisten tidak auto-scroll saat save/cancel/save all
[✓] Assistant message memakai typewriter effect ringan tanpa memaksa scroll user
[✓] GitHub Actions CI passed
[✓] Vercel deployment passed
```

---

## 3. Feature Name

Nama fitur user-facing:

```txt
Asisten Sakuin
```

Nama internal:

```txt
Sakuin AI Financial Helper
```

Route utama:

```txt
/asisten
```

Endpoint utama:

```txt
POST /api/ai/chat
```

---

## 4. UI Placement

Asisten Sakuin ditempatkan sebagai floating action button di halaman authenticated.

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

## 5. Main User Experience

User tidak wajib memakai slash command.

User bisa bertanya natural:

```txt
pengeluaran saya bulan ini gimana?
saya boros di mana minggu ini?
bandingkan bulan ini dengan bulan lalu
apakah saldo saya masih aman?
apa saran hemat untuk bulan ini?
goal saya realistis nggak?
gaji saya 8 juta ingin beli motor 30 juta, realistis nggak?
catat makan ayam geprek 15000 tadi siang
catat makan 12000 minum 4000 cimol 4000 cireng 5000
dikasih kakak 100000
bensin 30000 kemarin
```

Backend mengklasifikasikan maksud user menjadi intent internal.

Frontend menampilkan:

```txt
[✓] User bubble
[✓] Assistant bubble
[✓] Intent badge
[✓] Cards ringkasan
[✓] Suggested prompts
[✓] Transaction draft panel
[✓] Multi draft panel
[✓] Simpan Draft
[✓] Batalkan Draft
[✓] Simpan Semua Draft
[✓] Clear chat history dialog
```

---

## 6. Supported Intents

Intent yang didukung:

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
saldo saya aman nggak?
```

### SPENDING_ANALYSIS

Menganalisis pengeluaran.

Contoh:

```txt
saya boros di mana?
pengeluaran terbesar saya apa?
kategori apa yang paling banyak bulan ini?
kenapa pengeluaran saya besar?
```

### INCOME_ANALYSIS

Menganalisis pemasukan.

Contoh:

```txt
pemasukan saya bulan ini berapa?
pemasukan saya naik atau turun?
sumber pemasukan terbesar saya apa?
```

### PERIOD_COMPARISON

Membandingkan periode.

Contoh:

```txt
bandingkan bulan ini dengan bulan lalu
pengeluaran minggu ini dibanding minggu lalu gimana?
bulan ini lebih boros atau lebih hemat?
```

### SAVING_ADVICE

Memberi saran hemat yang aman dan ringan.

Contoh:

```txt
kasih saran hemat
apa yang harus saya kurangi bulan ini?
bagaimana cara menekan pengeluaran?
```

### GOAL_ANALYSIS

Membantu membaca goal tabungan dan skenario finansial sederhana.

Contoh:

```txt
goal saya aman nggak?
target dana darurat saya progresnya gimana?
gaji saya 8 juta ingin beli motor 30 juta, realistis nggak?
kalau 8 bulan gimana?
kalau tenor 12 sampai 32 bulan gimana?
```

### TRANSACTION_DRAFT

Membuat draft transaksi dari chat natural.

Contoh single draft:

```txt
catat makan ayam geprek 15000
dikasih kakak 100000
bensin 30000 kemarin
```

Contoh multi draft:

```txt
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

Output multi draft harus menghasilkan beberapa draft:

```txt
Draft 1: makan, Rp12.000
Draft 2: minum, Rp4.000
Draft 3: cimol, Rp4.000
Draft 4: cireng, Rp5.000
```

Penting:

```txt
AI hanya membuat draft.
AI tidak boleh langsung menyimpan transaksi final tanpa review user.
AI transaction draft wajib rule-based dan tidak memanggil Gemini.
```

### OUT_OF_SCOPE

Pertanyaan di luar finansial Sakuin.

Contoh:

```txt
buatkan cerpen
jelaskan sejarah Majapahit
buatkan kode React
siapa istri Naruto?
siapa presiden sekarang?
```

Response:

```txt
Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.
```

---

## 7. Financial-Only Guardrail

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
perbandingan periode
saran hemat ringan
draft transaksi
skenario finansial pribadi sederhana
```

Asisten Sakuin harus menolak:

```txt
pertanyaan umum di luar finansial
coding
politik
hiburan
kesehatan
hukum
pajak profesional
investasi spesifik
pinjaman spesifik
prediksi finansial pasti
permintaan yang meminta AI mengarang data pribadi
```

Out-of-scope tidak boleh memanggil Gemini.

---

## 8. Advice Policy

AI boleh memberi:

```txt
[✓] saran hemat ringan
[✓] saran mengurangi kategori tertentu
[✓] saran membuat batas mingguan
[✓] saran mengevaluasi transaksi kecil
[✓] saran melihat kategori terbesar
[✓] analisis rasio sederhana terhadap pemasukan
[✓] peringatan risiko ringan untuk skenario pembelian
[✓] saran membuat prioritas tabungan
```

AI tidak boleh memberi:

```txt
[✗] rekomendasi investasi spesifik
[✗] rekomendasi pinjaman
[✗] rekomendasi tenor pinjaman sebagai keputusan final
[✗] klaim pasti tentang kondisi finansial masa depan
[✗] saran pajak/hukum profesional
[✗] saran yang menghakimi user
[✗] komentar seperti "gaji kamu kecil"
[✗] keputusan final seperti "wajib beli" atau "pasti aman"
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

## 9. Response Style

Jawaban default harus:

```txt
singkat
jelas
langsung ke inti
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

Jika user bertanya realistis/tidak, jawaban harus dimulai dengan verdict:

```txt
Cukup realistis, tetapi perlu dijaga.
Berisiko, karena cicilan/target bulanannya terlalu besar.
Belum bisa disimpulkan karena data nominalnya belum lengkap.
```

Untuk skenario pembelian/kredit/tenor:

```txt
[✓] Hitung kebutuhan per bulan
[✓] Bandingkan dengan pemasukan jika user memberi pemasukan
[✓] Jelaskan risiko utama
[✓] Jelaskan bahwa bunga/biaya tambahan belum dihitung jika memang belum ada
[✓] Beri saran aman dan ringan
[✗] Jangan langsung menyuruh user membeli
[✗] Jangan memberi keputusan finansial profesional
```

---

## 10. Data Sent to AI

Backend tidak boleh langsung mengirim semua transaksi mentah.

Data yang boleh dikirim untuk konteks finansial:

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
  "previousPeriodIncome": 1400000,
  "goalsSummary": {
    "totalGoals": 3,
    "completedGoals": 1,
    "activeGoals": 2,
    "totalTargetAmount": 5000000,
    "totalCurrentAmount": 2000000
  }
}
```

Data yang tidak boleh dikirim ke AI provider:

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
full export content
raw audit metadata
```

Catatan:

```txt
Financial context harus berupa agregasi aman.
AI tidak boleh menerima seluruh daftar transaksi mentah untuk MVP.
Jika di masa depan diperlukan detail transaksi, harus melalui desain privacy khusus.
```

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
Out-of-scope guardrail
  ↓
Financial data aggregation
  ↓
Provider router / rule-based engine
  ↓
Output validation
  ↓
Response to frontend
```

API key AI hanya disimpan di backend environment variable.

---

## 12. Provider and Routing

Provider awal:

```txt
Gemini API
```

Provider dipanggil hanya dari backend.

Frontend tidak boleh menerima API key AI.

Environment backend:

```env
GEMINI_API_KEY="..."
GEMINI_MODEL_DEFAULT="..."
GEMINI_MODEL_COMPLEX="..."
GEMINI_MODEL_FALLBACK="..."
```

Aturan routing:

```txt
Simple financial assistant  : default model
Complex financial analysis  : complex model
Provider error              : fallback model atau rule-based fallback
Out-of-scope                : tidak memanggil provider
Transaction draft           : tidak memanggil provider, wajib rule-based
```

Alasan transaction draft tidak memakai Gemini:

```txt
[✓] Lebih hemat rate limit
[✓] Lebih deterministik
[✓] Lebih mudah dites
[✓] Lebih aman untuk pencatatan transaksi
[✓] Mengurangi risiko AI mengarang nominal/kategori
```

---

## 13. Backend Endpoint

Endpoint:

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

Response body umum:

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

Response body single transaction draft:

```json
{
  "reply": "Saya membuat 1 draft transaksi. Silakan review dulu sebelum disimpan.",
  "intent": "TRANSACTION_DRAFT",
  "cards": [
    {
      "label": "Jumlah draft",
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
```

Response body multi transaction draft:

```json
{
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
    }
  ]
}
```

Catatan compatibility:

```txt
transactionDraft tetap dikirim sebagai draft pertama untuk backward compatibility.
transactionDrafts adalah sumber utama untuk multi draft.
Frontend harus mendukung keduanya.
```

---

## 14. Transaction Draft Policy

Jika user meminta AI mencatat transaksi, AI hanya boleh membuat draft.

AI tidak boleh langsung menyimpan transaksi.

Prinsip:

```txt
[✓] Draft-first
[✓] User review first
[✓] User-controlled save
[✓] User-controlled cancel
[✓] No auto-save
[✓] No Gemini call for transaction draft
[✓] Rule-based parser
[✓] Deterministic behavior
```

Frontend wajib menyediakan review flow:

```txt
[✓] Simpan Draft
[✓] Batalkan Draft
[✓] Simpan Semua Draft untuk multi draft
[✓] Status Sudah disimpan
[✓] Status Dibatalkan
[✓] Draft belum lengkap tidak bisa disimpan
[✓] Draft yang dibatalkan tidak bisa disimpan
[✓] Draft yang sudah disimpan tidak bisa disimpan ulang
```

Frontend saat ini belum wajib menyediakan:

```txt
[ ] Edit draft langsung dari chat
[ ] Ubah kategori langsung dari chat draft panel
[ ] Ubah nominal langsung dari chat draft panel
[ ] Merge/split draft dari UI chat
```

Fitur edit draft dapat menjadi fase lanjutan karena lebih kompleks dan perlu desain UX khusus.

---

## 15. Multi Transaction Draft UX

Contoh input:

```txt
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

Target hasil:

```txt
Draft 1: makan, Rp12.000, Makanan
Draft 2: minum, Rp4.000, Minuman
Draft 3: cimol, Rp4.000, Makanan
Draft 4: cireng, Rp5.000, Makanan
```

UI harus menyediakan:

```txt
[✓] Panel per draft
[✓] Simpan Draft per item
[✓] Batalkan Draft per item
[✓] Simpan Semua Draft
[✓] Ringkasan jumlah draft siap disimpan
[✓] Total nominal draft yang siap disimpan
[✓] Save batch secara parallel
[✓] Input chat tidak dikunci saat draft sedang disimpan
[✓] Suggestion "Simpan semua" tidak boleh muncul sebagai prompt AI
```

State saved/cancelled harus berbasis draft key:

```txt
${message.id}:${draftIndex}
```

Contoh:

```txt
message-abc:0
message-abc:1
message-abc:2
message-abc:3
```

Alasan:

```txt
Satu assistant message bisa memuat banyak draft.
Jika state hanya memakai message.id, maka semua draft akan dianggap sama.
```

Backward compatibility:

```txt
Untuk localStorage lama, draft index 0 boleh tetap membaca message.id lama.
```

---

## 16. Cancel Draft Policy

Draft bisa dibatalkan melalui:

```txt
[✓] Tombol Batalkan Draft
[✓] Chat command natural
```

Contoh command batal:

```txt
batal
batalkan
cancel
batalin
hapus draft
batalkan draft
tidak jadi
ga jadi
gak jadi
nggak jadi
```

Behavior:

```txt
[✓] Draft aktif terakhir dibatalkan
[✓] Jika multi draft aktif, semua draft aktif di message terakhir dapat dibatalkan
[✓] Draft yang sudah dibatalkan tidak bisa disimpan
[✓] Assistant memberi konfirmasi natural
[✓] Cancel draft tidak dianggap out-of-scope
```

---

## 17. Frontend Chat UX Rules

Route:

```txt
/asisten
```

Layout:

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
Transaction draft panel
Multi draft action panel

Input:
"Tanya keuangan atau catat transaksi..."
```

UX rules:

```txt
[✓] Header dan input tetap nyaman di mobile
[✓] Chat history tersimpan lokal
[✓] User bisa hapus chat history
[✓] Draft saved/cancelled state tersimpan lokal
[✓] Assistant message boleh memakai typewriter effect ringan
[✓] Typewriter effect tidak boleh memaksa scroll otomatis
[✓] Save draft tidak boleh memaksa scroll otomatis
[✓] Cancel draft tidak boleh memaksa scroll otomatis
[✓] Save all draft tidak boleh memaksa scroll otomatis
[✓] User tetap memegang kontrol posisi scroll
```

Dilarang:

```txt
[✗] Auto-scroll setiap messages berubah
[✗] Auto-scroll saat save draft
[✗] Auto-scroll saat cancel draft
[✗] Auto-scroll saat save all draft
[✗] Mengunci input chat hanya karena draft sedang disimpan
[✗] Mengirim "Simpan semua" sebagai prompt ke AI
```

---

## 18. Local Storage Policy

Data yang boleh disimpan di localStorage frontend:

```txt
chat history lokal
saved draft keys
cancelled draft keys
goal priority lokal jika masih dipakai
auth token saat ini masih MVP behavior
```

AI chat localStorage keys:

```txt
sakuin_ai_chat_history_v1:<userId>
sakuin_ai_saved_draft_ids_v1:<userId>
sakuin_ai_cancelled_draft_ids_v1:<userId>
```

Catatan:

```txt
Chat history lokal hanya untuk UX di perangkat user.
Chat history tidak boleh dianggap sebagai sumber data utama backend.
Clear chat history harus menghapus chat history dan draft state lokal.
```

---

## 19. Rate Limit

Endpoint AI harus punya rate limit.

Tujuan:

```txt
mengontrol biaya
mencegah spam
mencegah abuse
menjaga latency
mengurangi risiko Gemini quota habis
```

Rekomendasi:

```txt
Development : boleh lebih longgar
Production  : batasi berdasarkan user/IP sesuai kebutuhan
```

Catatan:

```txt
Out-of-scope sebaiknya diproses murah dan tidak memanggil Gemini.
Transaction draft rule-based sehingga tidak memakai Gemini quota.
```

---

## 20. Logging and Audit

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
provider route
model name aman
fallback status
```

Tidak boleh log:

```txt
raw message penuh jika mengandung data transaksi
AI API key
token
email
raw financial detail
full AI response jika terlalu sensitif
password
Authorization header
raw request body
```

Audit event kandidat:

```txt
ai.chat_requested
ai.chat_completed
ai.chat_failed
ai.out_of_scope_blocked
ai.transaction_draft_generated
ai.provider_used
ai.provider_fallback
```

Jika audit event AI disimpan ke database:

```txt
[✓] metadata harus disanitasi
[✓] jangan simpan prompt penuh
[✓] jangan simpan response penuh
[✓] jangan simpan nominal/detail transaksi mentah tanpa alasan kuat
[✓] jangan simpan token/email/Authorization/raw body
```

---

## 21. Validation and Testing

Backend AI validation commands:

```bash
pnpm --filter @sakuin/api test -- tests/ai-intent.test.ts
pnpm --filter @sakuin/api test -- tests/ai-chat-service.test.ts
pnpm --filter @sakuin/api test -- tests/ai-financial-scenario.test.ts
pnpm --filter @sakuin/api test -- tests/ai-transaction-draft.test.ts
pnpm --filter @sakuin/api typecheck
pnpm --filter @sakuin/api test
pnpm --filter @sakuin/api build
```

Frontend AI validation commands:

```bash
pnpm --filter @sakuin/web typecheck
pnpm --filter @sakuin/web test
pnpm --filter @sakuin/web build
```

Manual test AI transaction draft:

```txt
catat makan ayam geprek 15000
dikasih kakak 100000
bensin 30000 kemarin
catat makan 12000 minum 4000 cimol 4000 cireng 5000
```

Manual checklist:

```txt
[ ] Single draft muncul
[ ] Multi draft muncul
[ ] Simpan Draft bekerja
[ ] Batalkan Draft bekerja
[ ] Simpan Semua Draft bekerja
[ ] Draft yang sudah disimpan tidak bisa disimpan ulang
[ ] Draft yang dibatalkan tidak bisa disimpan
[ ] Refresh page mempertahankan state saved/cancelled
[ ] Clear chat history membersihkan chat dan draft state
[ ] Tidak ada auto-scroll saat save/cancel/save all
[ ] Tidak ada suggestion "Simpan semua" sebagai prompt AI
[ ] Halaman Transactions menampilkan transaksi yang disimpan
[ ] CI passed
[ ] Deployment passed
```

Manual test guardrail:

```txt
siapa istri Naruto?
buatkan cerpen
buatkan kode React
jelaskan sejarah Majapahit
```

Expected:

```txt
Asisten menolak dengan sopan karena topik di luar finansial Sakuin.
```

Manual test financial scenario:

```txt
gaji saya 8 juta ingin beli motor 30 juta, realistis nggak?
kalau 8 bulan gimana?
kalau tenor 12 sampai 32 bulan gimana?
```

Expected:

```txt
Asisten memberi verdict, hitungan kebutuhan per bulan, risiko utama, dan saran aman.
```

---

## 22. Implementation Phases

### Phase 26A — AI Specification

```txt
[✓] docs/AI.md dibuat
[✓] scope AI disepakati
[✓] provider disepakati
[✓] route disepakati
[✓] guardrail disepakati
```

### Phase 26B — Backend Foundation

```txt
[✓] AI intent classifier
[✓] Gemini provider foundation
[✓] AI provider abstraction
[✓] Provider router
[✓] Default/complex/fallback route
[✓] POST /api/ai/chat
[✓] AI chat service contract
[✓] Endpoint security tests
[✓] Safe financial context aggregation
[✓] Rule-based fallback response
[✓] Financial scenario analyzer
```

### Phase 26C — Frontend Foundation

```txt
[✓] route /asisten
[✓] Floating AI button di AppShell
[✓] AsistenPage
[✓] chat UI
[✓] suggested prompts
[✓] loading/error states
[✓] local chat history
[✓] clear history dialog
[✓] mobile chat layout polish
[✓] typewriter effect ringan tanpa auto-scroll
```

### Phase 26D — AI Transaction Draft

```txt
[✓] TRANSACTION_DRAFT intent
[✓] Rule-based transaction draft parser
[✓] Single draft response
[✓] Multi draft response
[✓] transactionDraft backward compatibility
[✓] transactionDrafts array
[✓] Frontend render single draft
[✓] Frontend render multi draft
[✓] Simpan Draft per item
[✓] Batalkan Draft per item
[✓] Simpan Semua Draft
[✓] Saved/cancelled state per draft key
[✓] Cancel draft via chat text
[✓] No auto-save
[✓] No Gemini call for transaction draft
[✓] No auto-scroll saat draft action
```

### Phase 26E — Complex Financial Analysis

Status:

```txt
[ ] Belum dimulai sebagai fase penuh
```

Target:

```txt
[ ] financial health snapshot
[ ] cashflow bulanan
[ ] kategori boros 3-6 bulan
[ ] tren pengeluaran
[ ] rasio pengeluaran terhadap pemasukan
[ ] deteksi kenaikan tidak biasa
[ ] rekomendasi batas mingguan
[ ] analisis progress goals
[ ] saran prioritas tabungan
[ ] financial health score sederhana
```

---

## 23. Current Decision

Keputusan saat ini:

```txt
Feature name       : Asisten Sakuin
Route              : /asisten
Entry point        : floating button di AppShell
Provider           : Gemini API via backend only
Routing            : default/complex/fallback provider routing
Transaction draft  : rule-based only, no Gemini call
Scope              : financial-only personal finance assistant
Output style       : short, practical, non-overwhelming
Data policy        : aggregated financial context only
Save policy        : draft-first, user review, no auto-save
Multi draft policy : supports transactionDrafts array and Simpan Semua Draft
UX policy          : no forced auto-scroll; user controls scroll position
```

---

## 24. Non-Negotiable Rules

```txt
Jangan panggil AI provider dari frontend.
Jangan expose GEMINI_API_KEY ke frontend.
Jangan jawab pertanyaan di luar finansial Sakuin.
Jangan kirim semua transaksi mentah ke AI untuk MVP.
Jangan kirim token/email/password ke AI.
Jangan auto-save transaksi dari AI.
Jangan memakai Gemini untuk transaction draft.
Jangan memberi saran investasi/pinjaman/pajak/hukum profesional.
Jangan membuat output panjang secara default.
Jangan tampilkan ID database/internal ke user.
Jangan mengarang data transaksi/goals/saldo.
Jangan mencampur data user lain.
Jangan membuat log/audit berisi prompt penuh jika sensitif.
Jangan membuat UX yang memaksa auto-scroll saat user sedang membaca chat.
```

---

## 25. Known Limitations

Keterbatasan saat ini:

```txt
[ ] Edit draft langsung dari chat belum tersedia
[ ] Ubah kategori draft langsung dari chat belum tersedia
[ ] Ubah nominal draft langsung dari chat belum tersedia
[ ] Persistent server-side chat history belum tersedia
[ ] AI memory lintas device belum tersedia
[ ] Financial health score belum tersedia
[ ] Insight 3-6 bulan belum tersedia
[ ] Budgeting per category belum tersedia
[ ] Gmail/e-wallet transaction detection belum tersedia
[ ] AI belum boleh membaca transaksi mentah lengkap
```

Catatan:

```txt
Keterbatasan ini disengaja agar fitur AI tetap aman, murah, deterministik, dan mudah divalidasi.
```

---

## 26. Future Roadmap

Prioritas lanjutan yang direkomendasikan:

```txt
1. Final documentation sync:
   [ ] docs/AI.md
   [ ] docs/API.md
   [ ] docs/HANDOFF.md
   [ ] docs/SECURITY.md jika perlu

2. Phase 26E.1 — Financial Health Snapshot:
   [ ] ringkasan kesehatan finansial sederhana
   [ ] rasio pengeluaran/pemasukan
   [ ] safe balance awareness
   [ ] status aman/waspada/berisiko

3. Phase 26E.2 — Spending Pattern Insight:
   [ ] kategori boros
   [ ] tren 3-6 bulan
   [ ] kenaikan tidak biasa
   [ ] rekomendasi batas mingguan

4. Phase 26E.3 — Goal and Purchase Scenario Polish:
   [ ] analisis goals lebih detail
   [ ] skenario pembelian
   [ ] estimasi kebutuhan tabungan bulanan
   [ ] risiko jika target terlalu agresif

5. Phase 26F — Transaction Draft Editing:
   [ ] edit draft amount
   [ ] edit draft category
   [ ] edit draft date
   [ ] edit draft note
   [ ] save edited draft

6. Future sensitive integrations:
   [ ] Gmail transaction detection
   [ ] e-wallet transaction detection
   [ ] bank statement import
   [ ] privacy policy
   [ ] explicit user consent
   [ ] token encryption jika diperlukan
```

---

## 27. Developer Notes

File penting backend:

```txt
apps/api/src/modules/ai/ai.intent.ts
apps/api/src/modules/ai/ai.provider.ts
apps/api/src/modules/ai/ai.provider-router.ts
apps/api/src/modules/ai/ai.service.ts
apps/api/src/modules/ai/ai.types.ts
apps/api/src/modules/ai/ai-financial-context.ts
apps/api/src/modules/ai/ai-financial-scenario.ts
apps/api/src/modules/ai/ai-transaction-draft.ts
apps/api/src/modules/ai/ai.route.ts
```

File penting frontend:

```txt
apps/web/src/features/ai/ai.types.ts
apps/web/src/features/ai/ai.service.ts
apps/web/src/features/ai/pages/AsistenPage.tsx
apps/web/src/components/layout/AppShell.tsx
```

Test penting:

```txt
apps/api/tests/ai-intent.test.ts
apps/api/tests/ai-chat-service.test.ts
apps/api/tests/ai-financial-scenario.test.ts
apps/api/tests/ai-transaction-draft.test.ts
```

Aturan sebelum mengubah AI:

```txt
[ ] Pahami apakah perubahan menyentuh backend, frontend, atau keduanya
[ ] Jangan ubah parser transaction draft tanpa test
[ ] Jangan ubah provider router tanpa test
[ ] Jangan ubah guardrail tanpa out-of-scope regression
[ ] Jangan ubah schema response tanpa update frontend type
[ ] Jangan ubah frontend draft state tanpa test manual refresh/localStorage
[ ] Jangan ubah database/migration untuk AI kecuali benar-benar perlu
```

---

## 28. Documentation Update Checklist

Setelah mengubah AI feature, update dokumen terkait:

```txt
[ ] docs/AI.md
[ ] docs/API.md jika response endpoint berubah
[ ] docs/HANDOFF.md jika status fase berubah
[ ] docs/SECURITY.md jika ada perubahan security/privacy
[ ] README.md jika ada perubahan produk besar
```

Untuk perubahan dokumentasi saja, validasi minimal:

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