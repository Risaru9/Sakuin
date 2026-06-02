# Deteksi Transaksi dari Email

Dokumen ini menjelaskan rancangan dan implementasi awal fitur deteksi transaksi dari email bank/e-wallet di Sakuin.

## Tujuan Fitur

Fitur ini membantu user mencatat transaksi dari notifikasi email bank atau e-wallet dengan proses seminimal mungkin. User cukup menghubungkan Gmail atau memproses email transaksi, lalu Sakuin mendeteksi nominal, jenis transaksi, bank/e-wallet, tanggal, merchant, dan referensi transaksi.

Jika data email cukup lengkap, transaksi langsung dicatat ke menu Transaksi dan ikut memengaruhi Dashboard. Jika data belum cukup yakin, transaksi masuk ke daftar review agar user bisa menyetujui atau mengabaikannya.

## Alur Untuk User

1. User membuka Dashboard.
2. User masuk ke tab `Deteksi`.
3. User menghubungkan Gmail ketika OAuth sudah dikonfigurasi, atau memakai form uji parser untuk memvalidasi format email.
4. Sakuin membaca notifikasi bank/e-wallet yang relevan.
5. Transaksi dengan confidence tinggi langsung dicatat.
6. Transaksi yang ambigu masuk ke status `Review`.
7. User dapat menekan `Setujui` agar transaksi dicatat, atau `Abaikan` jika bukan transaksi yang perlu masuk Sakuin.

## Banyak Email dan Banyak Bank

Arsitektur fitur ini fleksibel untuk dua pola:

- Satu email untuk banyak bank/e-wallet.
- Banyak email, masing-masing untuk bank/e-wallet yang berbeda.

Setiap email disimpan sebagai `EmailConnection`. Sakuin juga menyimpan daftar provider yang pernah terdeteksi dari email tersebut, misalnya `BCA`, `BRI`, `DANA`, atau `SeaBank`.

Contoh:

| Email | Provider yang terdeteksi |
| --- | --- |
| utama@gmail.com | BCA, DANA, GoPay |
| bank-bca@gmail.com | BCA |
| seabank@gmail.com | SeaBank |

Dengan model ini user tidak perlu memilih bank secara manual. Provider dideteksi dari isi email dan pengirim email.

## Cara Sakuin Mencatat Transaksi

Parser membaca beberapa informasi utama:

- Bank/e-wallet: contoh `BCA`, `BRI`, `Mandiri`, `SeaBank`, `DANA`, `GoPay`, `OVO`, `ShopeePay`.
- Jenis transaksi: `INCOME` atau `EXPENSE`.
- Nominal: format `Rp` atau `IDR`.
- Metode: contoh `Transfer`, `QRIS`, `Debit`, `Top Up`, `Cashback`, `Refund`.
- Merchant/penerima jika ada.
- Referensi transaksi jika ada.
- Tanggal transaksi.

Kategori yang dibuat tidak generik. Sakuin membuat kategori seperti:

- `Transfer BCA`
- `Transfer DANA`
- `Transfer SeaBank`

Catatan transaksi juga membawa detail tambahan, misalnya:

`QRIS DANA - KOPI SENJA Ref DN98765 via wallet@gmail.com`

Dengan begitu user bisa melihat bank/e-wallet, metode, merchant, referensi, dan sumber email tanpa harus menebak dari kategori umum.

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

`transactionFingerprint` dibuat dari user, jenis transaksi, nominal, merchant, dan bucket waktu 5 menit. Ini membantu kasus user menerima notifikasi dari beberapa email untuk transaksi yang sama.

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
5. Mengembalikan user ke Dashboard.

User kemudian bisa menekan `Sinkronkan` di tab `Deteksi`. Backend akan membaca email Gmail terbaru dengan query transaksi, mengambil body email, lalu menjalankan pipeline parser yang sama dengan import manual.

Endpoint sinkronisasi:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/email-imports/gmail/callback` | Callback Google OAuth. |
| `POST` | `/api/email-imports/gmail/sync` | Sinkronisasi email Gmail aktif. |
| `POST` | `/api/email-imports/gmail/connections/:id/disconnect` | Putus koneksi Gmail dan hapus token. |

## File Implementasi

- Backend model Prisma: `apps/api/prisma/schema.prisma`
- Migration: `apps/api/prisma/migrations/20260602020500_add_email_transaction_imports/migration.sql`
- Backend module: `apps/api/src/modules/email-imports`
- Frontend tab dashboard: `apps/web/src/features/email-imports`
- Integrasi dashboard: `apps/web/src/features/dashboard/DashboardPage.tsx`
- Test parser: `apps/api/tests/email-import-parser.test.ts`

## Batasan Saat Ini

Fitur ini sudah bisa memproses email manual, menghubungkan Gmail lewat OAuth, menyimpan token terenkripsi, dan menjalankan sinkronisasi Gmail manual dari tab `Deteksi`.

Yang belum dibuat adalah worker otomatis terjadwal. Untuk saat ini user menekan `Sinkronkan` secara manual. Setelah kredensial Google Cloud aktif dan format parser cukup stabil, worker bisa ditambahkan agar sinkronisasi berjalan otomatis beberapa kali sehari.
