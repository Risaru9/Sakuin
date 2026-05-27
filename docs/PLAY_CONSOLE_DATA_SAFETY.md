# Sakuin Play Console Data Safety Draft

Dokumen ini menyiapkan jawaban awal untuk bagian Data safety di Google Play Console. Dokumen ini bukan nasihat hukum, tetapi pegangan produk dan teknis agar jawaban Play Console konsisten dengan cara Sakuin benar-benar memproses data.

## Tujuan

Tujuan dokumen ini:

- Memetakan data yang dikumpulkan Sakuin.
- Menjelaskan alasan data tersebut diproses.
- Membedakan data wajib, opsional, dan data yang hanya muncul saat user memakai fitur tertentu.
- Mengidentifikasi gap sebelum rilis Play Store production.
- Mencegah klaim berlebihan di Play Console.

## Prinsip Jawaban

Gunakan prinsip ini saat mengisi Data safety:

```txt
Jujur sesuai implementasi.
Jangan mengklaim fitur privacy yang belum ada.
Jangan menyebut data tidak dikumpulkan jika dikirim ke backend.
Jangan menyebut data tidak dibagikan tanpa mengecek penggunaan service provider.
Jangan memakai data safety sebagai materi marketing.
```

## Ringkasan Data

Sakuin memproses data user untuk menjalankan aplikasi keuangan pribadi.

Data utama:

```txt
Nama
Email
Password hash
Data transaksi
Kategori
Goals
Safe balance limit
Reminder preference
Push notification subscription endpoint
AI assistant prompt/context
Data teknis keamanan
```

## Data Type Mapping

### Personal Info

Data:

```txt
Nama user
Email user
```

Status:

```txt
Dikumpulkan
```

Alasan:

```txt
Account management
App functionality
Security
```

Catatan:

Email dipakai untuk login, reset password, identitas akun, dan komunikasi keamanan yang relevan.

### Financial Info

Data:

```txt
Nominal transaksi
Jenis transaksi
Kategori transaksi
Tanggal transaksi
Catatan transaksi
Goals tabungan
Safe balance limit
Ringkasan kondisi uang
```

Status:

```txt
Dikumpulkan
```

Alasan:

```txt
App functionality
Analytics user-facing di dalam app
Personalization terbatas untuk pengalaman user sendiri
```

Catatan:

Data ini adalah inti fitur Sakuin. Data dipakai untuk dashboard, transaksi, goals, checkup keuangan, export, reminder, dan konteks Asisten Sakuin.

### App Activity

Data:

```txt
Aktivitas membuat transaksi
Aktivitas mengubah transaksi
Aktivitas menghapus transaksi
Aktivitas export
Aktivitas login gagal atau auth error
```

Status:

```txt
Dikumpulkan terbatas
```

Alasan:

```txt
Security
Fraud prevention
App functionality
Debugging
```

Catatan:

Audit dan security event harus memakai metadata aman. Jangan mencatat isi export, password, token, credential Google, atau prompt AI mentah yang sensitif ke log.

### Device or Other IDs

Data:

```txt
Push subscription endpoint
Push subscription keys
Browser/device subscription metadata yang diperlukan web push
```

Status:

```txt
Dikumpulkan hanya jika user mengaktifkan notifikasi
```

Alasan:

```txt
App functionality
Notifications
```

Catatan:

Data ini dipakai agar reminder bisa dikirim ke device/browser yang user izinkan.

### Messages or User-Generated Content

Data:

```txt
Prompt yang dikirim user ke Asisten Sakuin
Riwayat chat lokal di device jika fitur frontend menyimpannya
Draft transaksi dari chat natural
```

Status:

```txt
Dikumpulkan saat user memakai Asisten Sakuin
```

Alasan:

```txt
App functionality
Personalization terbatas untuk konteks finansial user sendiri
```

Catatan:

Backend tidak boleh mengirim semua transaksi mentah ke AI provider untuk MVP. Konteks AI harus user-only, teragregasi, dan tidak berisi token, password, Authorization header, credential Google, atau secret.

## Data Optional vs Required

### Required untuk fungsi utama

```txt
Email
Nama
Password hash atau identitas Google Login
Transaksi
Kategori
Goals jika user membuat goals
Safe balance limit jika user mengatur batas aman
```

Tanpa data ini, fitur inti seperti login, dashboard, transaksi, goals, dan ringkasan tidak bisa berjalan normal.

### Optional atau feature-based

```txt
Push subscription endpoint
Reminder schedule
AI prompt
Export request
Custom category
```

Data ini hanya diproses ketika user mengaktifkan atau memakai fitur terkait.

## Sharing and Service Providers

Sakuin memakai layanan pihak ketiga untuk menjalankan aplikasi.

