# Sakuin Privacy Policy Draft

Dokumen ini adalah draft awal privacy policy untuk kebutuhan app store readiness. Draft ini harus direview ulang sebelum dipublikasikan sebagai halaman resmi.

## Ringkasan

Sakuin adalah aplikasi keuangan pribadi yang membantu user mencatat transaksi, membaca ringkasan uang, memantau goals tabungan, menerima pengingat transaksi, dan memakai Asisten Sakuin untuk memahami kondisi keuangan pribadi.

Sakuin memproses data yang user masukkan agar fitur aplikasi dapat berjalan.

## Data yang Dikumpulkan

Sakuin dapat memproses data berikut:

- Nama.
- Email.
- Password dalam bentuk hash di backend.
- Data transaksi, termasuk nominal, tipe, kategori, tanggal, dan catatan.
- Data kategori.
- Data goals tabungan.
- Safe balance limit.
- Pengaturan reminder.
- Push notification subscription endpoint.
- Prompt dan konteks yang dikirim ke Asisten Sakuin.
- Data teknis dasar seperti request ID dan waktu request untuk keamanan dan debugging.

## Tujuan Penggunaan Data

Data digunakan untuk:

- Membuat dan mengamankan akun user.
- Menampilkan dashboard keuangan.
- Menyimpan transaksi user.
- Mengelola kategori dan goals.
- Mengirim pengingat transaksi jika user mengaktifkannya.
- Menjawab pertanyaan user melalui Asisten Sakuin.
- Menjaga keamanan dan stabilitas aplikasi.
- Membantu debugging tanpa menyimpan informasi sensitif mentah di log.

## Data Keuangan

Data transaksi dan goals adalah data pribadi user. Sakuin menggunakannya untuk fitur aplikasi seperti dashboard, ringkasan, export, reminder, dan Asisten Sakuin.

Sakuin tidak boleh memakai data keuangan user untuk membuat keputusan otomatis yang berdampak finansial besar tanpa review user.

## Asisten Sakuin

Asisten Sakuin digunakan untuk membantu user memahami data keuangan pribadi di Sakuin.

Prinsip AI Assistant:

- Hanya menjawab topik keuangan pribadi yang relevan dengan Sakuin.
- Tidak menjadi pengganti nasihat investasi, pajak, pinjaman, hukum, atau profesional lain.
- Draft transaksi dari AI harus direview user sebelum disimpan.
- AI tidak boleh auto-save transaksi tanpa persetujuan user.

## Notifikasi

Jika user mengaktifkan reminder, Sakuin dapat menyimpan pengaturan reminder dan push subscription endpoint agar notifikasi dapat dikirim.

User dapat mematikan reminder dari Profile.

## Penyimpanan dan Keamanan

Sakuin menyimpan data di backend dan database yang digunakan aplikasi.

Prinsip keamanan:

- Password tidak disimpan dalam bentuk plain text.
- API private membutuhkan autentikasi.
- Data user dipisahkan berdasarkan akun.
- Log tidak boleh menyimpan password, token, atau detail finansial sensitif secara mentah.

## Pihak Ketiga

Sakuin dapat menggunakan layanan pihak ketiga untuk menjalankan aplikasi, seperti:

- Hosting frontend.
- Hosting backend.
- Database.
- Email reset password.
- Google Login.
- AI provider untuk fitur Asisten Sakuin.
- Web push notification infrastructure.

Data dikirim ke layanan tersebut hanya sejauh diperlukan untuk menjalankan fitur aplikasi.

## Hak User

User dapat:

- Login dan logout.
- Mengubah nama profile.
- Mengubah safe balance limit.
- Membuat, mengubah, dan menghapus transaksi.
- Mengelola kategori dan goals.
- Mematikan reminder.
- Mengekspor data transaksi.

Penghapusan akun penuh perlu dibuat sebagai fitur atau proses support sebelum rilis store production jika diwajibkan oleh policy.

## Anak-Anak

Sakuin tidak dirancang khusus untuk anak-anak. Jika aplikasi akan dipublikasikan di store, target usia dan policy keluarga harus ditentukan di Play Console.

## Perubahan Policy

Privacy policy dapat diperbarui ketika fitur aplikasi berubah, terutama jika ada perubahan pada data yang dikumpulkan, integrasi pihak ketiga, AI, notifikasi, atau fitur native.

## Catatan Sebelum Publikasi

Sebelum dipublikasikan:

```txt
[ ] Pastikan nama pemilik/pengelola aplikasi benar.
[ ] Tambahkan kontak resmi.
[ ] Tambahkan tanggal efektif.
[ ] Tambahkan URL production policy.
[ ] Review kesesuaian dengan Google Play Data Safety.
[ ] Review kesesuaian dengan hukum yang berlaku.
```
