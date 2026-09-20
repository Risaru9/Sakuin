# Handoff: hapus fitur Rekening, sembunyikan Impor Gmail

**Keputusan pemilik, 20 September 2026:**

1. **Rekening dihapus penuh** — tidak dipakai, dianggap ribet. Hapus layar, API, tipe, dan (setelah izin) tabel database.
2. **Impor dari Gmail hanya disembunyikan dari tampilan** — kodenya tetap ada, supaya bisa dihidupkan lagi nanti. Jangan hapus `apps/web/src/features/email-imports/` maupun `apps/api/src/modules/email-imports/`.

## Cara pakai dokumen ini (untuk pemilik)

Beri Codex perintah ini:

> Baca `docs/HANDOFF_HAPUS_REKENING.md` sampai habis, lalu kerjakan Tahap 1 sampai 4 berurutan. Catat hasil tiap tahap di bagian "Catatan pengerjaan" di dokumen ini, lalu commit. Jangan jalankan Tahap 3 (hapus tabel database) sebelum saya bilang boleh. Balas saya dalam bahasa Indonesia sederhana dan jangan merge ke `main` sebelum saya setuju.

Aturan kerja lain (balas bahasa Indonesia, mockup sebelum UI baru, jangan commit `keystore.properties`/`local.properties`, jangan arahkan apa pun ke database produksi) tetap sama seperti `docs/HANDOFF_APK_2.1.md` bagian 1.

---

## PERINGATAN: kata "account" punya dua arti di repo ini

| Arti | Contoh | Tindakan |
| --- | --- | --- |
| **Rekening** (dompet/bank pengguna) | model Prisma `Account`, `AccountTransfer`, enum `AccountType`, folder `features/accounts`, `RekeningPage`, `TransferSheet`, `Transaction.accountId` | **DIHAPUS** |
| **Akun pengguna** (login) | `OauthAccount`, `providerAccountId`, `getActiveAccountScope()` di `lib/auth-storage.ts`, `ACCOUNT_DELETION_MAILTO` di `router.tsx`, `existingOauthAccount` di `auth.service.ts` | **JANGAN DISENTUH** |

Setiap kali ragu, cek: kalau menyangkut login/Google/hapus akun → itu akun pengguna, biarkan.

Catatan penting lain: **transaksi tidak ikut terhapus.** `Transaction.accountId` bersifat opsional (`String?`), jadi melepas rekening tidak menghilangkan catatan pengeluaran/pemasukan siapa pun.

---

## Tahap 1 — Web: hilangkan rekening dari tampilan dan kode

Hapus berkas:

- `apps/web/src/features/accounts/` (seluruh folder: `account-data.ts`, `account-data.test.ts`, `account.service.ts`, `account.types.ts`, `AccountFormSheet.tsx`, `TransferSheet.tsx`)
- `apps/web/src/features/lainnya/RekeningPage.tsx` dan `RekeningPage.test.tsx`

Sunting berkas (hapus bagian rekeningnya saja):

- `apps/web/src/app/router.tsx` — lazy import `RekeningPage` (≈ baris 94) dan rute `/lainnya/rekening`.
- `apps/web/src/features/lainnya/LainnyaPage.tsx` — kartu **"Rekening"** (≈ baris 82–86) beserta `import { getAccounts }` (baris 28), query accounts, dan perhitungan `totalBalance`; **juga** kartu **"Impor dari Gmail"** (≈ baris 135–136) — ini bagian "sembunyikan", berkas fiturnya tetap.
- `apps/web/src/features/transactions/use-reference-data.ts` — buang bagian `accounts`, sisakan kategori saja (perbarui juga komentar di baris 9).
- `apps/web/src/features/transactions/TransactionFieldPickers.tsx`, `apps/web/src/features/beranda/EditTransactionSheet.tsx`, `apps/web/src/features/quick-composer/ComposerDetailSheet.tsx` — hapus pemilih rekening. Setelah ini, form transaksi hanya punya kategori, tanggal, jumlah, catatan.
- `apps/web/src/features/quick-composer/composer-logic.ts` dan `use-quick-composer.ts`, `QuickComposer.tsx` — hapus rekening dari draft dan hasil parsing.
- `apps/web/src/features/beranda/beranda-data.ts`, `BerandaPage.tsx`, `SearchPage.tsx`, `use-transaction-actions.ts`, `use-pending-transactions.ts` — hapus tampilan/filter rekening.
- `apps/web/src/features/laporan/LaporanPage.tsx`, `apps/web/src/features/goals/GoalFormSheet.tsx`, `apps/web/src/features/reminders/daily-review-completion.ts`, `apps/web/src/lib/saku-notifications.ts`, `apps/web/src/lib/offline-queue.ts`, `apps/web/src/features/transactions/transaction.service.ts` — hapus field/parameter rekening.
- `apps/web/src/lib/query-keys.ts` — hapus `accounts`, `accountTransfers`, `accountsWithArchived` (baris 8–10). **Biarkan** `emailImports` (baris 12–13).
- `apps/web/src/features/dev/dev-fake-api.ts`, `BerandaPreviewPage.tsx`, `SakuPlaygroundPage.tsx` — data contoh rekening.
- `apps/web/src/features/profile/ProfilePage.tsx` — hapus `<EmailDetectionCard />` (≈ baris 976) dan importnya (≈ baris 61). **Berkas `EmailDetectionCard.tsx` tetap ada.**

