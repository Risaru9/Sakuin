# Sakuin

**Sakuin** adalah web app keuangan pribadi yang membantu kamu mencatat transaksi, memahami arus uang, memantau target tabungan, dan menjaga kebiasaan finansial tetap rapi — langsung dari HP, tablet, laptop, atau desktop.

Sakuin dibuat untuk pengguna yang ingin mengelola keuangan pribadi dengan cara yang lebih sederhana, cepat, dan nyaman dibanding mencatat manual di spreadsheet, notes, atau chat pribadi.

Dokumentasi arsitektur dan aturan refactor ada di [docs/architecture.md](docs/architecture.md).

---

## Lihat Produk

Website Sakuin sudah bisa diakses melalui production URL berikut:

```txt
https://sakuin-web.vercel.app
```

Buka aplikasi:

[🌐 Buka Sakuin Web App](https://sakuin-web.vercel.app)

Backend API:

```txt
https://sakuin-api.vercel.app
```

Repository:

```txt
https://github.com/Risaru9/Sakuin
```

---

## Apa itu Sakuin?

Sakuin adalah aplikasi pencatatan dan pengelolaan keuangan pribadi berbasis web.

Dengan Sakuin, kamu bisa:

- mencatat pemasukan dan pengeluaran;
- melihat ringkasan kondisi keuangan;
- mengelola kategori transaksi;
- membuat target tabungan;
- mengatur batas saldo aman;
- mencatat transaksi lebih cepat dengan **Catat Cepat**;
- mengekspor data transaksi;
- login dengan email/password atau akun Google;
- melakukan reset password jika lupa akses akun;
- menggunakan aplikasi dari browser atau menginstallnya sebagai PWA.

---

## Masalah yang Ingin Diselesaikan

Banyak orang masih mencatat keuangan pribadi secara manual di banyak tempat:

- spreadsheet;
- catatan HP;
- chat pribadi;
- aplikasi bank;
- ingatan sendiri.

Cara ini sering membuat pencatatan menjadi tidak konsisten, sulit dicek ulang, dan tidak memberi gambaran cepat tentang kondisi keuangan.

Sakuin hadir untuk membantu pengguna menjawab pertanyaan sederhana tetapi penting:

> Uang saya masuk dari mana, keluar ke mana, dan apakah kondisi keuangan saya masih aman?

---

## Solusi yang Ditawarkan Sakuin

Sakuin menggabungkan pencatatan transaksi, ringkasan keuangan, kategori, target tabungan, dan input cepat dalam satu aplikasi yang ringan dan mudah digunakan.

Fokus utama Sakuin adalah:

```txt
Cepat dicatat.
Mudah dipahami.
Nyaman digunakan.
Aman dikembangkan secara bertahap.
```

Sakuin tidak hanya diarahkan sebagai aplikasi pencatat transaksi, tetapi sebagai fondasi menuju personal finance assistant yang dapat membantu pengguna memahami dan mengelola keuangan dengan lebih baik.

---

## Fitur Utama

### Dashboard Keuangan

Lihat ringkasan pemasukan, pengeluaran, saldo, batas saldo aman, transaksi terbaru, dan perkembangan keuangan dalam satu tampilan.

### Catat Transaksi

Tambahkan pemasukan dan pengeluaran dengan kategori, tanggal, nominal, dan catatan.

### Catat Cepat

Masukkan transaksi dengan teks sederhana seperti:

```txt
makan 15000
kopi 18000
bensin 30000
gaji 3000000
dikasih uang kakak 100000
```

Sakuin akan membantu membuat draft transaksi yang bisa kamu cek sebelum disimpan.

### Kategori Custom

Gunakan kategori bawaan atau buat kategori sendiri agar transaksi lebih mudah dikelompokkan.

### Goals Tabungan

Buat target tabungan, pantau progress, dan lihat berapa lagi yang perlu dikumpulkan.

### Safe Balance Limit

Atur batas saldo aman agar kamu lebih mudah melihat apakah kondisi keuangan masih dalam zona aman.

### Export Data

Export transaksi ke format:

```txt
JSON
CSV
XLSX
```

Cocok untuk backup, analisis lanjutan, atau kebutuhan laporan pribadi.

### Login Google dan Reset Password

Sakuin mendukung login dengan akun Google, login email/password, dan reset password melalui email.

### PWA Installable

Sakuin dapat diinstall seperti aplikasi sehingga lebih mudah diakses dari perangkat yang kamu gunakan.

---

## Untuk Siapa Sakuin?

Sakuin cocok untuk:

- mahasiswa;
- pekerja;
- freelancer;
- pengguna yang ingin mulai mengatur keuangan;
- pengguna yang merasa spreadsheet terlalu ribet;
- pengguna yang ingin mencatat transaksi kecil secara lebih konsisten;
- pengguna yang ingin punya ringkasan keuangan pribadi yang mudah dibaca.

---

## Kenapa Sakuin Berbeda?

Sakuin tidak hanya fokus pada “mencatat uang masuk dan keluar”.

Sakuin dikembangkan dengan arah produk yang lebih jauh:

```txt
Mengurangi effort pencatatan.
Membuat input transaksi lebih cepat.
Membantu pengguna memahami kondisi keuangan.
Menjaga data pribadi dengan security baseline.
Menjadi fondasi untuk financial assistant yang aman di masa depan.
```

Fitur seperti **Catat Cepat**, dashboard ringkas, goals, export, PWA, Google Login, reset password, dan audit/security baseline membuat Sakuin lebih dari sekadar catatan keuangan biasa.

---

## Status Produk

Sakuin sudah berjalan di production.

```txt
Frontend : https://sakuin-web.vercel.app
Backend  : https://sakuin-api.vercel.app
GitHub   : https://github.com/Risaru9/Sakuin
```

Status utama:

```txt
[✓] Web app production aktif
[✓] Frontend dan backend sudah deploy di Vercel
[✓] Database menggunakan Supabase PostgreSQL
[✓] Login email/password berjalan
[✓] Login Google berjalan
[✓] Reset password berjalan
[✓] Dashboard berjalan
[✓] Transaksi berjalan
[✓] Catat Cepat berjalan
[✓] Kategori berjalan
[✓] Goals berjalan
[✓] Export berjalan
[✓] PWA installable berjalan
[✓] CI/CD aktif
```

---

## Roadmap Produk

Beberapa arah pengembangan berikutnya:

```txt
[ ] Budgeting per kategori
[ ] Insight pengeluaran
[ ] Recurring transaction
[ ] Peningkatan Catat Cepat
[ ] Financial health indicator
[ ] Financial assistant/advisor
[ ] Integrasi data transaksi dengan consent dan review user
```

Catatan penting:

Fitur yang menyentuh data sensitif seperti email, e-wallet, mobile banking, atau financial assistant harus dikembangkan secara hati-hati dengan consent, privacy design, security, audit trail, dan mekanisme review dari user.

---

## Dokumentasi Teknis

README ini hanya berisi perkenalan produk.

Dokumentasi teknis tersedia di:

```txt
docs/API.md       - Dokumentasi endpoint backend
docs/SECURITY.md  - Dokumentasi security baseline dan risk policy
docs/HANDOFF.md   - Konteks teknis untuk developer/agent berikutnya
docs/APP_STORE_READINESS.md - Rencana kesiapan Android/Play Store
docs/PLAY_STORE_CHECKLIST.md - Checklist store listing dan internal testing
docs/PRIVACY_POLICY_DRAFT.md - Draft privacy policy untuk store readiness
docs/UPDATE_STRATEGY.md - Strategi update fitur tanpa install ulang
docs/STORE_LISTING_COPY.md - Copywriting Play Store yang siap dipakai
docs/STORE_SCREENSHOT_GUIDE.md - Panduan screenshot Play Store
docs/ANDROID_WRAPPER_READINESS.md - Kesiapan teknis Android wrapper
docs/ANDROID_INTERNAL_TEST_PLAN.md - Rencana test build Android internal
docs/PLAY_CONSOLE_DATA_SAFETY.md - Draft jawaban Google Play Data Safety
docs/PLAY_CONSOLE_REVIEW_NOTES.md - Catatan reviewer untuk submission Play Console
docs/ACCOUNT_DELETION_SOP.md - SOP request penghapusan akun
docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md - Rencana teknis deletion non-production
```

---

## Prinsip Pengembangan

Sakuin dikembangkan dengan prinsip:

```txt
Mobile-friendly.
Mudah digunakan.
Clean UI.
Reusable code.
Maintainable architecture.
Security-aware development.
User review before automation.
```

Tujuan akhirnya sederhana:

> Membantu pengguna mencatat, memahami, dan mengelola keuangan pribadi dengan lebih mudah.
