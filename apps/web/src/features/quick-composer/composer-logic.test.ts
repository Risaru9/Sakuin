import type { Category } from "../categories/category.types";
import {
  buildComposerGuess,
  describeDateKey,
  formatSignedAmount,
  pickFallbackCategory,
  shiftDateKey,
  toCreateTransactionInputs
} from "./composer-logic";

const categories = [
  ["cat-salary", "Gaji", "INCOME"],
  ["cat-income-other", "Pemasukan Lainnya", "INCOME"],
  ["cat-food", "Makanan", "EXPENSE"],
  ["cat-transport", "Transportasi", "EXPENSE"],
  ["cat-expense-other", "Pengeluaran Lainnya", "EXPENSE"]
].map(([id, name, type]) => ({
  id,
  name,
  type,
  icon: null,
  color: null,
  isDefault: true,
  limit: null
})) as Category[];

const todayKey = "2026-09-17";

describe("buildComposerGuess", () => {
  it("returns null while there is no usable amount", () => {
    expect(buildComposerGuess({ input: "", categories, todayKey })).toBeNull();
    expect(buildComposerGuess({ input: "kopi susu", categories, todayKey })).toBeNull();
  });

  it("guesses a single transaction for today", () => {
    const guess = buildComposerGuess({ input: "kopi susu 18rb", categories, todayKey });

    expect(guess).toMatchObject({
      isMultiple: false,
      type: "EXPENSE",
      dateKey: todayKey,
      totalAmount: 18000,
      needsCheck: false
    });
    expect(guess?.category?.id).toBe("cat-food");
  });

  it("flags low-confidence guesses until the user picks a category", () => {
    const unsure = buildComposerGuess({ input: "sesuatu 20rb", categories, todayKey });
    expect(unsure?.needsCheck).toBe(true);
    expect(unsure?.category?.id).toBe("cat-expense-other");

    const picked = buildComposerGuess({
      input: "sesuatu 20rb",
      categories,
      todayKey,
      overrides: { categoryId: "cat-transport" }
    });
    expect(picked?.needsCheck).toBe(false);
    expect(picked?.category?.id).toBe("cat-transport");
  });

  it("switches to a matching category when the type is flipped", () => {
    const guess = buildComposerGuess({
      input: "kopi susu 18rb",
      categories,
      todayKey,
      overrides: { type: "INCOME", categoryId: "cat-food" }
    });

    expect(guess?.type).toBe("INCOME");
    expect(guess?.category?.id).toBe("cat-income-other");
  });

  it("applies the chosen date and keeps category overrides off for multiple items", () => {
    const guess = buildComposerGuess({
      input: "kopi 18rb, parkir 5rb",
      categories,
      todayKey,
      overrides: { dateKey: "2026-09-16", categoryId: "cat-expense-other" }
    });

    expect(guess?.isMultiple).toBe(true);
    expect(guess?.category).toBeNull();
    expect(guess?.totalAmount).toBe(23000);
    expect(guess?.drafts.map((draft) => [draft.categoryId, draft.date])).toEqual([
      ["cat-food", "2026-09-16"],
      ["cat-transport", "2026-09-16"]
    ]);
  });
});

describe("toCreateTransactionInputs", () => {
  it("maps drafts to API payloads and only sends an account when chosen", () => {
    const guess = buildComposerGuess({ input: "kopi susu 18rb", categories, todayKey });
    const drafts = guess?.drafts ?? [];

    const [withoutAccount] = toCreateTransactionInputs(drafts);
    expect(withoutAccount).toEqual({
      type: "EXPENSE",
      amount: "18000",
      categoryId: "cat-food",
      date: new Date(2026, 8, 17).toISOString(),
      note: "kopi susu"
    });

  });
});

describe("date and amount helpers", () => {
  it("shifts date keys across month boundaries", () => {
    expect(shiftDateKey("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("describes dates relative to today", () => {
    expect(describeDateKey(todayKey, todayKey)).toBe("Hari ini");
    expect(describeDateKey("2026-09-16", todayKey)).toBe("Kemarin");
    expect(describeDateKey("2026-09-14", todayKey)).toMatch(/14/);
  });

  it("formats signed amounts the Indonesian way", () => {
    expect(formatSignedAmount("18000", "EXPENSE")).toBe("−18.000");
    expect(formatSignedAmount(3500000, "INCOME")).toBe("+3.500.000");
  });

  it("falls back to the 'lainnya' category of the requested type", () => {
    expect(pickFallbackCategory(categories, "INCOME")?.id).toBe("cat-income-other");
    expect(pickFallbackCategory([], "EXPENSE")).toBeNull();
  });
});
