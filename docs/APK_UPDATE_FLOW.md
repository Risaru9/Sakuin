# Panduan Sistem Alur Update APK Sakuin Android

Dokumen ini menjelaskan arsitektur, manajemen build, dan mekanisme update APK untuk aplikasi Android Sakuin yang didistribusikan di luar Google Play Store.

---

## 1. Pembaruan Mikro (Web/Server) vs Pembaruan Makro (Native APK)

Sakuin didesain sebagai aplikasi berbasis **Capacitor WebView Wrapper**, yang membagi pembaruan menjadi dua kategori utama:

### A. Pembaruan Mikro / Web (Tanpa Perlu Update APK)
> [!NOTE]
> **Tidak perlu mengunduh atau memasang APK baru.** Perubahan akan langsung aktif di perangkat pengguna saat mereka membuka aplikasi (selama terhubung ke internet).

#### Mengapa Hal Ini Bisa Terjadi?
Aplikasi Android Sakuin dikonfigurasi menggunakan Capacitor untuk memuat situs web utama di Vercel. WebView di dalam aplikasi bertindak sebagai browser khusus yang selalu menampilkan halaman web terbaru dari server.
* **Pemisahan Logika Backend dan Frontend:**
  Aplikasi di HP (*frontend*) berkomunikasi dengan server (*backend*) melalui API internet (biasanya menggunakan format JSON). Jika Anda mengubah logika internal di backend (misalnya cara menghitung total transaksi di server, mengganti jenis database, atau mengoptimalkan kecepatan query database), aplikasi di HP hanya memanggil URL API yang sama (seperti `/api/transactions`) dan menerima hasil akhir yang sudah diperbarui secara otomatis.
* **Kolaborasi Frontend Vercel dan Backend:**
  Bahkan jika Anda menambahkan **fitur baru yang memiliki tampilan UI baru**, Anda hanya perlu menambahkan endpoint API baru di backend dan membuat halaman atau komponen React baru di kode frontend web. Setelah kedua bagian tersebut di-deploy ke server dan Vercel, WebView di dalam APK pengguna akan langsung memuat versi web terbaru dan fitur baru dapat langsung digunakan secara instan.

#### Contoh Kasus Pembaruan Mikro:
* Mengubah skema warna UI, tata letak tombol, atau tipografi.
* Menambahkan halaman baru (seperti halaman Laporan Keuangan Bulanan berbasis web).
* Mengubah rumus perhitungan matematika di database/server.
* Memperbaiki bug validasi formulir pada input data transaksi.

---

### B. Pembaruan Makro / Native (Wajib Update/Pasang APK Baru)
> [!WARNING]
> **Pengguna wajib mengunduh file APK versi terbaru dan memasangnya secara manual.** Versi kode internal (`versionCode` di Gradle) harus dinaikkan agar Checker Pembaruan di aplikasi dapat mendeteksi adanya versi baru.

Pengguna wajib melakukan instalasi ulang APK baru jika terdapat perubahan pada bagian **native/platform Android**, yang meliputi:
1. **Menambah atau Mengubah Plugin Native:** Jika fitur baru memerlukan akses langsung ke perangkat keras HP atau API sistem operasi Android tingkat rendah yang memerlukan kode Java/Kotlin baru (misalnya login sidik jari/Biometrik, push notification Firebase, atau database lokal offline SQLite native).
2. **Perubahan Izin Akses (Permissions):** Jika aplikasi memerlukan izin baru dari sistem operasi Android yang harus dideklarasikan di dalam file konfigurasi manifest Android (`AndroidManifest.xml`) (misalnya akses Kamera untuk memindai struk belanja, izin Galeri Foto, atau izin Lokasi GPS).
3. **Mengubah Identitas dan Aset Native Aplikasi:** Mengganti ikon aplikasi di layar utama HP, mengubah gambar *splash screen* (tampilan pemuatan awal saat aplikasi dibuka), atau mengganti nama tampilan aplikasi.
4. **Perubahan Konfigurasi Capacitor:** Jika Anda melakukan perubahan pada file konfigurasi inti Capacitor (`capacitor.config.ts`), seperti mengubah alamat URL server utama atau header user-agent.
5. **Kepatuhan Sistem Operasi (Target SDK):** Pembaruan konfigurasi build Gradle untuk menyesuaikan dengan kebijakan versi Android terbaru dari Google (misalnya menaikkan target versi Android dari Android 13 ke Android 14 di file `build.gradle`).

---

### C. Tabel Perbandingan Cepat

