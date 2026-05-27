# Sakuin Android Wrapper Readiness

Dokumen ini menjelaskan kesiapan teknis Sakuin untuk dibuat menjadi Android app wrapper. Tujuannya agar langkah menuju aplikasi Play Store dilakukan terukur, tidak terburu-buru, dan tidak merusak webapp/PWA yang sudah stabil.

## Tujuan

Android wrapper adalah tahap ketika Sakuin dibungkus menjadi aplikasi Android yang bisa diuji melalui Play Console.

Target user experience:

```txt
User membuka Sakuin dari icon aplikasi.
App terasa seperti mobile app, bukan browser biasa.
User tetap mendapat update fitur web tanpa install ulang berkali-kali.
Login, transaksi, AI Assistant, reminder, dan export tetap berjalan.
```

## Keputusan Rekomendasi

Untuk tahap pertama Android, rekomendasi teknis adalah:

```txt
Primary option: Trusted Web Activity (TWA)
Fallback option: Capacitor
Not recommended now: React Native/Expo rewrite
```

Alasan memilih TWA sebagai opsi pertama:

- Sakuin sudah PWA-ready.
- Web app production sudah stabil.
- Update fitur tetap cukup dari deploy web.
- Risiko regresi lebih kecil dibanding rewrite.
- Cocok untuk validasi Play Store lebih cepat.

Capacitor tetap layak jika nanti Sakuin butuh plugin native seperti biometric auth, native file handling, atau integrasi device yang tidak cukup dengan PWA/TWA.

## Package Name

Rekomendasi package name:

```txt
com.sakuin.app
```

Catatan penting:

Package name adalah identitas permanen aplikasi Android. Setelah app rilis di Play Store, package name tidak boleh dianggap mudah diganti.

Sebelum build Android pertama, package name perlu dikonfirmasi oleh owner project.

## Production URLs

Frontend:

```txt
https://sakuin-web.vercel.app
```

Backend:

```txt
https://sakuin-api.vercel.app
```

Privacy Policy:

```txt
https://sakuin-web.vercel.app/privacy
```

## TWA Requirements

Untuk TWA, Sakuin perlu:

```txt
[ ] PWA manifest valid
[ ] HTTPS production aktif
[ ] Service worker aktif
[ ] Icon 192 dan 512 tersedia
[ ] Maskable icon tersedia
[ ] start_url dan scope benar
[ ] Package name Android ditentukan
[ ] Signing key dibuat
[ ] SHA-256 fingerprint dari signing key diketahui
[ ] Digital Asset Links dipasang di web production
[ ] Internal test berhasil
```

Saat ini yang sudah tersedia:

```txt
[x] HTTPS production
[x] manifest.webmanifest
[x] service worker
[x] icon 192/512
[x] maskable icon
[x] start_url dan scope
[x] privacy route /privacy
[x] mobile app shell
[x] AI Assistant full room chat
[x] reminder test notification
```

Yang belum bisa dibuat tanpa input owner/build Android:

```txt
[ ] Signing key
[ ] SHA-256 fingerprint
[ ] assetlinks.json final
[ ] Play Console internal testing
```

## Digital Asset Links

TWA membutuhkan file:

```txt
https://sakuin-web.vercel.app/.well-known/assetlinks.json
```

File ini membuktikan bahwa Android app dengan package tertentu memang terhubung dengan domain Sakuin.

Template tersedia di:

```txt
docs/DIGITAL_ASSET_LINKS_TEMPLATE.json
```

Jangan publish assetlinks final sebelum package name dan SHA-256 signing certificate benar.

## Versioning

Rekomendasi versi awal Android:

```txt
versionName: 1.0.0
versionCode: 1
```

Aturan:

- `versionCode` selalu naik setiap upload build baru ke Play Console.
- `versionName` mengikuti versi produk yang dilihat user.
- Update web biasa tidak selalu membutuhkan kenaikan versi Android.

## Permission Policy

Untuk TWA awal, permission harus minimal.

Direkomendasikan:

```txt
Internet
Notification jika diperlukan oleh wrapper/browser behavior
```

Hindari:

```txt
Contacts
SMS
Camera
Microphone
Location
Storage luas
```

Alasan:

Permission yang tidak relevan menurunkan trust user dan memperberat review Play Store.

## UX Acceptance Criteria

Android wrapper dianggap layak diuji jika:

```txt
[ ] App terbuka tanpa address bar browser
[ ] Splash/icon sesuai brand Sakuin
[ ] User belum login diarahkan ke login/register dengan jelas
[ ] User login langsung bisa masuk dashboard
[ ] Bottom navigation mobile stabil
[ ] AI Assistant tampil full chat room tanpa bottom nav
[ ] Keyboard tidak menutup input AI Assistant
[ ] Reminder bisa aktif dan tombol Tes bekerja
[ ] Route /privacy bisa dibuka
[ ] Offline fallback tidak membingungkan
```

## Keputusan yang Dibutuhkan dari Owner

Sebelum build Android internal, owner perlu menentukan:

```txt
[ ] Package name final
[ ] Nama developer/publisher Play Store
[ ] Email support publik
[ ] Apakah TWA disetujui sebagai jalur Android pertama
[ ] Apakah privacy policy /privacy sudah disetujui untuk publik
```

## Rekomendasi Next Step

Langkah berikutnya setelah dokumen ini:

```txt
1. Konfirmasi package name.
2. Pilih final: TWA atau Capacitor.
3. Jika TWA, buat Android project wrapper.
4. Generate signing key.
5. Ambil SHA-256 certificate fingerprint.
6. Buat assetlinks.json final.
7. Deploy assetlinks ke /.well-known/assetlinks.json.
8. Build internal APK/AAB.
9. Test di device Android nyata.
```

## Kesimpulan

Sakuin sudah siap secara PWA dan produk untuk masuk tahap Android wrapper readiness. Namun build Android final belum boleh dibuat asal-asalan karena package name, signing key, dan Digital Asset Links adalah keputusan penting yang sulit diubah setelah rilis.
