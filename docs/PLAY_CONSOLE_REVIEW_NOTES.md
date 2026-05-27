# Sakuin Play Console Review Notes Draft

Dokumen ini menyiapkan catatan untuk reviewer Google Play ketika Sakuin masuk internal testing, closed testing, atau production review.

Tujuannya sederhana: reviewer bisa memahami fungsi app, cara login, fitur utama, batasan AI, notifikasi, dan privacy tanpa menebak-nebak.

## App Summary

```txt
Sakuin is a personal finance app for recording income and expenses, viewing a daily financial dashboard, managing savings goals, setting reminders, exporting transaction data, and using a financial-only assistant to understand personal finance activity inside Sakuin.
```

Versi Indonesia:

```txt
Sakuin adalah aplikasi keuangan pribadi untuk mencatat pemasukan dan pengeluaran, melihat dashboard harian, mengelola goals tabungan, mengatur pengingat, export data transaksi, dan memakai Asisten Sakuin untuk memahami kondisi keuangan pribadi di dalam Sakuin.
```

## Reviewer Access

Isi sebelum submit:

```txt
Test account email    : <isi email test reviewer>
Test account password : <isi password test reviewer>
Login method          : Email/password
```

Catatan:

Jangan memakai akun pribadi owner untuk reviewer. Buat akun khusus dengan data dummy.

## Suggested Review Flow

Reviewer dapat memakai flow berikut:

```txt
1. Open the app.
2. Log in using the provided test account.
3. Open Dashboard.
4. Add a transaction using normal transaction form.
5. Add a transaction using Quick Transaction.
6. Open Transactions and confirm the new records are visible.
7. Open Goals and create or inspect a savings goal.
8. Open Profile and inspect reminder settings.
9. Send a test notification if permission is granted.
10. Open AI Assistant and ask a finance-related question.
11. Export transactions from Export.
12. Open Privacy Policy from the public route.
```

## Features to Highlight

Fitur utama yang perlu reviewer pahami:

```txt
Dashboard
Manual transaction input
Quick Transaction
Transactions list
Goals
Reminder settings
Push notification test
AI Assistant
Export
Privacy Policy
```

## AI Assistant Notes

Catatan untuk reviewer:

```txt
The AI Assistant is limited to personal finance topics inside Sakuin.
It is not a general-purpose chatbot.
It does not provide professional investment, loan, tax, legal, or financial advice.
It can help summarize spending, income, goals, and simple financial conditions based on the user's Sakuin data.
AI-generated transaction drafts require user review before saving.
The AI Assistant must not automatically save transactions without user confirmation.
```

Prompt test yang aman:

```txt
Pengeluaran bulan ini gimana?
Saya boros di mana?
Catat makan siang 25000
Goal tabungan saya masih aman?
```

Prompt yang memang sebaiknya dibatasi:

```txt
Saham apa yang harus saya beli?
Pinjaman mana yang harus saya ambil?
Tolong jawab pertanyaan hukum pajak saya.
```

## Notification Notes

Catatan untuk reviewer:

```txt
Notifications are used only as transaction reminders.
Users must grant notification permission before receiving push notifications.
Users can configure reminder settings from Profile.
Users can test notification delivery from the app.
The app should avoid aggressive notification frequency.
```

Jika reviewer tidak melihat notifikasi:

```txt
1. Pastikan browser/device mengizinkan notification permission.
2. Pastikan user sudah login.
3. Pastikan reminder aktif.
4. Gunakan tombol test notification dari Profile.
5. Cek apakah device/browser menahan notification karena mode hemat baterai atau setting system.
```

## Privacy Policy

URL production yang direncanakan:

```txt
https://sakuin-web.vercel.app/privacy
```

Catatan:

Privacy policy harus bisa dibuka tanpa login. Jika URL ini belum deploy saat submission, jangan submit production review.

## Account Deletion Notes

Status saat ini:

```txt
Request-based account deletion flow awal tersedia.
```

Link:

```txt
https://sakuin-web.vercel.app/account-deletion
```

Sebelum production review, pastikan:

```txt
[x] Link request hapus akun publik
[x] Link dari Profile ke request hapus akun
[x] Support email resmi
[x] Proses penghapusan data terdokumentasi di docs/ACCOUNT_DELETION_SOP.md
[x] Rencana teknis deletion terdokumentasi di docs/ACCOUNT_DELETION_TECHNICAL_PLAN.md
[ ] Proses teknis deletion diuji di database non-production
[ ] Penjelasan data retention jika ada data yang perlu disimpan sementara
```

Catatan reviewer setelah fitur siap:

```txt
Users can request account deletion from the Profile page and from the public account deletion web page. The request is verified through the support process before account data is deleted.
```

## Permissions

Untuk PWA/TWA awal, permission harus minimal.

Expected permission:

```txt
Internet
Notification, if required by the Android wrapper or browser behavior
```

Permission yang tidak diperlukan:

```txt
Contacts
SMS
Camera
Microphone
Location
Broad file storage
```

Jika salah satu permission di atas muncul di Android manifest, harus ada alasan produk yang kuat. Untuk kondisi Sakuin sekarang, sebaiknya tidak dipakai.

## Test Data Guidance

Gunakan data dummy seperti:

```txt
Income: Gaji, freelance, bonus
Expense: Makan, transport, bensin, langganan, belanja
Goals: Dana darurat, laptop, liburan
```

Jangan gunakan:

```txt
Email pribadi owner
Nomor rekening asli
Data transaksi real user
Screenshot saldo real
Token, secret, atau API key
```

## Reviewer Notes Template

Template singkat untuk kolom reviewer notes:

```txt
Sakuin is a personal finance app for recording income and expenses, tracking savings goals, setting transaction reminders, exporting transaction data, and using a financial-only assistant.

Please use the provided test account to log in. After login, you can test Dashboard, Transactions, Quick Transaction, Goals, Profile reminder settings, AI Assistant, and Export.

The AI Assistant is limited to finance-related questions inside Sakuin and is not professional investment, loan, tax, legal, or financial advice. AI-generated transaction drafts require user review before saving.

Notifications are used only for transaction reminders and require user permission. Reminder settings and test notification are available in Profile.

Privacy Policy: https://sakuin-web.vercel.app/privacy
Account deletion request: https://sakuin-web.vercel.app/account-deletion
```

## Submission Blockers

Jangan submit Play Store production jika:

```txt
[ ] Test account belum dibuat
[ ] Privacy URL belum aktif
[ ] Account deletion request flow tidak bisa dibuka
[ ] App masih punya route error di fitur utama
[ ] Login gagal di Android wrapper
[ ] AI Assistant tertutup keyboard atau bottom nav
[ ] Notifikasi tidak bisa dites sama sekali
[ ] Permission Android terlalu luas
[ ] Screenshot memakai data asli
```
