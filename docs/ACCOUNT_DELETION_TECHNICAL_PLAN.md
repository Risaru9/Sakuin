# Sakuin Account Deletion Technical Plan

Dokumen ini adalah rencana teknis untuk menguji dan mengimplementasikan penghapusan akun Sakuin dengan aman. Dokumen ini tidak menjalankan penghapusan data apa pun.

Tujuan utamanya: membuat proses deletion bisa diuji dulu di database non-production sebelum ada eksekusi di production.

## Tujuan

Rencana ini dibuat untuk:

- Memetakan semua data yang terkait dengan `User`.
- Menentukan data mana yang harus dihapus.
- Menentukan data mana yang boleh menjadi anonymized/retained metadata.
- Menghindari penghapusan data user lain.
- Menyiapkan dry-run dan acceptance test sebelum implementasi backend.

## Keputusan Saat Ini

Untuk tahap sekarang:

```txt
Jangan membuat self-service deletion penuh dulu.
Jangan menjalankan delete production secara manual.
Jangan menambahkan endpoint destructive sebelum test non-production selesai.
Gunakan request-based deletion sebagai alur user-facing awal.
```

Alasan:

Data Sakuin mencakup transaksi, goals, kategori, reminder, dan akun login. Penghapusan harus diperlakukan sebagai operasi irreversible yang perlu verifikasi, test, dan audit.

## Database Relation Inventory

Berdasarkan `apps/api/prisma/schema.prisma`, relasi user saat ini:

| Model | Relasi ke User | onDelete | Perlakuan deletion |
| --- | --- | --- | --- |
| `Transaction` | `userId` wajib | `Cascade` | Terhapus bersama user |
| `Goal` | `userId` wajib | `Cascade` | Terhapus bersama user |
| `Category` | `userId` optional | `Cascade` | Custom category user terhapus, default category tetap |
| `OauthAccount` | `userId` wajib | `Cascade` | Terhapus bersama user |
| `PushSubscription` | `userId` wajib | `Cascade` | Terhapus bersama user |
| `ReminderPreference` | `userId` unique | `Cascade` | Terhapus bersama user |
| `AuditLog` | `actorUserId` optional | `SetNull` | Tidak terhapus otomatis, actorUserId jadi null |

Catatan:

`AuditLog` memakai `SetNull`, sehingga metadata audit dapat tetap ada tanpa menunjuk langsung ke user yang sudah dihapus. Ini berguna untuk keamanan, tetapi metadata audit tetap harus aman dan tidak berisi data finansial mentah.

## Data yang Harus Terhapus

Saat request deletion valid:

```txt
User
Transactions
Goals
Custom categories
OAuth account links
Push subscriptions
Reminder preferences
Reset password token fields
```

Karena sebagian besar memakai cascade, deletion terhadap `User` dapat menghapus data anak terkait. Namun, ini tetap harus diuji karena `Transaction.categoryId` juga memiliki relasi ke `Category`.

## Data yang Tidak Boleh Terhapus Sembarangan

```txt
Default categories dengan userId null
Audit logs aman yang dibutuhkan untuk security/audit
Catatan support request di luar database aplikasi
```

Default category adalah data sistem dan dipakai oleh user lain. Jangan menghapus default category.

## Area Risiko

### 1. Transaction dan Custom Category

Risiko:

`Transaction` punya `categoryId`, sementara custom `Category` juga akan cascade dari user. Jika urutan deletion atau constraint database tidak sesuai, deletion bisa gagal.

Mitigasi:

```txt
Uji dengan user yang punya transaksi memakai custom category.
Pastikan delete user menghapus transaksi dan custom category tanpa constraint error.
```

### 2. AuditLog Retention

Risiko:

Audit log tetap ada dengan `actorUserId` null. Jika metadata menyimpan data personal mentah, privacy risk tetap ada.

Mitigasi:

```txt
Audit metadata harus tetap safe metadata.
Jangan menyimpan email, token, password, isi export, prompt AI mentah sensitif, atau detail transaksi mentah.
```

### 3. Push Subscription

Risiko:

Jika push subscription tidak terhapus, user bisa tetap menerima notifikasi setelah akun dihapus.

Mitigasi:

```txt
Pastikan PushSubscription count menjadi 0 untuk user yang dihapus.
Pastikan reminder worker tidak menemukan preference/subscription user tersebut.
```

### 4. OAuth Account

Risiko:

Jika OAuth account link tersisa, user bisa mengalami login state aneh atau collision saat register ulang.

Mitigasi:

```txt
Pastikan OauthAccount userId terkait ikut terhapus.
```

## Dry-Run Checklist

Sebelum menjalankan deletion di non-production:

