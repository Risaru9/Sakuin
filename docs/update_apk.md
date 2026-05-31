# Strategi Pembaruan Aplikasi Sakuin: Kapan Harus Update APK vs Update Server (Web/Vercel)

Dokumen ini menjelaskan panduan komprehensif bagi tim pengembang mengenai arsitektur pembaruan aplikasi Sakuin. Karena Sakuin menggunakan arsitektur **Hybrid WebView Wrapper** berbasis Capacitor, kita dapat membagi pembaruan menjadi dua metode utama: **Pembaruan Mikro (Over-The-Air/Web)** dan **Pembaruan Makro (Native APK)**.

---

## 1. Pembaruan Mikro (Hanya Update Server/Vercel)
> [!NOTE]
> **Tidak perlu mengunduh atau memasang APK baru.** Perubahan akan langsung aktif di perangkat pengguna saat mereka membuka aplikasi (selama terhubung ke internet).

### Mengapa Hal Ini Bisa Terjadi?
Aplikasi Android Sakuin dikonfigurasi menggunakan Capacitor untuk memuat situs web utama di [Vercel](https://sakuin-web.vercel.app). WebView di dalam aplikasi bertindak sebagai browser khusus yang selalu menampilkan halaman web terbaru dari server.

1. **Pemisahan Logika Backend dan Frontend:**
   * Aplikasi di HP (*frontend*) berkomunikasi dengan server (*backend*) melalui API internet (biasanya menggunakan format JSON).
   * Jika Anda mengubah logika internal di backend (misalnya cara menghitung total transaksi di server, mengganti jenis database, atau mengoptimalkan kecepatan query database), aplikasi di HP hanya memanggil URL API yang sama (seperti `/api/transactions`) dan menerima hasil akhir yang sudah diperbarui secara otomatis.
2. **Kolaborasi Frontend Vercel dan Backend:**
   * Bahkan jika Anda menambahkan **fitur baru yang memiliki tampilan UI baru**, Anda hanya perlu menambahkan endpoint API baru di backend dan membuat halaman atau komponen React baru di kode frontend web.
   * Setelah kedua bagian tersebut di-deploy ke server dan Vercel, WebView di dalam APK pengguna akan langsung memuat versi web terbaru dan fitur baru dapat langsung digunakan secara instan.

### Contoh Kasus Pembaruan Mikro:
* Mengubah skema warna UI, tata letak tombol, atau tipografi.
* Menambahkan halaman baru (seperti halaman Laporan Keuangan Bulanan berbasis web).
* Mengubah rumus perhitungan matematika di database/server.
* Memperbaiki bug validasi formulir pada input data transaksi.

---

## 2. Pembaruan Makro (Wajib Mengunduh & Memasang APK Baru)
> [!WARNING]
> **Pengguna wajib mengunduh file APK versi terbaru dan memasangnya secara manual.** Versi kode internal (`versionCode` di Gradle) harus dinaikkan agar Checker Pembaruan di aplikasi dapat mendeteksi adanya versi baru.

Pengguna wajib melakukan instalasi ulang APK baru jika terdapat perubahan pada bagian **native/platform Android**, yang meliputi:

### A. Menambah atau Mengubah Plugin Native
Jika fitur baru yang Anda buat memerlukan akses langsung ke perangkat keras HP atau API sistem operasi Android tingkat rendah yang memerlukan kode Java/Kotlin baru.
* *Contoh:* Menambahkan fitur login dengan sidik jari/sensor wajah (Biometrik), integrasi sistem push notification native (seperti Firebase Cloud Messaging), atau penyimpanan database lokal offline menggunakan SQLite native.

### B. Perubahan Izin Akses (Permissions)
Jika aplikasi memerlukan izin baru dari sistem operasi Android yang harus dideklarasikan di dalam file konfigurasi manifest Android (`AndroidManifest.xml`).
* *Contoh:* Meminta izin Kamera untuk memindai struk belanja, izin Galeri Foto untuk mengunggah gambar, atau izin Lokasi (GPS) untuk mendeteksi lokasi transaksi secara otomatis.

### C. Mengubah Identitas dan Aset Native Aplikasi
Setiap perubahan pada aset visual atau identitas dasar aplikasi yang dibundel langsung di dalam file biner APK saat kompilasi.
* *Contoh:* Mengganti ikon aplikasi yang muncul di layar utama HP, mengubah gambar *splash screen* (tampilan pemuatan awal saat aplikasi dibuka), atau mengganti nama tampilan aplikasi.

### D. Perubahan Konfigurasi Capacitor
Jika Anda melakukan perubahan pada file konfigurasi inti Capacitor ([capacitor.config.ts](file:///d:/sakuin/apps/web/capacitor.config.ts)).
* *Contoh:* Mengubah alamat URL server utama yang dituju (misal dari staging ke produksi) atau mengubah konfigurasi `overrideUserAgent` untuk memanipulasi header browser.

### E. Kepatuhan Sistem Operasi (Target SDK)
Pembaruan konfigurasi build Gradle untuk menyesuaikan dengan kebijakan versi Android terbaru dari Google.
* *Contoh:* Menaikkan target versi Android (misal dari Android 13/SDK 33 ke Android 14/SDK 34) di file `build.gradle` agar aplikasi tetap diizinkan tayang di Google Play Store atau agar kompatibel dengan sistem keamanan Android terbaru.

---

## 3. Tabel Perbandingan Cepat

| Jenis Perubahan | Lokasi Kode | Perlu Build APK Baru? | Efek bagi Pengguna |
|---|---|---|---|
| Perbaikan UI / Bug Halaman Web | React (Frontend) | **TIDAK** | Instan setelah Vercel deploy sukses. |
| Logika Backend / Database | API Server (Backend) | **TIDAK** | Instan setelah Server deploy sukses. |
| Menambah Izin Kamera / File | Android Manifest | **YA** | Harus download & install APK baru. |
| Mengganti Ikon Aplikasi | Android Res / Aset | **YA** | Harus download & install APK baru. |
| Menambah Fitur Push Notification | Java / Plugin Native | **YA** | Harus download & install APK baru. |

---

## 4. Kesimpulan untuk Pengembang
* **90% Pengembangan Fitur Sehari-hari:** Hanya membutuhkan **Pembaruan Mikro**. Anda cukup melakukan commit, push ke GitHub, dan biarkan Vercel atau server backend melakukan pembaruan secara otomatis. APK pengguna akan menyesuaikan diri secara instan.
* **10% Pengembangan Fitur Khusus:** Membutuhkan **Pembaruan Makro**. Lakukan kompilasi build APK baru, naikkan nomor versi (`versionCode`), unggah file `.apk` baru ke server distribusi, dan beri tahu pengguna melalui dialog update agar mereka melakukan pembaruan manual.
