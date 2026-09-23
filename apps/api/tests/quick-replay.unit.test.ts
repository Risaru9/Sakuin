import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn(), transaction: vi.fn(), categories: vi.fn() }));
vi.mock("../src/db/prisma.js", () => ({ prisma: { transaction: { findMany: mocks.findMany, create: mocks.create }, category: { findMany: mocks.categories }, $transaction: mocks.transaction } }));
vi.mock("../src/modules/ai/ai-financial-context-cache.js", () => ({ invalidateCachedFinancialContext: vi.fn() }));
import { createTransactionsBulk } from "../src/modules/transactions/transaction.service.js";
const saved = { id: "saved", type: "EXPENSE", amount: 18000, note: "kopi", date: new Date(), createdAt: new Date(), updatedAt: new Date(), category: { id: "food", name: "Makanan", type: "EXPENSE", icon: null, color: null, isDefault: true } };
const input = { transactions: [{ type: "EXPENSE" as const, amount: "18000", categoryId: "food", date: new Date(), note: "kopi" }] };
describe("quick-entry replay", () => {
  it("returns an already saved request without writing again", async () => {
    mocks.findMany.mockResolvedValue([saved]);
    expect((await createTransactionsBulk("user", input, "request"))[0].id).toBe("saved");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "user" }) }));
  });
  it("recovers a concurrent unique-ID race", async () => {
    mocks.findMany.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([saved]);
    mocks.categories.mockResolvedValue([{ id: "food", type: "EXPENSE" }]);
    mocks.transaction.mockRejectedValue({ code: "P2002" });
    expect((await createTransactionsBulk("user", input, "request"))[0].id).toBe("saved");
  });
});
