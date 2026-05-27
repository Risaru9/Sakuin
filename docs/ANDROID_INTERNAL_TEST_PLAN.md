# Sakuin Android Internal Test Plan

Dokumen ini adalah test plan untuk build Android internal pertama. Gunakan dokumen ini sebelum submit ke closed testing atau production Play Store.

## Tujuan

Internal test memastikan Android wrapper tidak hanya berhasil dibuka, tetapi benar-benar nyaman dipakai sebagai aplikasi harian.

Fokus utama:

- Login dan session.
- Core finance flow.
- AI Assistant full chat room.
- Reminder dan notifikasi.
- Update web tanpa install ulang.
- Privacy route dan offline fallback.

## Device Minimum

Uji minimal di:

```txt
[ ] Android kecil sekitar 360px width
[ ] Android menengah sekitar 390-430px width
[ ] Android dengan gesture navigation
[ ] Android dengan keyboard aktif
[ ] Android Chrome/PWA sebagai pembanding
```

## Test Data

Gunakan data dummy:

```txt
Nama: User Sakuin
Email: user@sakuin.app atau akun test khusus
Income: Rp 5.000.000
Expense: Rp 2.040.000
Goal: Dana Darurat
Kategori: Makanan, Transport, Tabungan, Hiburan
```

Jangan pakai data finansial pribadi asli untuk screenshot atau testing store.

## Test Flow

### 1. First Open

```txt
[ ] App terbuka dari icon Android
[ ] Tidak terlihat address bar browser
[ ] Splash/icon terasa sesuai brand
[ ] Jika belum login, user diarahkan ke auth flow yang jelas
[ ] Tidak ada route error
```

### 2. Auth

```txt
[ ] Register akun test
[ ] Login akun test
[ ] Logout
[ ] Login ulang
[ ] Session bertahan setelah app ditutup dan dibuka lagi
```

### 3. Dashboard

```txt
[ ] Dashboard terbuka normal
[ ] Summary terbaca jelas
[ ] Review harian 30 detik tampil jika belum selesai
[ ] Tombol transaksi dari dashboard bekerja
[ ] Tidak ada elemen ketutup safe area
```

### 4. Transactions

```txt
[ ] Tambah transaksi manual
[ ] Catat Cepat
[ ] Edit transaksi
[ ] Hapus transaksi
[ ] List transaksi update
[ ] Floating action button tidak menutupi konten penting
```

### 5. Goals

```txt
[ ] Buat goal
[ ] Tambah progress
[ ] Edit goal
[ ] Hapus goal
[ ] Progress terbaca jelas
```

### 6. AI Assistant

```txt
[ ] /asisten terbuka sebagai full chat room
[ ] Bottom nav tidak tampil di halaman Asisten
[ ] Input prompt selalu mudah dijangkau
[ ] Keyboard tidak menutup input secara permanen
[ ] Pesan user dan assistant bisa discroll
[ ] Prompt financial dijawab
[ ] Draft transaksi dari chat bisa direview
```

### 7. Reminder dan Notifikasi

```txt
[ ] Buka Profile
[ ] Aktifkan Pengingat Transaksi
[ ] Tombol Tes menampilkan notifikasi
[ ] Notifikasi membuka /dashboard saat diketuk
[ ] Pengaturan frekuensi tersimpan
[ ] Quiet hours terbaca jelas
```

### 8. Export

```txt
[ ] Export JSON
[ ] Export CSV
[ ] Export XLSX
[ ] Download tidak gagal di wrapper
```

### 9. Privacy dan Legal

```txt
[ ] /privacy bisa dibuka tanpa login
[ ] Link privacy policy bisa dibuka dari app
[ ] Tidak ada data real user di screenshot
```

### 10. Update Flow

```txt
[ ] Deploy web update kecil
[ ] App dapat memuat versi terbaru
[ ] Prompt update/release notes tidak mengganggu
[ ] User tidak perlu install ulang untuk perubahan web
```

## Blocker untuk Release

Jangan lanjut ke closed testing jika:

```txt
[ ] Login gagal
[ ] App sering membuka browser eksternal tanpa alasan
[ ] AI Assistant tertutup keyboard atau nav
[ ] Notifikasi tidak bisa dites
[ ] Export gagal total
[ ] /privacy tidak bisa dibuka
[ ] Ada data pribadi asli di screenshot
[ ] App terasa seperti webview rusak
```

## Kesimpulan

Internal test wajib dilakukan di device Android nyata. Emulator atau browser responsive mode membantu, tetapi tidak cukup untuk memutuskan kesiapan Play Store.
