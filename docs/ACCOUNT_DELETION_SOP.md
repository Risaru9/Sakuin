# Sakuin Account Deletion SOP

Dokumen ini adalah SOP awal untuk menangani request penghapusan akun Sakuin. Tujuannya agar user punya kontrol atas data, tim punya proses yang rapi, dan submission Play Store tidak bergantung pada jawaban informal.

## Tujuan

SOP ini memastikan:

- Request user diterima lewat jalur yang jelas.
- Kepemilikan akun diverifikasi sebelum data dihapus.
- Data yang dihapus dan data yang mungkin ditahan sementara dijelaskan.
- Tidak ada penghapusan data production yang dilakukan secara ceroboh.
- Play Console reviewer dapat melihat bahwa Sakuin punya proses request deletion.

## Jalur User

Entry point:

```txt
Public URL : https://sakuin-web.vercel.app/account-deletion
In-app     : Profile -> Request hapus akun
Support   : sakuinofficial@gmail.com
```

Catatan:

URL production baru aktif setelah deploy frontend yang memuat route `/account-deletion`.

## Informasi yang Harus Diminta dari User

Minta user mencantumkan:

```txt
Email akun Sakuin yang ingin dihapus
Nama akun jika masih diingat
Konfirmasi bahwa user memahami akses akun akan hilang
Alasan penghapusan jika user ingin memberi feedback
```

Jangan meminta:

```txt
Password
Token login
Kode OTP
Screenshot data finansial sensitif
Informasi rekening bank
Informasi kartu pembayaran
```

## SLA Awal

Gunakan target operasional awal:

```txt
Respons awal       : 3-7 hari kerja
Verifikasi awal    : 3-7 hari kerja
Eksekusi deletion  : setelah kepemilikan akun tervalidasi
```

Jika volume request meningkat, SLA perlu direvisi dan dibuat lebih formal.

## Proses Support

### 1. Terima Request

Checklist:

```txt
[ ] Request masuk ke email support resmi
[ ] Email pengirim cocok dengan email akun Sakuin atau bisa diverifikasi
[ ] User menyebutkan niat menghapus akun dengan jelas
[ ] Tidak ada permintaan password/token/secret dari user
```

Jika email pengirim berbeda dari email akun:

```txt
1. Minta user login ke Sakuin dan mengirim ulang dari email akun.
2. Jika user tidak bisa login, verifikasi secara manual dengan hati-hati.
3. Jangan menghapus akun hanya dari klaim tanpa verifikasi.
```

### 2. Konfirmasi Dampak ke User

Kirim konfirmasi bahwa penghapusan akun dapat menghapus:

```txt
Profile akun
Transaksi
Kategori custom
Goals
Safe balance limit
Reminder settings
Push subscriptions
Data aplikasi lain yang terkait langsung dengan akun
```

Jelaskan juga:

```txt
Setelah data dihapus, akun dan data terkait tidak bisa dipulihkan lewat UI biasa.
Sebagian metadata keamanan dapat disimpan sementara jika diperlukan untuk audit, pencegahan penyalahgunaan, atau kewajiban legal.
```

### 3. Verifikasi Final

Sebelum penghapusan:

```txt
[ ] Pastikan email akun benar
[ ] Pastikan user memahami konsekuensi
[ ] Pastikan tidak ada dispute atau request ambigu
[ ] Catat waktu request dan waktu konfirmasi
[ ] Simpan bukti support thread secara aman
```

### 4. Eksekusi Penghapusan

Aturan penting:

```txt
Jangan menjalankan delete langsung di production tanpa backup dan review query.
Jangan memakai command ad hoc yang belum dicek.
Jangan memakai database lokal untuk menganggap production sudah terhapus.
Jangan menghapus data user lain.
```

Untuk tahap awal, eksekusi teknis harus dilakukan oleh owner/developer yang memahami relasi database Sakuin.

Rencana teknis detail tersedia di:

```txt
docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md
```

