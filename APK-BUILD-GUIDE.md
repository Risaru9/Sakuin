# Panduan Build, Install, dan Update APK Sakuin

Dokumen ini menjelaskan proses build APK, cara install ke HP, dan cara update widget.
Ditulis untuk yang belum punya pengalaman mobile development.

---

## 1. Apakah aplikasi di HP otomatis berubah setelah kode diperbaiki?

**Tidak.** Kode yang kamu edit di komputer tidak otomatis masuk ke HP.

Ada dua jenis update yang berbeda:

| Jenis | Cara update | Otomatis? |
|-------|-------------|-----------|
| **Webapp / PWA** (tampilan di browser) | Deploy ke Vercel → user buka app → update masuk otomatis | Ya, setelah deploy |
| **APK native** (file .apk yang diinstall) | Harus build ulang → install APK baru ke HP | Tidak, harus manual |

---

## 2. Kapan perlu build APK ulang?

Build APK ulang diperlukan jika kamu mengubah:
- File Java di `android/app/src/main/java/` (MainActivity, WidgetProvider, dll)
- File XML di `android/app/src/main/res/` (layout widget, manifest, dll)
- File `AndroidManifest.xml`
- File `capacitor.config.ts` (konfigurasi Capacitor)
- Dependency Android di `build.gradle`

**Tidak perlu build APK ulang** jika kamu hanya mengubah:
- Kode React/TypeScript di `apps/web/src/`
- Tampilan UI, halaman, komponen
- Backend API

Perubahan webapp akan masuk otomatis ke APK yang sudah terinstall karena APK ini adalah WebView yang load dari URL Vercel.

---

## 3. Command untuk build APK

### Langkah 1: Build webapp dulu
```bash
cd apps/web
pnpm build
```

### Langkah 2: Sync ke Android (jika ada perubahan web)
```bash
cd apps/web
npx cap sync android
```

### Langkah 3: Build APK debug (untuk testing)
```bash
cd apps/web/android
./gradlew assembleDebug
```

### Langkah 4: Build APK release (untuk distribusi)
```bash
cd apps/web/android
./gradlew assembleRelease
```

> **Catatan Windows:** Gunakan `gradlew.bat` bukan `./gradlew` jika di Command Prompt:
> ```
> cd apps\web\android
> gradlew.bat assembleDebug
> ```

---

## 4. Di mana file APK hasil build?

Setelah build selesai, file APK ada di:

```
apps/web/android/app/build/outputs/apk/debug/app-debug.apk       ← untuk testing
apps/web/android/app/build/outputs/apk/release/app-release.apk   ← untuk distribusi
```

---

## 5. Cara install APK ke HP Android

### Cara 1: Transfer via kabel USB
1. Hubungkan HP ke komputer via USB
2. Copy file `.apk` ke HP (folder Downloads)
3. Di HP, buka File Manager → cari file `.apk` → tap untuk install
4. Jika muncul peringatan "Install dari sumber tidak dikenal", aktifkan di Settings → Security

### Cara 2: Transfer via Google Drive / WhatsApp
1. Upload file `.apk` ke Google Drive atau kirim via WhatsApp ke diri sendiri
2. Download di HP
3. Tap file `.apk` untuk install

### Cara 3: ADB (Android Debug Bridge) — paling cepat untuk developer
```bash
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```
Flag `-r` artinya replace/timpa APK lama tanpa uninstall.

---

## 6. Apakah APK lama perlu di-uninstall dulu?

**Tidak perlu**, selama `versionCode` di `build.gradle` sama atau lebih tinggi dari APK yang terinstall.

APK baru bisa langsung menimpa APK lama (install over existing). Data aplikasi tetap tersimpan.

Uninstall hanya diperlukan jika:
- `applicationId` berubah (nama package berubah)
- Ada konflik signing key
- Kamu ingin reset semua data aplikasi

---

## 7. Apakah widget otomatis berubah setelah APK baru diinstall?

**Ya**, widget akan menggunakan kode baru setelah APK baru diinstall.

Tapi data widget (income/expense) baru akan refresh saat:
- Kamu membuka aplikasi Sakuin (onResume trigger update)
- Kamu unlock layar HP (ACTION_USER_PRESENT)
- HP restart (BOOT_COMPLETED)
- Kamu tap tombol ↻ di widget

Widget **tidak** update secara real-time setiap detik — ini adalah keterbatasan normal Android widget.

---

## 8. Apakah widget perlu dihapus dan ditambahkan ulang setelah APK baru?

**Tidak perlu** dalam kondisi normal. Widget tetap ada di home screen setelah update APK.

Hapus dan tambah ulang widget hanya jika:
- Layout widget berubah drastis dan tampilan jadi rusak
- Widget blank total setelah update

---

## 9. Perbedaan update webapp/PWA vs update APK native

| | Webapp / PWA | APK Native |
|--|--|--|
| **Cara update** | Deploy ke Vercel, otomatis | Build + install manual |
| **Yang berubah** | Tampilan, logika, halaman | Kode native Android (widget, permission, dll) |
| **Data user** | Tetap aman | Tetap aman (kecuali uninstall) |
| **Widget** | Tidak ada widget native | Ada widget di home screen |
| **Notifikasi push** | Via service worker browser | Via FCM atau service worker |
| **Offline** | Terbatas (service worker cache) | Terbatas (WebView cache) |

---

## 10. Setelah deploy webapp, apakah APK ikut berubah?

**Sebagian ya, sebagian tidak.**

- Tampilan dan fitur webapp: **Ya**, karena APK load dari URL Vercel
- Widget Android: **Tidak**, widget pakai kode Java native yang sudah di-compile ke APK
- Permission Android: **Tidak**, harus build APK ulang

---

## 11. Checklist sebelum build APK

- [ ] `pnpm build` di `apps/web` berhasil tanpa error
- [ ] `pnpm typecheck` di `apps/web` tidak ada error TypeScript
- [ ] `npx cap sync android` sudah dijalankan
- [ ] `versionCode` di `build.gradle` sudah dinaikkan (jika ada perubahan native)
- [ ] Tidak ada error Gradle saat build

---

## 12. Troubleshooting umum

**Gradle build gagal: "SDK not found"**
→ Install Android Studio dan set `ANDROID_HOME` environment variable

**APK tidak bisa diinstall: "App not installed"**
→ Uninstall APK lama dulu, lalu install APK baru

**Widget blank setelah install**
→ Hapus widget dari home screen, tambahkan ulang, lalu buka aplikasi Sakuin

**Widget tidak update setelah transaksi**
→ Buka aplikasi Sakuin → widget akan refresh otomatis saat app dibuka
→ Atau tap tombol ↻ di widget untuk refresh manual

**Notifikasi tidak muncul**
→ Pastikan sudah aktifkan notifikasi di Profile → Pengingat
→ Pastikan browser/app sudah diberi izin notifikasi di Settings HP
→ Notifikasi push hanya bekerja saat ada koneksi internet
