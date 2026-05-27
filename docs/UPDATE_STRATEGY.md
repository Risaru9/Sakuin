# Sakuin Update Strategy

Dokumen ini menjelaskan Phase 5: bagaimana Sakuin mengirim update fitur tanpa membuat user install ulang berkali-kali.

## Tujuan Phase 5

Tujuan Phase 5 adalah memastikan user memahami bahwa:

- Update fitur Sakuin masuk otomatis dari deploy web.
- User tidak perlu uninstall/install ulang untuk fitur web biasa.
- Jika ada versi baru, aplikasi memberi sinyal yang jelas.
- User bisa melihat ringkasan perubahan tanpa merasa terganggu.

## Prinsip UX

Update tidak boleh terasa seperti hambatan.

Prinsip yang dipakai:

- Prompt update harus singkat.
- Changelog harus mudah dipahami.
- Jangan memaksa user membaca catatan panjang.
- Jangan tampilkan changelog di AI Assistant full chat room.
- User cukup klik satu tombol untuk menutup info update.
- Informasi update tetap bisa dilihat lagi dari Profile.

## Mekanisme Update

### PWA Update Prompt

Sakuin sudah memakai service worker untuk mendeteksi versi baru.

Flow:

```txt
1. User membuka Sakuin.
2. Browser mendeteksi service worker baru.
3. Sakuin menampilkan prompt "Versi baru tersedia".
4. User memilih "Pakai versi baru".
5. App reload ke versi terbaru.
```

### Release Notes Prompt

Sakuin juga punya prompt "apa yang baru".

Flow:

```txt
1. Versi release notes berubah di kode.
2. User login dan membuka app.
3. Prompt ringkas tampil sekali.
4. User klik "Mengerti".
5. Versi tersebut disimpan di localStorage agar tidak muncul berulang.
```

Lokasi code:

```txt
apps/web/src/lib/release-notes.ts
apps/web/src/components/pwa/AppReleaseNotesPrompt.tsx
```

### Update Info di Profile

Profile menampilkan ringkasan update terbaru di card Aplikasi Sakuin.

Lokasi code:

```txt
apps/web/src/components/pwa/PwaAppCard.tsx
```

Tujuannya agar user tetap bisa melihat update terbaru tanpa harus menunggu prompt.

## Kapan User Perlu Install Ulang?

Untuk PWA:

```txt
Hampir semua update fitur web tidak perlu install ulang.
```

Untuk Android wrapper nanti:

| Perubahan | Perlu update store? |
| --- | --- |
| UI dashboard | Tidak |
| AI Assistant web | Tidak |
| Reminder web/API | Tidak |
| Copywriting/changelog | Tidak |
| Service worker/PWA cache | Tidak |
| Permission native baru | Ya |
| Plugin native baru | Ya |
| Package name/signing | Ya |

## Cara Mengubah Release Notes

Saat ada update besar:

1. Buka `apps/web/src/lib/release-notes.ts`.
2. Ubah `SAKUIN_RELEASE_VERSION`.
3. Ubah `SAKUIN_RELEASE_TITLE`.
4. Ubah `SAKUIN_RELEASE_NOTES`.
5. Jalankan typecheck dan build.

Contoh:

```ts
export const SAKUIN_RELEASE_VERSION = "2026.06.01-budgeting";
export const SAKUIN_RELEASE_TITLE = "Budget kategori sudah tersedia";
export const SAKUIN_RELEASE_NOTES = [
  "Kamu bisa mengatur budget per kategori.",
  "Dashboard memberi sinyal saat budget mulai menipis.",
  "Asisten Sakuin bisa membaca status budget."
];
```

## Risiko dan Mitigasi

### Risiko: User terganggu prompt

Mitigasi:

- Prompt hanya tampil sekali per versi.
- Prompt tidak tampil di AI Assistant full chat room.
- Isi prompt maksimal beberapa poin.

### Risiko: User tidak tahu update sudah masuk

Mitigasi:

- Ada prompt release notes.
- Ada ringkasan update di Profile.
- PWA update prompt tetap tersedia untuk versi service worker baru.

### Risiko: Cache membuat user melihat versi lama

Mitigasi:

- Naikkan `CACHE_VERSION` di `apps/web/public/sw.js` saat ada perubahan PWA penting.
- Gunakan tombol "Cek update" di Profile untuk memicu pengecekan service worker.

## Checklist Release Web

Sebelum push update besar:

```txt
[ ] Update release notes jika user perlu tahu perubahan
[ ] Naikkan service worker cache version jika perlu
[ ] pnpm --filter @sakuin/web typecheck
[ ] pnpm --filter @sakuin/web build
[ ] pnpm --filter @sakuin/api typecheck jika backend berubah
[ ] Pastikan AI Assistant mobile tetap full room chat
[ ] Pastikan reminder test masih bekerja
[ ] Pastikan Profile menampilkan update terbaru
```

## Kesimpulan

Phase 5 membuat update Sakuin lebih jelas untuk user:

```txt
Fitur baru masuk otomatis.
User tidak perlu install ulang.
Ada prompt ringkas.
Ada changelog di Profile.
Ada jalur cek update manual.
```

Dengan strategi ini, Sakuin tetap cepat dikembangkan tanpa membuat user merasa repot.
