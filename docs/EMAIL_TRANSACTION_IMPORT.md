# Deteksi Transaksi dari Email

Dokumen ini menjelaskan fitur otomasi transaksi m-banking dari email resmi bank di Sakuin.

## Tujuan Fitur

Fitur ini membantu user mencatat transaksi dari notifikasi email bank dengan proses seminimal mungkin. User cukup menghubungkan Gmail, lalu Sakuin mendeteksi nominal, jenis transaksi, bank, tanggal, merchant, dan referensi transaksi.

Jika data email cukup lengkap, transaksi langsung dicatat ke menu Transaksi dan ikut memengaruhi Dashboard. Jika data belum cukup yakin, transaksi masuk ke daftar review agar user bisa menyetujui atau mengabaikannya.

## Alur Untuk User

1. User membuka `Profile` lalu memilih menu `Otomasi`.
2. User menekan `Hubungkan Gmail`.
3. Google meminta izin baca Gmail.
4. Sakuin membaca notifikasi transaksi dari domain resmi bank yang relevan.
5. Transaksi dengan confidence tinggi langsung dicatat.
6. Transaksi yang ambigu masuk ke status `Review`.
7. User dapat menekan `Setujui` agar transaksi dicatat, atau `Abaikan` jika bukan transaksi yang perlu masuk Sakuin.

## Banyak Email dan Banyak Bank

Arsitektur fitur ini fleksibel untuk dua pola:

- Satu email untuk banyak rekening bank.
- Banyak email, masing-masing untuk bank yang berbeda.

Setiap email disimpan sebagai `EmailConnection`. Sakuin juga menyimpan daftar bank yang pernah terdeteksi dari email tersebut, misalnya `BCA`, `BRI`, `BNI`, atau `SeaBank`.

Contoh:

| Email | Provider yang terdeteksi |
| --- | --- |
| utama@gmail.com | BCA, BRI, BNI |
| bank-bca@gmail.com | BCA |
| seabank@gmail.com | SeaBank |

Dengan model ini user tidak perlu memilih bank secara manual. Provider hanya dianggap valid jika email berasal dari domain resmi bank. Mention seperti `BCA`, `BRI`, atau `transfer` di subject/body email promosi tidak cukup untuk disimpan sebagai deteksi transaksi.

## Cara Sakuin Mencatat Transaksi

Parser membaca beberapa informasi utama:

- Bank: `BCA`, `BRI`, `BNI`, `Mandiri`, `BSI`, `CIMB Niaga`, `Permata`, `BTN`, `Danamon`, `OCBC`, `Bank Jago`, `SeaBank`, dan `Maybank`.
- Jenis transaksi: `INCOME` atau `EXPENSE`.
- Nominal: format `Rp` atau `IDR`.
- Metode: contoh `Transfer`, `QRIS`, `Debit`, `Top Up`, `Cashback`, `Refund`.
- Merchant/penerima jika ada.
- Referensi transaksi jika ada.
- Tanggal transaksi.

Sakuin memakai rekening bank yang namanya sudah cocok. Jika belum ada, rekening bertipe `BANK` dibuat otomatis dengan saldo awal nol. Kategori yang dibuat juga spesifik:

- `M-Banking BCA`
- `M-Banking BRI`
- `M-Banking SeaBank`

Catatan transaksi juga membawa detail tambahan, misalnya:

`QRIS BRI - KOPI SENJA Ref BRI98765 via utama@gmail.com`

Dengan begitu user bisa melihat bank, metode, merchant, referensi, dan sumber email tanpa harus menebak dari kategori umum.

## Status Import

| Status | Arti |
| --- | --- |
| `imported` | Transaksi sudah dicatat ke menu Transaksi. |
| `needs_review` | Data belum cukup yakin dan menunggu persetujuan user. |
| `duplicate` | Kemungkinan transaksi sudah pernah diproses dari email lain. |
| `ignored` | User memilih untuk mengabaikan import tersebut. |

## Deduplikasi

Sakuin memakai dua fingerprint:

- `emailFingerprint`: mencegah email yang sama diproses berulang.
- `transactionFingerprint`: mencegah transaksi yang sama tercatat dua kali dari email berbeda.

`transactionFingerprint` dibuat dari user, bank, jenis transaksi, nominal, merchant, referensi, dan bucket waktu 5 menit. Ini membantu kasus user menerima notifikasi dari beberapa email untuk transaksi yang sama.

## Endpoint API

Semua endpoint membutuhkan autentikasi.

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/email-imports/overview` | Mengambil koneksi, statistik, dan import terbaru. |
| `GET` | `/api/email-imports/gmail/auth-url` | Membuat URL izin Gmail jika OAuth sudah dikonfigurasi. |
| `POST` | `/api/email-imports/import-email` | Memproses satu email transaksi lewat pipeline parser. |
| `POST` | `/api/email-imports/imports/:id/approve` | Menyetujui import review agar menjadi transaksi. |
| `POST` | `/api/email-imports/imports/:id/ignore` | Mengabaikan import review. |

## Konfigurasi Gmail OAuth Production

Tambahkan environment variable berikut di backend:

```env
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=https://sakuin-api.vercel.app/api/email-imports/gmail/callback
EMAIL_TOKEN_ENCRYPTION_KEY=
```

`EMAIL_TOKEN_ENCRYPTION_KEY` dipakai untuk mengenkripsi access token dan refresh token Gmail. Isi dengan string rahasia panjang minimal 32 karakter. Jangan gunakan nilai yang sama dengan password biasa dan jangan dibagikan ke frontend.

Langkah yang perlu dilakukan di Google Cloud:

1. Buka Google Cloud Console.
2. Buat atau pilih project Sakuin.
3. Aktifkan Gmail API.
4. Buka OAuth consent screen.
5. Pilih user type sesuai target rilis.
6. Tambahkan scope Gmail readonly: `https://www.googleapis.com/auth/gmail.readonly`.
7. Buat credential `OAuth client ID` dengan tipe `Web application`.
8. Tambahkan Authorized redirect URI:

   `https://sakuin-api.vercel.app/api/email-imports/gmail/callback`