Rekomendasi sebelum membuat self-service delete:

```txt
1. Buat endpoint backend internal yang teruji untuk menghapus akun user sendiri.
2. Tambahkan audit event aman untuk request dan completion.
3. Pastikan cascade delete sesuai schema.
4. Tambahkan test di database non-production.
5. Baru aktifkan self-service deletion jika prosesnya stabil.
```

### 5. Konfirmasi Selesai

Setelah penghapusan selesai:

```txt
[ ] Kirim email konfirmasi ke user
[ ] Jelaskan bahwa akun/data aplikasi terkait sudah diproses
[ ] Jelaskan jika ada metadata terbatas yang disimpan sementara
[ ] Jangan mengirim detail data finansial di email
```

## Template Email

### Respons Awal

```txt
Subject: Request hapus akun Sakuin diterima

Halo,

Kami sudah menerima request penghapusan akun Sakuin untuk email: <email akun>.

Sebelum memproses, kami perlu memastikan bahwa request ini benar berasal dari pemilik akun. Mohon balas email ini dengan konfirmasi bahwa kamu memahami penghapusan akun dapat menghapus profile, transaksi, kategori, goals, reminder, dan data aplikasi lain yang terkait langsung dengan akun Sakuin.

Jangan kirim password, token, kode OTP, atau data finansial sensitif melalui email.

Terima kasih,
Tim Sakuin
```

### Konfirmasi Dampak

```txt
Subject: Konfirmasi penghapusan akun Sakuin

Halo,

Jika request ini dilanjutkan, akun Sakuin dan data aplikasi terkait akan diproses untuk penghapusan. Setelah selesai, akun dan data terkait tidak bisa dipulihkan lewat UI biasa.

Sebagian metadata keamanan dapat disimpan sementara jika diperlukan untuk audit, pencegahan penyalahgunaan, atau kewajiban legal.

Balas email ini dengan kalimat:
"Saya setuju untuk menghapus akun Sakuin saya."

Terima kasih,
Tim Sakuin
```

### Selesai Diproses

```txt
Subject: Penghapusan akun Sakuin selesai diproses

Halo,

Request penghapusan akun Sakuin kamu sudah selesai diproses.

Data aplikasi yang terkait langsung dengan akun telah diproses sesuai kebijakan Sakuin. Jika ada metadata terbatas yang perlu disimpan sementara untuk keamanan, audit, pencegahan penyalahgunaan, atau kewajiban legal, data tersebut tidak digunakan untuk menjalankan fitur aplikasi.

Terima kasih sudah pernah menggunakan Sakuin.
Tim Sakuin
```

## Data Retention Guidance

Data yang sebaiknya dihapus:

```txt
User profile
Transactions
Custom categories
Goals
Reminder settings
Push subscriptions
OAuth account link jika terkait akun
Password reset tokens jika masih aktif
```

Data yang mungkin perlu ditahan sementara:

```txt
Audit/security metadata yang aman
Catatan support request
Metadata yang diperlukan untuk pencegahan penyalahgunaan atau kewajiban legal
```

Retention detail harus disesuaikan lagi dengan kebijakan legal final.

## Play Console Notes

Saat mengisi Play Console:

```txt
Account deletion URL: https://sakuin-web.vercel.app/account-deletion
Users can request deletion from inside the app: Yes, via Profile.
Deletion method: Support-verified request flow.
```

Jangan klaim:

```txt
Self-service deletion penuh
Instant deletion
Independent legal/security certification
```

## Definition of Done

SOP ini dianggap siap untuk tahap awal jika:

```txt
[x] Halaman publik /account-deletion tersedia
[x] Link dari Profile tersedia
[x] Email support ditampilkan
[x] Template email tersedia
[x] Data deletion scope terdokumentasi
[x] Rencana teknis deletion terdokumentasi
[ ] Production route sudah deploy
[ ] Owner sudah menguji request email
[ ] Proses teknis deletion sudah diuji di database non-production
```