| Jenis Perubahan | Lokasi Kode | Perlu Build APK Baru? | Efek bagi Pengguna |
|---|---|---|---|
| Perbaikan UI / Bug Halaman Web | React (Frontend) | **TIDAK** | Instan setelah Vercel deploy sukses. |
| Logika Backend / Database | API Server (Backend) | **TIDAK** | Instan setelah Server deploy sukses. |
| Menambah Izin Kamera / File | Android Manifest | **YA** | Harus download & install APK baru. |
| Mengganti Ikon Aplikasi | Android Res / Aset | **YA** | Harus download & install APK baru. |
| Menambah Fitur Push Notification | Java / Plugin Native | **YA** | Harus download & install APK baru. |

#### Kesimpulan untuk Pengembang:
* **90% Pengembangan Fitur Sehari-hari:** Hanya membutuhkan **Pembaruan Mikro**. Cukup lakukan commit, push ke GitHub, dan biarkan Vercel atau server backend melakukan pembaruan secara otomatis. APK pengguna akan menyesuaikan diri secara instan.
* **10% Pengembangan Fitur Khusus:** Membutuhkan **Pembaruan Makro**. Lakukan kompilasi build APK baru, naikkan nomor versi (`versionCode`), unggah file `.apk` baru ke server distribusi, dan beri tahu pengguna melalui dialog update agar mereka melakukan pembaruan manual.

---

## 2. Limitasi Distribusi Tanpa Play Store

Karena Sakuin didistribusikan mandiri (sideloading):
1. **Tidak Ada Auto-Update Latar Belakang Penuh:** Android melarang aplikasi menginstall APK lain secara diam-diam tanpa interaksi user demi alasan keamanan. User harus mengizinkan proses instalasi secara manual.
2. **Izin Sumber Tidak Dikenal:** Saat pertama kali menginstall/memperbarui, Android akan memunculkan dialog peringatan *"Install dari sumber tidak dikenal"*. User harus mengaktifkan izin ini di pengaturan sistem untuk browser (misal Chrome) atau File Manager mereka.
3. **Konflik Signing (App Not Installed):** APK baru hanya bisa menimpa (upgrade) APK lama jika menggunakan Keystore (Signing Key) yang **sama persis** dan Package Name (`applicationId`) yang sama. Jika kunci berbeda, instalasi akan gagal dengan pesan *"App not installed"*.

---

## 3. Manajemen Versi APK (`versionCode` & `versionName`)