Perbarui tes yang menyebut rekening: `BerandaPage.test.tsx`, `SearchPage.test.tsx`, `QuickComposer.test.tsx`, `composer-logic.test.ts`, `beranda-data.test.ts`, `offline-transaction.test.ts`, `api-client.test.ts`.

Cek terakhir tahap ini: `grep -ri "rekening" apps/web/src` hanya boleh menyisakan hal yang tidak berhubungan.

## Tahap 2 — API dan tipe bersama

Hapus berkas:

- `apps/api/src/modules/accounts/` (seluruh folder: controller, route, schema, service, types)
- `apps/api/tests/account.test.ts`

Sunting berkas:

- `apps/api/src/modules/index.ts` — import `accountRoutes` (baris 16) dan `apiRoutes.route("/accounts", accountRoutes)` (baris 53).
- `apps/api/src/modules/transactions/transaction.service.ts` — `resolveOwnedAccountId` (import baris 14, pemakaian ≈ 211–214 dan 247–253), `account` di include/select (≈ 18, 41, 83), dan `accountId` saat membuat transaksi (≈ 220).
- `apps/api/src/modules/transactions/transaction.schema.ts` — field `accountId`.
- `apps/api/src/modules/recurring/recurring.service.ts` — import baris 5 dan `defaultAccountId` (≈ 284–286, 322).
- `apps/api/src/modules/transactions/quick-transaction.service.ts` — komentar baris 29 yang menyebut "default account".
- `apps/api/src/modules/auth/auth.service.ts` — baris ≈ 180 membuat rekening bawaan saat pendaftaran; hapus blok itu saja, jangan sentuh bagian OAuth (≈ 237).
- `apps/api/src/utils/audit-event.ts` — jenis `"account.created"`, `"account.transfer_created"`, `"account"`, `"account_transfer"` (baris 14–15, 37–38).
- `apps/api/src/modules/email-imports/email-import.service.ts` dan `email-import.types.ts` — **ini bagian tersulit.** Fitur Gmail hanya disembunyikan, tapi kodenya tetap harus bisa dikompilasi tanpa model `Account`: hapus `ensureBankAccount` (≈ 474–507), `bankAccountColors` (≈ 39), `bankAccountAliases` (≈ 55), import `AccountType` (baris 10), `account` di include (≈ 79), serta `accountId`/`accountName` pada hasil (≈ 137–138). Hasil impor nanti hanya berisi transaksi tanpa rekening.
- `apps/api/tests/email-import-service.test.ts`, `apps/api/tests/quick-replay.unit.test.ts` — sesuaikan.
- `packages/shared/src/index.ts` — hapus `AccountType`, `TransactionAccount`, `FinanceAccount`, `CreateAccountInput`, `UpdateAccountInput`, `CreateAccountTransferInput`, `AccountTransfer` (≈ baris 162–205) dan field `account`/`accountId` pada tipe transaksi. Ingat: `packages/shared` tidak pernah di-build CI, jadi hanya tipe — jangan tambah kode yang jalan.

## Tahap 3 — Database (TIDAK BISA DIBATALKAN, tunggu izin pemilik)

Menghapus tabel berarti **saldo rekening dan riwayat transfer hilang permanen**. Transaksi biasa tetap utuh.

1. Backup dulu: Supabase → Database → Backups (atau `pg_dump`). Simpan di luar repo.
2. `apps/api/prisma/schema.prisma`: hapus model `Account` (≈ 89) dan `AccountTransfer` (≈ 109), enum `AccountType` (≈ 16), relasi `accounts` dan `accountTransfers` di `User` (≈ 33–34), serta `accountId` (≈ 69), relasi `account` (≈ 76) dan `@@index([accountId, date])` (≈ 85) di `Transaction`.
3. `pnpm prisma migrate dev --name drop_accounts` di database **uji**, lalu commit folder migrasinya. Produksi ikut saat deploy (`prisma migrate deploy`).
4. Jalankan ulang `prisma generate` supaya tipe klien ikut berubah.

Kalau pemilik belum mengizinkan: **berhenti setelah Tahap 2**. Kode sudah bersih dan fitur sudah hilang dari aplikasi; tabelnya hanya menganggur di database dan tidak mengganggu.

## Tahap 4 — Uji dan rilis

- `apps/web`: `npm run typecheck`, lalu `npx vitest run --maxWorkers=2` (jangan paralel penuh; di komputer pemilik banyak berkas gagal karena kehabisan sumber daya, bukan karena kode).
- `apps/api`: `npm run typecheck`. Tes database dijalankan CI saat PR (Supabase uji di komputer pemilik sedang dijeda).
- Android: **tidak ada perubahan native.** Widget dan Catat cepat tidak pernah mengirim `accountId`, jadi APK 2.2.0 tetap cocok dan versi APK tidak perlu dinaikkan.
- Buat PR dari cabang ini ke `main`, tunggu CI hijau, lalu minta pemilik yang merge.

**Yang akan dilihat pemilik setelah merge:** menu "Rekening" dan "Impor dari Gmail" hilang dari halaman Lainnya, kartu deteksi email hilang dari Profil, dan form catat transaksi tidak lagi menanyakan rekening. **Yang tidak berubah:** semua transaksi lama, kategori, target, transaksi berulang, widget, dan Catat cepat.

---

## Catatan pengerjaan

| Tahap | Status | Catatan |
| --- | --- | --- |
| 1 — Web | Belum | |
| 2 — API + tipe | Belum | |
| 3 — Database | Menunggu izin pemilik | |
| 4 — Uji + PR | Belum | |
