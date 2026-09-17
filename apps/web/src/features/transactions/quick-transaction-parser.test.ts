import type { Category } from "../categories/category.types";
import { parseQuickTransactionInput } from "./quick-transaction-parser";

const DEFAULT_CATEGORIES: Array<[string, Category["type"], string]> = [
  ["Gaji", "INCOME", "wallet"],
  ["Bonus", "INCOME", "gift"],
  ["Pemasukan Lainnya", "INCOME", "plus-circle"],
  ["Makanan", "EXPENSE", "utensils"],
  ["Transportasi", "EXPENSE", "car"],
  ["Belanja", "EXPENSE", "shopping-bag"],
  ["Pendidikan", "EXPENSE", "book-open"],
  ["Kesehatan", "EXPENSE", "heart-pulse"],
  ["Tagihan", "EXPENSE", "receipt"],
  ["Pengeluaran Lainnya", "EXPENSE", "minus-circle"]
];

const categories = DEFAULT_CATEGORIES.map(([name, type, icon], index) => ({
  id: `category-${index}`,
  name,
  type,
  icon,
  color: null,
  isDefault: true
})) as unknown as Category[];

function parse(input: string) {
  return parseQuickTransactionInput({
    input,
    categories,
    defaultDate: "2026-09-17"
  });
}

function single(input: string) {
  const result = parse(input);

  expect(result.drafts).toHaveLength(1);

  return result.drafts[0];
}

describe("parseQuickTransactionInput", () => {
  it("membaca pengeluaran sederhana beserta kategori dan catatannya", () => {
    const draft = single("kopi susu 18rb");

    expect(draft).toMatchObject({
      type: "EXPENSE",
      amount: "18000",
      categoryName: "Makanan",
      note: "kopi susu",
      date: "2026-09-17"
    });
  });

  it("membaca gaji sebagai pemasukan", () => {
    expect(single("gaji 3jt")).toMatchObject({
      type: "INCOME",
      amount: "3000000",
      categoryName: "Gaji"
    });
  });

  it.each([
    ["obat 1,5jt", "1500000"],
    ["obat 1.5jt", "1500000"],
    ["tiket 2,25 juta", "2250000"],
    ["laptop 12.500.000", "12500000"],
    ["bensin 30000", "30000"],
    ["sepatu 1.250,50", "1250.5"]
  ])("membaca nominal %s dengan benar", (input, amount) => {
    expect(single(input).amount).toBe(amount);
  });

  it("tidak memecah angka desimal berkoma menjadi dua transaksi", () => {
    expect(parse("obat 1,5jt").drafts).toHaveLength(1);
  });

  it("tetap memecah daftar yang dipisah koma atau baris baru", () => {
    const result = parse("kopi 18rb, parkir 5rb\nroti 12rb");

    expect(result.drafts.map((draft) => [draft.note, draft.amount, draft.categoryName])).toEqual([
      ["kopi", "18000", "Makanan"],
      ["parkir", "5000", "Transportasi"],
      ["roti", "12000", "Makanan"]
    ]);
  });

  it("membuang satuan k dari catatan", () => {
    expect(single("martabak 35k")).toMatchObject({
      amount: "35000",
      note: "martabak",
      categoryName: "Makanan"
    });
  });

  it.each([
    ["token listrik 200.000", "Tagihan"],
    ["bayar wifi 350rb", "Tagihan"],
    ["obat flu 25rb", "Kesehatan"],
    ["buku tulis 12rb", "Pendidikan"],
    ["kosmetik 80rb", "Belanja"]
  ])("mengenali kategori untuk %s", (input, categoryName) => {
    expect(single(input).categoryName).toBe(categoryName);
  });

  it("melewati teks tanpa nominal", () => {
    const result = parse("beli sesuatu");

    expect(result.drafts).toHaveLength(0);
    expect(result.skippedItems).toEqual([
      { sourceText: "beli sesuatu", reason: "Nominal tidak ditemukan atau tidak valid." }
    ]);
  });
});
