# Checklist Testing APK Sakuin

## 1. Instalasi

- [ ] APK bisa diinstall tanpa error
- [ ] Tidak ada peringatan "App not installed"
- [ ] Tidak perlu uninstall APK lama
- [ ] Icon Sakuin muncul di app drawer
- [ ] Version di Settings → Apps → Sakuin sudah benar

## 2. Aplikasi bisa dibuka

- [ ] Tap icon Sakuin → aplikasi terbuka
- [ ] Tidak ada crash saat startup
- [ ] Splash screen muncul (jika ada)
- [ ] Loading screen normal

## 3. Login & Authentication

- [ ] Jika sudah login sebelumnya, session masih aktif (tidak perlu login ulang)
- [ ] Jika belum login, halaman login muncul
- [ ] Login dengan email/password berhasil
- [ ] Login dengan Google berhasil (jika ada)
- [ ] Token tersimpan dengan benar
- [ ] Setelah login, redirect ke dashboard

## 4. Data dari backend muncul

- [ ] Dashboard menampilkan summary keuangan
- [ ] Income/expense bulan ini muncul
- [ ] Transaksi terbaru muncul
- [ ] Goals muncul (jika ada)
- [ ] Kategori muncul
- [ ] Tidak ada error "Failed to fetch"

## 5. Navigasi & Route

- [ ] Semua menu di bottom navigation berfungsi
- [ ] Dashboard, Transaksi, Goals, Profile bisa dibuka
- [ ] Deep link `/profile?section=notifications` berfungsi
- [ ] Back button Android berfungsi
- [ ] Tidak ada route yang 404

## 6. Notifikasi

- [ ] Buka Profile → klik "Pengingat"
- [ ] Tombol "Aktifkan" notifikasi muncul
- [ ] Tap "Aktifkan" → muncul permission dialog
- [ ] Setelah izin diberikan, status berubah "Diizinkan"
- [ ] Tombol "Tes" notifikasi muncul
- [ ] Tap "Tes" → notifikasi muncul di notification bar
- [ ] Tap notifikasi → aplikasi terbuka

## 7. Widget di home screen

- [ ] Long press home screen → Widgets → Sakuin muncul
- [ ] Drag widget Sakuin ke home screen
- [ ] Widget menampilkan "Silakan login di aplikasi" (jika belum login)
- [ ] Setelah login, widget menampilkan data keuangan
- [ ] Widget menampilkan income bulan ini
- [ ] Widget menampilkan expense bulan ini
- [ ] Widget menampilkan status (Aman/Waspada/Boros)
- [ ] Widget menampilkan mascot yang sesuai status

## 8. Widget update setelah perubahan data

- [ ] Buka aplikasi Sakuin
- [ ] Tambah transaksi baru (expense Rp 50.000)
- [ ] Kembali ke home screen
- [ ] Widget menampilkan expense yang sudah bertambah
- [ ] Edit transaksi (ubah nominal)
- [ ] Kembali ke home screen
- [ ] Widget menampilkan expense yang sudah berubah
- [ ] Hapus transaksi
- [ ] Kembali ke home screen
- [ ] Widget menampilkan expense yang sudah berkurang

## 9. Widget refresh manual

- [ ] Tap tombol ↻ di widget
- [ ] Widget menampilkan "Memuat..."
- [ ] Setelah beberapa detik, widget menampilkan data terbaru
- [ ] Tidak ada error "Cek koneksi"

## 10. Widget setelah restart HP

- [ ] Restart HP
- [ ] Setelah HP menyala, widget masih muncul di home screen
- [ ] Widget menampilkan data (tidak blank)
- [ ] Tap widget → aplikasi terbuka

## 11. Widget setelah unlock layar

- [ ] Lock layar HP
- [ ] Unlock layar
- [ ] Widget otomatis refresh (data terbaru muncul)

## 12. Fitur lain

- [ ] Tambah transaksi berfungsi
- [ ] Edit transaksi berfungsi
- [ ] Hapus transaksi berfungsi
- [ ] Tambah goal berfungsi
- [ ] Export data berfungsi
- [ ] Logout berfungsi
- [ ] Setelah logout, widget menampilkan "Silakan login"

## 13. Performance

- [ ] Aplikasi tidak lag
- [ ] Scroll smooth
- [ ] Tidak ada memory leak (aplikasi tidak crash setelah dipakai lama)
- [ ] Battery drain normal (tidak boros baterai)

## 14. Offline mode (jika ada)

- [ ] Matikan WiFi dan data seluler
- [ ] Buka aplikasi
- [ ] Aplikasi menampilkan fallback/offline message
- [ ] Nyalakan koneksi kembali
- [ ] Aplikasi otomatis sync data

## Hasil Testing

**Tanggal:** _____________________
**Versi APK:** _____________________
**Device:** _____________________
**Android version:** _____________________

**Total passed:** _____ / _____
**Total failed:** _____ / _____

**Catatan:**
_____________________________________
_____________________________________
_____________________________________
