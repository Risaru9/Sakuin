# Sakuin App Store Readiness

Dokumen ini adalah pegangan Phase 4 untuk menyiapkan Sakuin menuju distribusi aplikasi mobile, terutama Android/Play Store, tanpa mengorbankan stabilitas PWA yang sudah berjalan.

## Tujuan Phase 4

Phase 4 bukan langsung rewrite ke native app. Tujuan utamanya adalah membuat Sakuin siap masuk jalur app store dengan risiko rendah.

Target Phase 4:

- Menentukan jalur teknis mobile app yang paling masuk akal.
- Menyiapkan checklist sebelum masuk Play Store.
- Menyiapkan materi store listing yang konsisten dengan identitas Sakuin.
- Menyiapkan privacy policy draft yang sesuai dengan data yang dipakai Sakuin.
- Menyiapkan Data Safety dan reviewer notes agar Play Console tidak menjadi blocker.
- Menyiapkan QA checklist agar pengalaman user tetap nyaman saat dibuka sebagai app.

## Keputusan Teknis

Rekomendasi saat ini:

```txt
Tahap sekarang : PWA matang
Tahap berikut  : Android wrapper berbasis TWA atau Capacitor
Tahap nanti    : iOS setelah Android/PWA stabil dan user aktif cukup kuat
```

Urutan ini dipilih karena Sakuin sudah punya:

- Web app production.
- PWA manifest.
- Service worker.
- Install guide.
- Push notification.
- Mobile app shell.
- Full room AI Assistant.
- Reminder yang bisa diatur.

Dengan kondisi ini, user sudah bisa memakai Sakuin seperti aplikasi tanpa harus menunggu store.

## Opsi Distribusi

### Opsi 1: PWA Tetap Menjadi Jalur Utama

Kelebihan:

- Update fitur masuk dari deploy web.
- User tidak perlu install ulang.
- Tidak perlu approval store.
- Risiko teknis rendah.
- Cocok untuk validasi produk.

Kekurangan:

- Discovery dari Play Store belum ada.
- Beberapa user masih lebih percaya app dari store.
- Integrasi native device lebih terbatas.

Status:

```txt
Direkomendasikan sebagai fondasi utama saat ini.
```

### Opsi 2: Trusted Web Activity Android

Kelebihan:

- Bisa masuk Play Store.
- Tetap memakai web app production.
- Update UI/fitur web tetap cukup lewat deploy.
- Cocok untuk PWA yang sudah matang.

Kekurangan:

- Perlu package Android, signing key, Digital Asset Links, dan Play Console setup.
- Butuh validasi manifest, icons, splash, dan policy.
- Fitur native tetap terbatas jika dibanding native app penuh.

Status:

```txt
Direkomendasikan untuk Android pertama setelah readiness checklist selesai.
```

### Opsi 3: Capacitor

Kelebihan:

- Bisa membungkus React web app menjadi Android/iOS.
- Lebih mudah menambah plugin native jika nanti diperlukan.
- Bisa memakai codebase web sekarang.

Kekurangan:

- Menambah dependency dan folder native.
- Butuh maintenance Android/iOS.
- Perubahan plugin/permission native perlu update store.

Status:

```txt
Layak dipertimbangkan setelah kebutuhan native jelas.
```

### Opsi 4: React Native/Expo Rewrite

Kelebihan:

- Pengalaman native lebih maksimal.
- Kontrol UI/device lebih luas.

Kekurangan:

- Biaya rewrite besar.
- Risiko regresi tinggi.
- Banyak flow harus dibangun ulang.

Status:

```txt
Tidak direkomendasikan untuk tahap sekarang.
```

## Strategi Update

Untuk user, prinsipnya sederhana:

```txt
User tidak perlu install ulang untuk perubahan fitur web biasa.
```

Pembagian update:

| Jenis perubahan | Perlu install ulang? | Catatan |
| --- | --- | --- |
| Perubahan UI dashboard | Tidak | Cukup deploy web |
| Perubahan AI Assistant | Tidak | Cukup deploy frontend/backend |
| Perubahan reminder web | Tidak | Cukup deploy web/API |
| Perubahan service worker | Tidak | User cukup update/reopen app |
| Perubahan permission native | Ya | Perlu rilis store baru |
| Tambah plugin native | Ya | Perlu rilis store baru |
| Ganti package Android/signing | Ya | Perlu rilis store baru |

## UX Rule untuk App Store Build

App store build tidak boleh terasa seperti browser biasa.

Checklist UX:

