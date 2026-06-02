import { describe, expect, it } from "vitest";
import { parseEmailTransaction } from "../src/modules/email-imports/email-import.parser.js";

describe("email transaction parser", () => {
  it("mendeteksi transfer masuk dari email bank dengan kategori provider detail", () => {
    const parsed = parseEmailTransaction({
      emailAddress: "utama@gmail.com",
      from: "notifikasi@bca.co.id",
      subject: "Transfer masuk BCA",
      body:
        "BCA memberitahukan transfer masuk sebesar Rp 350.000 pada 01 Jun 2026 19:30 dari RISARU. Ref: BCA123456"
    });

    expect(parsed.financialProvider).toBe("BCA");
    expect(parsed.type).toBe("INCOME");
    expect(parsed.amount).toBe("350000");
    expect(parsed.method).toBe("Transfer");
    expect(parsed.reference).toBe("BCA123456");
    expect(parsed.isTrustedFinancialSender).toBe(true);
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("mendeteksi pembayaran QRIS sebagai pengeluaran e-wallet", () => {
    const parsed = parseEmailTransaction({
      emailAddress: "wallet@gmail.com",
      from: "notification@dana.id",
      subject: "Pembayaran QRIS berhasil",
      body:
        "DANA: Pembayaran QRIS di KOPI SENJA sebesar Rp25.000 berhasil pada 2026-06-01 08:15. ID Transaksi: DN98765"
    });

    expect(parsed.financialProvider).toBe("DANA");
    expect(parsed.type).toBe("EXPENSE");
    expect(parsed.amount).toBe("25000");
    expect(parsed.merchant).toContain("KOPI SENJA");
    expect(parsed.method).toBe("QRIS");
    expect(parsed.reference).toBe("DN98765");
    expect(parsed.isTrustedFinancialSender).toBe(true);
  });

  it("menolak email non-finansial walaupun mengandung kata transfer dan Rp", () => {
    const parsed = parseEmailTransaction({
      emailAddress: "utama@gmail.com",
      from: "LinkedIn <messages-noreply@linkedin.com>",
      subject: "Rizal, v style membagikan update",
      body:
        "Transfer inspirasi karier minggu ini. Paket premium tersedia mulai Rp 2.750.000 dan berlaku sampai 04 Jun 2026."
    });

    expect(parsed.isLikelyFinancialEmail).toBe(false);
    expect(parsed.isTrustedFinancialSender).toBe(false);
    expect(parsed.financialProvider).toBe("Tidak Dikenal");
    expect(parsed.warnings).toContain("Email tidak memiliki sinyal transaksi finansial yang cukup kuat.");
  });

  it("tidak menganggap mention BCA di email non-resmi sebagai pengirim terpercaya", () => {
    const parsed = parseEmailTransaction({
      emailAddress: "utama@gmail.com",
      from: "promo@example.com",
      subject: "BCA - buka, bangun portofolio bisnis nyata 2026",
      body:
        "Transaksi BCA berhasil untuk program premium sebesar Rp 2.750.000 pada 04 Jun 2026. Lihat tautan t.co/example."
    });

    expect(parsed.financialProvider).toBe("BCA");
    expect(parsed.isTrustedFinancialSender).toBe(false);
    expect(parsed.isLikelyFinancialEmail).toBe(false);
    expect(parsed.warnings).toContain("Pengirim email belum termasuk sumber resmi bank/e-wallet.");
  });

  it("menandai tanggal masa depan sebagai warning", () => {
    const parsed = parseEmailTransaction({
      emailAddress: "wallet@gmail.com",
      from: "notification@dana.id",
      subject: "Pembayaran QRIS berhasil",
      body:
        "DANA: Pembayaran QRIS di KOPI SENJA sebesar Rp25.000 berhasil pada 2099-06-04 08:15. ID Transaksi: DN98765"
    });

    expect(parsed.isLikelyFinancialEmail).toBe(true);
    expect(parsed.warnings).toContain("Tanggal transaksi berada di masa depan.");
  });
});