```txt
[ ] Pastikan DATABASE_URL mengarah ke database non-production.
[ ] Pastikan DIRECT_URL juga non-production.
[ ] Buat user dummy khusus deletion test.
[ ] Tambahkan transaksi income dan expense.
[ ] Tambahkan custom category dan transaksi yang memakainya.
[ ] Tambahkan goal.
[ ] Aktifkan reminder preference.
[ ] Tambahkan push subscription dummy.
[ ] Tambahkan OAuth account dummy jika memungkinkan.
[ ] Catat semua count sebelum deletion.
```

Setelah deletion:

```txt
[ ] User count untuk email dummy menjadi 0.
[ ] Transaction count untuk user dummy menjadi 0.
[ ] Goal count untuk user dummy menjadi 0.
[ ] Custom category user dummy menjadi 0.
[ ] Default category tetap ada.
[ ] Push subscription user dummy menjadi 0.
[ ] Reminder preference user dummy menjadi 0.
[ ] OAuth account user dummy menjadi 0.
[ ] Audit log tidak menyimpan actorUserId user dummy.
[ ] User lain tidak berubah.
```

## Proposed Backend Service Shape

Jika nanti dibuat sebagai service backend, bentuk awal yang direkomendasikan:

```ts
type AccountDeletionPreview = {
  userId: string;
  email: string;
  counts: {
    transactions: number;
    goals: number;
    customCategories: number;
    pushSubscriptions: number;
    reminderPreferences: number;
    oauthAccounts: number;
    auditLogsToAnonymize: number;
  };
};

type AccountDeletionResult = {
  userId: string;
  deleted: true;
  deletedAt: string;
};
```

Service yang disarankan:

```txt
getAccountDeletionPreview(userId)
deleteUserAccountAfterVerifiedRequest(userId)
```

Jangan menerima `userId` dari body request frontend untuk menentukan target deletion. Gunakan `userId` dari token/session atau proses support internal yang tervalidasi.

## Endpoint Recommendation

Untuk self-service di masa depan:

```txt
GET    /api/users/account-deletion/preview
DELETE /api/users/account
```

Syarat sebelum endpoint aktif:

```txt
[ ] User harus login.
[ ] User harus konfirmasi ulang.
[ ] Password re-auth atau email confirmation dipertimbangkan.
[ ] Endpoint rate-limited.
[ ] Audit event aman dicatat.
[ ] Response tidak mengandung data sensitif.
```

Untuk tahap support manual:

```txt
Jangan expose endpoint deletion publik dulu.
Gunakan service internal atau script terkontrol setelah SOP dan test matang.
```

## Test Scenarios

Minimal test yang harus dibuat sebelum implementasi production:

```txt
[ ] User tanpa transaksi bisa dihapus.
[ ] User dengan transaksi default category bisa dihapus.
[ ] User dengan transaksi custom category bisa dihapus.
[ ] User dengan goals bisa dihapus.
[ ] User dengan reminder preference dan push subscription bisa dihapus.
[ ] User Google Login/OAuth bisa dihapus.
[ ] User lain tidak terdampak.
[ ] Default categories tetap ada.
[ ] AuditLog actorUserId menjadi null atau aman.
[ ] Endpoint gagal tanpa auth.
[ ] Endpoint gagal jika user tidak mengonfirmasi.
```

## Suggested Non-Production Validation Flow

```txt
1. Buat branch khusus account deletion.
2. Pastikan env mengarah ke Supabase/local database testing, bukan production.
3. Seed user dummy lengkap.
4. Jalankan preview count.
5. Jalankan deletion dalam transaction.
6. Jalankan post-check count.
7. Jalankan test regression auth, dashboard, transaksi, goals, reminder.
8. Review hasil sebelum mempertimbangkan production.
```

## Production Safety Rules

Aturan wajib:

```txt
Jangan menjalankan query deletion di production dari terminal ad hoc.
Jangan menjalankan script deletion tanpa preview count.
Jangan memakai screenshot credential production sebagai input command.
Jangan menghapus akun user tanpa request dan verifikasi.
Jangan menghapus data lebih luas dari user yang ditargetkan.
```

Jika suatu saat deletion production harus dilakukan manual:

```txt
1. Validasi request support.
2. Catat user id dan email target.
3. Jalankan preview count.
4. Review hasil preview.
5. Backup/snapshot sesuai kemampuan platform.
6. Jalankan deletion.
7. Jalankan post-check.
8. Kirim konfirmasi ke user.
```

## Current Status

```txt
[x] Route publik /account-deletion tersedia
[x] Link dari Profile tersedia
[x] SOP support tersedia
[x] Technical deletion plan tersedia
[ ] Preview service tersedia
[ ] Deletion service tersedia
[ ] Non-production deletion test tersedia
[ ] Production deletion automation tersedia
```

## Rekomendasi Berikutnya

Langkah berikutnya yang paling aman:

```txt
1. Buat test backend untuk account deletion preview di database non-production.
2. Buat service preview count tanpa delete.
3. Setelah preview stabil, buat deletion service dengan transaction.
4. Uji semua skenario deletion di non-production.
5. Baru pertimbangkan self-service atau admin-assisted deletion.
```