Versi APK dikonfigurasi di file [build.gradle](file:///d:/sakuin/apps/web/android/app/build.gradle):

```gradle
defaultConfig {
    applicationId "com.sakuin.app"
    versionCode 3
    versionName "1.2"
}
```

* **`versionCode` (Integer):** Nilai numerik internal yang wajib dinaikkan (misal dari `2` ke `3`) setiap kali membuat build APK baru yang akan dibagikan ke user. Sistem checker membandingkan angka ini untuk menentukan apakah ada versi baru.
* **`versionName` (String):** String representasi versi yang ramah bagi user (misal `1.2`, `1.2.1`).

---

## 4. Cara Build APK Manual

### Persyaratan:
* JDK 17 dan Android SDK terpasang.
* `ANDROID_HOME` & `JAVA_HOME` sudah didefinisikan di OS.

### Langkah-langkah:
1. Build aset webapp:
   ```bash
   cd apps/web
   pnpm build
   ```
2. Singkronisasi aset ke subproject Android:
   ```bash
   npx cap sync android
   ```
3. Buka folder Android dan jalankan kompilasi:
   * **Windows (CMD/PowerShell):**
     ```cmd
     cd android
     gradlew.bat assembleRelease
     ```
   * **Linux/macOS:**
     ```bash
     cd android
     ./gradlew assembleRelease
     ```

Output APK release akan berada di:
`apps/web/android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 5. Cara Signing APK

Secara default, Gradle akan membangun unsigned APK. Agar bisa dijalankan di perangkat user, APK harus di-sign.

### Setup Signing Lokal
1. Taruh file `release.keystore` Anda ke dalam direktori `apps/web/android/app/`.
2. Tentukan environment variables di terminal komputer sebelum melakukan build:
   * `SIGNING_STORE_PASSWORD`
   * `SIGNING_KEY_ALIAS`
   * `SIGNING_KEY_PASSWORD`
3. Jalankan `gradlew.bat assembleRelease`. Gradle otomatis mendeteksi keberadaan file keystore dan menyematkan signature. Output file akan bernama `app-release.apk`.

---

## 6. Otomatisasi via GitHub Actions Pipeline

Pipeline telah diatur di [.github/workflows/build-apk.yml](file:///d:/sakuin/.github/workflows/build-apk.yml) untuk melakukan build otomatis:

### Konfigurasi Secrets di Repository GitHub:
Untuk menghasilkan APK yang ter-sign secara otomatis, Anda harus menambahkan secrets berikut di repositori GitHub Anda:
1. `ANDROID_KEYSTORE_BASE64`: File keystore `release.keystore` yang di-encode ke Base64 (jalankan `base64 release.keystore` untuk mendapatkan string-nya).
2. `SIGNING_STORE_PASSWORD`: Password keystore.
3. `SIGNING_KEY_ALIAS`: Alias key di dalam keystore.
4. `SIGNING_KEY_PASSWORD`: Password key.

Jika secrets tidak diatur, workflow akan berjalan sukses tetapi hanya menghasilkan **unsigned APK** sebagai artifact cadangan.

---

## 7. Cara Kerja In-App Update Checker

```
┌──────────────┐         1. Buka App          ┌──────────────┐
│  APK Sakuin  ├─────────────────────────────>│ Vercel Webapp│
│  Lokal (HP)  │                              │ (Kode React) │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │ 2. getAppVersionCode()                      │ 3. Fetch API
       │    (via JavascriptBridge)                   │    /api/app-version
       │                                             │
       │<────────────────────────────────────────────┤
       │                                             │
       │ 4. Bandingkan versionCode                   │
       │    Jika versionCode (API) > Local (Bridge)  │
       │                                             │
       │ 5. Tampilkan Update Banner/Modal            │
       │    (Release Notes & link download)          │
       │                                             │
       │ 6. Klik "Perbarui"                          │
       │    Arahkan ke github release / apkDownload  │
       │                                             │
       v                                             v
```

1. **Jembatan Komunikasi (JavascriptInterface):**
   Di [MainActivity.java](file:///d:/sakuin/apps/web/android/app/src/main/java/com/sakuin/app/MainActivity.java), kita mendefinisikan bridge `AndroidWidgetBridge` yang mengekspos method `getAppVersionCode()` dan `getAppVersionName()`.
2. **Deteksi Versi APK Lama (Backward Compatibility):**
   Jika React mendeteksi object `window.AndroidWidgetBridge` ada namun method `getAppVersionCode()` bernilai `undefined`, React menyimpulkan user sedang memakai versi lawas (v1.1 / versionCode 2) dan otomatis memberikan notifikasi update.
3. **Endpoint Manifest:**
   Aplikasi memanggil `/api/app-version` (atau fallback `/latest-version.json` di web static). Struktur manifest responsnya adalah:
   ```json
   {
     "latestVersionName": "1.2",
     "latestVersionCode": 3,
     "apkDownloadUrl": "https://github.com/Risaru9/Sakuin/releases/latest/download/sakuin.apk",
     "releaseNotes": ["Keterangan update 1", "Keterangan update 2"],
     "forceUpdate": false,
     "publishedAt": "ISOString"
   }
   ```
4. **Mekanisme Force Update:**
   Jika `forceUpdate` bernilai `true`, dialog update akan ditampilkan secara fullscreen dan non-dismissible, membatasi akses user ke dashboard sampai update di-install.

---

## 8. Langkah User Menginstall Update

1. User mengetuk tombol **"Perbarui Sekarang"** di aplikasi.
2. HP mendownload file APK terbaru dari URL rilis.
3. User membuka file hasil download & mengetuk **"Install"** / **"Perbarui"**.
4. Android mendeteksi package name yang sama dan menimpa aplikasi lama.
5. Proses selesai. Semua data transaksi lokal, login session, dan widget tetap aman tanpa perlu login ulang.

---

## 9. Checklist Pengujian Sebelum Rilis APK

Sebelum membagikan APK baru ke user, lakukan verifikasi berikut:
- [ ] Naikkan `versionCode` dan `versionName` di `build.gradle`.
- [ ] Ubah rilis info di `/api/app-version` (atau `latest-version.json`) sesuai dengan versi baru.
- [ ] Jalankan `pnpm build` dan pastikan tidak ada error TypeScript di React.
- [ ] Build APK debug menggunakan `gradlew assembleDebug` dan pastikan tidak ada error Gradle.
- [ ] Pasang APK versi lama ke HP Android, lalu buka aplikasi.
- [ ] Pastikan dialog update muncul di HP (simulasikan kondisi update tersedia).
- [ ] Ketuk tombol **"Perbarui"** dan pastikan link pengunduhan APK bekerja.
- [ ] Pasang APK baru di atas APK lama dan pastikan tidak terjadi crash atau kesalahan *"App not installed"*.