- App langsung masuk ke pengalaman Sakuin, bukan landing page panjang.
- User yang belum login tetap diarahkan ke auth dengan jelas.
- User yang login langsung masuk dashboard.
- Bottom navigation mobile stabil.
- AI Assistant tampil full room chat tanpa bottom nav.
- Reminder bisa dites dari Profile.
- Install/update copy tidak membingungkan user yang sudah memakai store app.
- Offline state memakai bahasa yang jelas, bukan error teknis.

## Risiko Utama

### Risiko 1: Store app hanya terasa seperti webview kasar

Mitigasi:

- Pertahankan PWA mobile UX yang sudah dipoles.
- Gunakan splash/icon yang konsisten.
- Pastikan safe area dan keyboard behavior nyaman.

### Risiko 2: User bingung antara PWA dan Play Store app

Mitigasi:

- Di komunikasi produk, gunakan istilah "Aplikasi Sakuin".
- Jangan memaksa user install ulang.
- Jelaskan bahwa update fitur tetap otomatis.

### Risiko 3: Privacy policy kurang siap

Mitigasi:

- Gunakan draft privacy policy di `docs/PRIVACY_POLICY_DRAFT.md`.
- Gunakan draft Data Safety di `docs/PLAY_CONSOLE_DATA_SAFETY.md`.
- Siapkan reviewer notes dari `docs/PLAY_CONSOLE_REVIEW_NOTES.md`.
- Review ulang sebelum dipublikasikan.
- Pastikan policy sesuai data nyata yang diproses Sakuin.

### Risiko 3A: Account deletion belum memenuhi requirement store

Mitigasi:

- Tambahkan halaman publik untuk request hapus akun.
- Tambahkan link dari Profile.
- Siapkan proses operasional manual sebelum self-service delete penuh.
- Jelaskan data retention dengan bahasa yang mudah dipahami user.

### Risiko 4: Push notification tidak konsisten lintas device

Mitigasi:

- Pertahankan tombol tes notifikasi.
- Tetap sediakan reminder lokal saat app terbuka.
- Uji Android Chrome, Android installed PWA, dan wrapper Android.

## Definition of Ready untuk Android Store

Sakuin dianggap siap masuk build Android jika semua item ini terpenuhi:

```txt
[ ] Production frontend stabil
[ ] Production backend stabil
[ ] PWA install flow stabil
[ ] AI Assistant mobile full room chat stabil
[ ] Reminder test notification berhasil
[ ] Privacy policy siap publik
[x] Account deletion request flow awal tersedia
[x] SOP account deletion terdokumentasi
[x] Rencana teknis account deletion terdokumentasi
[ ] Proses teknis deletion sudah diuji di database non-production
[ ] Data Safety draft sudah direview
[ ] Reviewer notes dan test account siap
[ ] Store listing siap
[ ] Screenshot mobile siap
[ ] Icon 512 dan maskable icon siap
[ ] Digital Asset Links siap jika memakai TWA
[ ] Package name Android ditentukan
[ ] Signing key disimpan aman
[ ] Internal testing Play Console selesai
```

## Rekomendasi Implementasi Berikutnya

Urutan yang paling aman:

1. Finalisasi privacy policy publik.
2. Uji SOP account deletion di support flow dan database non-production.
3. Finalisasi Data Safety dan reviewer notes.
4. Siapkan screenshot store listing.
5. Pilih package name Android.
6. Pilih TWA atau Capacitor.
7. Buat internal test Android.
8. Uji login, dashboard, transaksi, AI Assistant, reminder, dan export.
9. Baru submit ke closed testing Play Store.

Dokumen teknis lanjutan:

```txt
docs/ANDROID_WRAPPER_READINESS.md
docs/ANDROID_INTERNAL_TEST_PLAN.md
docs/DIGITAL_ASSET_LINKS_TEMPLATE.json
docs/PLAY_CONSOLE_DATA_SAFETY.md
docs/PLAY_CONSOLE_REVIEW_NOTES.md
docs/ACCOUNT_DELETION_SOP.md
docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md
```

## Keputusan Saat Ini

Untuk kondisi Sakuin sekarang:

```txt
Jangan langsung rewrite native.
Jangan langsung install dependency native.
Jangan menambah permission native sebelum ada alasan kuat.
Jadikan PWA sebagai fondasi.
Siapkan Android store melalui readiness checklist terlebih dahulu.
```

Alasan:

- User sudah mendapat value dari PWA sekarang.
- Update fitur tetap cepat.
- Risiko regresi lebih kecil.
- App store bisa menjadi channel distribusi, bukan fondasi teknis utama.
