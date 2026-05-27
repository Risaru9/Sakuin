# Sakuin Play Store Checklist

Dokumen ini berisi checklist praktis untuk menyiapkan Sakuin masuk Play Store ketika sudah diputuskan untuk membuat Android app wrapper.

## 1. Product Readiness

```txt
[ ] User bisa register
[ ] User bisa login
[ ] User bisa logout
[ ] Link request hapus akun dari Profile bisa dibuka
[ ] Dashboard terbuka cepat
[ ] Catat transaksi manual berjalan
[ ] Catat Cepat berjalan
[ ] Goals berjalan
[ ] Profile berjalan
[ ] Reminder bisa aktif
[ ] Tombol tes notifikasi berhasil
[ ] AI Assistant mobile nyaman sebagai full chat room
[ ] Export tetap berjalan
[ ] Offline fallback tidak membingungkan
```

## 2. Store Listing

Materi final yang lebih siap pakai tersedia di:

```txt
docs/STORE_LISTING_COPY.md
docs/STORE_SCREENSHOT_GUIDE.md
docs/ANDROID_WRAPPER_READINESS.md
docs/ANDROID_INTERNAL_TEST_PLAN.md
docs/PLAY_CONSOLE_DATA_SAFETY.md
docs/PLAY_CONSOLE_REVIEW_NOTES.md
docs/ACCOUNT_DELETION_SOP.md
docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md
```

Nama aplikasi:

```txt
Sakuin
```

Short description:

```txt
Catat transaksi, pantau uang, dan bangun kebiasaan finansial harian.
```

Long description draft:

```txt
Sakuin membantu kamu mencatat pemasukan dan pengeluaran, membaca ringkasan keuangan, memantau goals tabungan, dan membangun kebiasaan finansial yang lebih rapi.

Dengan Sakuin, kamu bisa mencatat transaksi harian, memakai Catat Cepat, melihat dashboard uang, mengatur batas saldo aman, menerima pengingat transaksi, dan bertanya ke Asisten Sakuin tentang kondisi keuangan pribadi.

Sakuin dibuat untuk penggunaan harian yang sederhana, cepat, dan tidak ribet. Cocok untuk pengguna yang ingin mulai lebih sadar terhadap uang masuk, uang keluar, dan target tabungan pribadi.
```

Feature bullets:

```txt
- Catat pemasukan dan pengeluaran.
- Input cepat lewat Catat Cepat.
- Dashboard ringkas untuk melihat kondisi uang.
- Goals tabungan untuk memantau target.
- Pengingat transaksi yang bisa diatur.
- Asisten Sakuin untuk membaca kondisi keuangan pribadi.
- Export data saat dibutuhkan.
```

## 3. Screenshot Plan

Screenshot yang sebaiknya disiapkan:

```txt
[ ] Dashboard mobile
[ ] Review harian 30 detik
[ ] Catat Cepat
[ ] Transactions list
[ ] Goals
[ ] AI Assistant full chat room
[ ] Profile reminder settings
```

Prinsip screenshot:

- Pakai data dummy yang realistis.
- Jangan memakai email pribadi asli.
- Jangan menampilkan data finansial sensitif user asli.
- Pastikan warna putih, kuning, dan hitam konsisten.
- Pastikan teks terbaca di ukuran mobile.

## 4. Android Technical Checklist

Detail teknis Android wrapper tersedia di:

```txt
docs/ANDROID_WRAPPER_READINESS.md
```

```txt
[ ] Package name ditentukan
[ ] App versioning ditentukan
[ ] App icon final
[ ] Splash screen final
[ ] Signing key dibuat dan disimpan aman
[ ] Production URL final
[ ] Privacy policy URL final
[ ] Account deletion URL final
[ ] Digital Asset Links siap jika TWA
[ ] Internal testing track dibuat
[ ] Closed testing track siap jika diperlukan
```

Package name rekomendasi:

```txt
com.sakuin.app
```

Catatan:

Jangan ganti package name setelah app rilis kecuali benar-benar perlu, karena package name adalah identitas aplikasi Android.

## 5. Data Safety Checklist

Detail draft Data Safety tersedia di:

```txt
docs/PLAY_CONSOLE_DATA_SAFETY.md
```

Data yang diproses Sakuin:

```txt
[ ] Nama user
[ ] Email user
[ ] Password hash di backend
[ ] Transaksi user
[ ] Kategori user
[ ] Goals user
[ ] Safe balance limit
[ ] Reminder preference
[ ] Push subscription endpoint
[ ] AI chat prompt untuk fitur Asisten
```

Prinsip Play Store Data Safety:

- Jelaskan data finansial dipakai untuk fitur aplikasi.
- Jelaskan data tidak dipakai untuk menjual profil user.
- Jelaskan user dapat logout.
- Jelaskan data tersimpan di backend Sakuin.
- Jelaskan AI Assistant hanya digunakan untuk konteks fitur finansial Sakuin.
- Jangan submit production sebelum alur request hapus akun, SOP penghapusan, dan proses teknis deletion diuji.

## 6. Permission Checklist

Untuk PWA/TWA awal:

```txt
[ ] Internet
[ ] Notification jika diperlukan oleh wrapper/browser behavior
```

Jangan tambahkan permission berikut tanpa alasan kuat:

```txt
[ ] Contacts
[ ] SMS
[ ] Camera
[ ] Microphone
[ ] Location
[ ] Storage luas
```

Alasan:

Permission yang tidak relevan akan menurunkan trust user dan memperbesar risiko review Play Store.

## 7. Internal Test Flow

Detail test plan tersedia di:

```txt
docs/ANDROID_INTERNAL_TEST_PLAN.md
docs/PLAY_CONSOLE_REVIEW_NOTES.md
```

Minimal test sebelum submit:

```txt
[ ] Install app dari internal testing
[ ] Buka app pertama kali
[ ] Register akun baru
[ ] Login akun lama
[ ] Tambah transaksi
[ ] Catat Cepat
[ ] Dashboard update
[ ] AI Assistant mengirim dan menerima chat
[ ] Reminder aktif
[ ] Tes notifikasi muncul
[ ] Logout
[ ] Link request hapus akun dari Profile
[ ] Buka ulang app
[ ] Update app/web tidak membuat user stuck
```

## 8. Release Rule

Jangan submit ke production Play Store jika:

```txt
[ ] Privacy policy belum publik
[ ] Account deletion request flow tidak bisa dibuka
[ ] SOP penghapusan akun belum jelas
[ ] Rencana teknis account deletion belum tersedia
[ ] Proses teknis deletion belum diuji di database non-production
[ ] Test account reviewer belum dibuat
[ ] Notifikasi belum bisa dites
[ ] Login gagal di wrapper
[ ] AI Assistant tertutup keyboard/nav
[ ] App masih menampilkan error route
[ ] Screenshot memakai data real user
[ ] Signing key belum disimpan aman
```

## 9. Recommended Next Action

Langkah setelah checklist ini:

```txt
1. Deploy privacy policy publik di /privacy.
2. Uji SOP account deletion di support flow dan database non-production.
3. Buat test account reviewer.
4. Ambil screenshot store listing sesuai STORE_SCREENSHOT_GUIDE.md.
5. Pilih TWA atau Capacitor.
6. Buat build Android internal.
7. Jalankan internal test.
8. Baru masuk closed testing Play Store.
```