Contoh service provider:

```txt
Frontend hosting
Backend hosting
Database
Email delivery untuk reset password
Google Login
AI provider
Web push infrastructure
```

Interpretasi awal:

```txt
Data tidak dijual.
Data tidak dipakai untuk iklan pihak ketiga.
Data dapat diproses oleh service provider untuk menjalankan fitur Sakuin.
```

Catatan penting:

Di Play Console, definisi "sharing" perlu diisi sesuai aturan Google. Jika data hanya diproses oleh service provider atas nama Sakuin, itu bisa berbeda dari sharing untuk iklan/profiling, tetapi tetap harus dicek saat mengisi form.

## Security Practices

Jawaban awal:

```txt
Data encrypted in transit: Ya, menggunakan HTTPS.
User can request data deletion: Ya, request-based flow awal tersedia di /account-deletion.
Independent security review: Belum ada.
```

Security baseline Sakuin:

- Password disimpan sebagai hash.
- API private membutuhkan autentikasi.
- Data user dipisahkan berdasarkan akun.
- Service worker tidak boleh cache API private.
- Log tidak boleh menyimpan secret, token, password, atau data finansial mentah.
- AI provider hanya dipanggil dari backend.

## Account Deletion Flow

Sakuin mengizinkan user membuat akun. Flow awal request hapus akun sudah disiapkan:

```txt
Halaman publik : /account-deletion
Link dari app  : Profile -> Request hapus akun
Metode awal    : Email support terverifikasi
SOP            : docs/ACCOUNT_DELETION_SOP.md
Technical plan : docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md
```

Sebelum rilis Play Store production, bagian operasional berikut tetap perlu dipastikan:

```txt
[x] Jalur dari dalam app untuk request hapus akun
[x] Halaman web publik untuk request hapus akun
[ ] Penjelasan data apa yang ikut dihapus
[ ] Penjelasan data apa yang mungkin disimpan sementara untuk alasan keamanan/legal
[x] SOP operasional untuk menindaklanjuti request user
[ ] Proses teknis deletion diuji di database non-production
```

Rekomendasi implementasi minimum:

```txt
1. Gunakan halaman publik /account-deletion sebagai entry point.
2. Pastikan link dari Profile tetap mudah ditemukan.
3. Minta user menghubungi support memakai email akun.
4. Ikuti SOP manual di docs/ACCOUNT_DELETION_SOP.md.
5. Setelah operasional siap, baru pertimbangkan self-service delete penuh.
```

Alasan:

Lebih aman memulai dari request-based deletion yang jelas daripada langsung membuat fitur delete permanen tanpa audit dan recovery plan.

## Data Safety Draft Answers

Bagian ini adalah draft ringkas untuk dipindahkan ke Play Console.

```txt
Does your app collect or share user data?
Yes.

Is all user data collected encrypted in transit?
Yes.

Can users request that their data is deleted?
Yes, via the public account deletion request page and Profile link. SOP is documented, but technical deletion must be tested in a non-production database before production submission.

Does the app share data?
Use caution. Data is processed by service providers for app functionality. Confirm Play Console definition before final submission.

Is data sold?
No.
```

Per data type:

| Data type | Collected | Purpose | Optional |
| --- | --- | --- | --- |
| Name | Yes | Account management, app functionality | No |
| Email | Yes | Account management, login, reset password, security | No |
| Financial info | Yes | App functionality, user-facing financial summary | No for core finance features |
| App activity | Limited | Security, audit, app functionality | No |
| Device or other IDs | Conditional | Notification delivery | Yes |
| User messages / AI prompt | Conditional | AI Assistant functionality | Yes |

## Data That Must Not Be Claimed

Jangan klaim hal berikut sampai benar-benar ada:

```txt
Sakuin sudah punya self-service account deletion penuh.
Sakuin sudah menjalani independent security review.
Sakuin tidak mengumpulkan data finansial.
Sakuin tidak mengirim data apa pun ke pihak ketiga.
Sakuin memberi nasihat investasi profesional.
Sakuin membaca rekening bank/e-wallet otomatis.
```

## Final Checklist Before Play Console Submission

```txt
[ ] Privacy policy publik aktif
[ ] Data Safety cocok dengan privacy policy
[x] Account deletion request flow tersedia
[x] Link deletion publik tersedia
[x] Support email resmi tersedia
[x] SOP account deletion terdokumentasi
[x] Rencana teknis account deletion terdokumentasi
[ ] Proses teknis deletion diuji di database non-production
[ ] Test account tersedia untuk reviewer
[ ] AI Assistant disclaimer konsisten
[ ] Notification behavior sesuai deskripsi
[ ] Screenshot tidak memakai data real user
[ ] Tidak ada permission Android yang tidak perlu
```