9. Salin `Client ID` ke `GMAIL_CLIENT_ID`.
10. Salin `Client secret` ke `GMAIL_CLIENT_SECRET`.
11. Redeploy backend.

Catatan Google: refresh token untuk akses server-side membutuhkan authorization code flow dengan `access_type=offline`. Sakuin sudah mengirim parameter tersebut saat membuat URL consent Gmail.

Referensi resmi:

- Google OAuth 2.0 Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Gmail API Authorization: https://developers.google.com/workspace/gmail/api/auth/web-server

## Sinkronisasi Gmail

Setelah user menekan `Hubungkan Gmail`, Google akan redirect ke callback backend. Backend akan:

1. Memverifikasi signed OAuth state.
2. Menukar authorization code menjadi access token dan refresh token.
3. Membaca profile Gmail untuk mendapatkan email address.
4. Menyimpan token secara terenkripsi.
5. Menjalankan sinkronisasi awal secara aman.
6. Mengembalikan user ke menu `Profile > Otomasi`.

User kemudian bisa menekan `Sinkronkan` untuk mengambil email terbaru. Backend juga menjalankan auto-sync sekali sehari agar koneksi Gmail aktif diproses tanpa user menekan tombol terus-menerus.

Aturan sinkronisasi Gmail dibuat konservatif:

- Gmail search hanya mengambil kandidat dari domain bank yang dikenal.
- Email otomatis diabaikan jika pengirimnya bukan sumber resmi bank.
- Email otomatis diabaikan jika tidak memiliki nominal, jenis transaksi, tanggal eksplisit, atau sinyal berhasil/sukses.
- Email bertanggal masa depan tidak dicatat otomatis.
- Email ambigu dari sumber resmi masuk review, bukan langsung menjadi transaksi.

Aturan ini sengaja mengurangi false positive seperti LinkedIn, `t.co`, newsletter, promosi, atau artikel yang kebetulan berisi kata `transfer` dan nominal rupiah.

Untuk APK Android, callback Gmail memakai deep link:

`com.sakuin.app://email-import?status=connected`

Karena itu perubahan intent `email-import` membutuhkan build APK baru. Jika user masih memakai APK lama, callback bisa jatuh ke fallback web dashboard di Chrome dan terlihat seperti masuk ke halaman login web.

## Troubleshooting OAuth Gmail

### Koneksi Gmail gagal: Gmail API 403

Jika callback menampilkan error `Gmail API gagal (403)`, penyebab paling umum adalah Gmail API belum aktif di Google Cloud project yang sama dengan `GMAIL_CLIENT_ID`.

Perbaikan:

1. Buka Google Cloud Console.
2. Pilih project yang memiliki OAuth Client ID Sakuin.
3. Masuk ke `APIs & Services` > `Library`.
4. Cari `Gmail API`.
5. Klik `Enable`.
6. Tunggu 1-5 menit.
7. Coba hubungkan Gmail ulang dari Sakuin.

Jika Gmail API sudah aktif tetapi masih 403, cek:

- Email tester sudah masuk OAuth consent screen jika app masih mode testing.
- Scope `https://www.googleapis.com/auth/gmail.readonly` ada di OAuth consent screen.
- User menyetujui izin Gmail saat consent.
- `GMAIL_CLIENT_ID` dan `GMAIL_CLIENT_SECRET` berasal dari project Google Cloud yang sama.

Endpoint sinkronisasi:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/email-imports/gmail/callback` | Callback Google OAuth. |
| `POST` | `/api/email-imports/gmail/sync` | Sinkronisasi email Gmail aktif. |
| `GET` | `/api/email-imports/gmail/auto-sync` | Cron auto-sync semua koneksi Gmail aktif. |
| `POST` | `/api/email-imports/gmail/connections/:id/disconnect` | Putus koneksi Gmail dan hapus token. |

## File Implementasi

- Backend model Prisma: `apps/api/prisma/schema.prisma`
- Migration: `apps/api/prisma/migrations/20260602020500_add_email_transaction_imports/migration.sql`
- Backend module: `apps/api/src/modules/email-imports`
- Frontend otomasi: `apps/web/src/features/email-imports`
- Integrasi profile: `apps/web/src/features/profile/ProfilePage.tsx`
- Test parser: `apps/api/tests/email-import-parser.test.ts`

## Batasan Saat Ini

Fitur ini sudah bisa menghubungkan Gmail lewat OAuth, menyimpan token terenkripsi, mengenali rekening bank, menjalankan sinkronisasi awal dan manual, serta menjalankan auto-sync harian lewat Vercel Cron.

Saldo rekening otomatis merupakan saldo berdasarkan transaksi yang sudah tercatat di Sakuin, bukan saldo real-time dari bank. Gmail readonly tidak memberikan akses ke saldo rekening.

Auto-sync membutuhkan `CRON_SECRET` aktif di Vercel karena endpoint cron menolak request tanpa `Authorization: Bearer CRON_SECRET`.
