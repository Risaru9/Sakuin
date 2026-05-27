# Sakuin Play Store Checklist

Dokumen ini berisi checklist praktis untuk menyiapkan Sakuin masuk Play Store ketika sudah diputuskan untuk membuat Android app wrapper.

## 1. Product Readiness

```txt
[ ] User bisa register
[ ] User bisa login
[ ] User bisa logout
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

```txt
[ ] Package name ditentukan
[ ] App versioning ditentukan
[ ] App icon final
[ ] Splash screen final
[ ] Signing key dibuat dan disimpan aman
[ ] Production URL final
[ ] Privacy policy URL final
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
[ ] Buka ulang app
[ ] Update app/web tidak membuat user stuck
```

## 8. Release Rule

Jangan submit ke production Play Store jika:

```txt
[ ] Privacy policy belum publik
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
1. Publikasikan privacy policy.
2. Ambil screenshot store listing.
3. Pilih TWA atau Capacitor.
4. Buat build Android internal.
5. Jalankan internal test.
6. Baru masuk closed testing Play Store.
```
