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
  });
});
