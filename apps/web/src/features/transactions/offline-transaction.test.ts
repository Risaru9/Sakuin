import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTransaction, createTransactionsBulk } from "./transaction.service";
import { getOfflineQueue, saveOfflineQueue, syncOfflineTransactions } from "../../lib/offline-queue";
import { apiRequest } from "../../lib/api-client";

// Mock api-client
vi.mock("../../lib/api-client", () => ({
  apiRequest: vi.fn(),
}));

describe("Offline Transaction Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset navigator.onLine mock status
    vi.stubGlobal("navigator", { onLine: true, userAgent: "node" });
  });

  it("should perform online requests normally when online", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const mockResponse = { id: "tx-online", amount: "10000" };
    vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse);

    const input = {
      categoryId: "cat-1",
      amount: "10000",
      type: "EXPENSE" as const,
      date: new Date().toISOString(),
    };

    const result = await createTransaction(input);

    expect(apiRequest).toHaveBeenCalledWith("/api/transactions", {
      method: "POST",
      body: input,
    });
    expect(result).toEqual(mockResponse);
    expect(getOfflineQueue().length).toBe(0);
  });

  it("should save single transaction to offline queue and return mock object when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const input = {
      categoryId: "cat-1",
      amount: "10000",
      type: "EXPENSE" as const,
      note: "Makan siang",
      date: "2026-05-27T00:00:00.000Z",
    };

    const result = await createTransaction(input);

    // Pastikan apiRequest tidak dipanggil
    expect(apiRequest).not.toHaveBeenCalled();

    // Pastikan ada transaksi di queue
    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].amount).toBe("10000");
    expect(queue[0].offlineId).toBeDefined();

    // Pastikan mock response berformat benar
    expect(result.id).toBe(queue[0].offlineId);
    expect(result.amount).toBe("10000");
    expect(result.category.name).toBe("Transaksi Offline");
  });

  it("should save bulk transactions to offline queue when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const input = {
      transactions: [
        {
          categoryId: "cat-1",
          amount: "10000",
          type: "EXPENSE" as const,
          date: "2026-05-27T00:00:00.000Z",
        },
        {
          categoryId: "cat-2",
          amount: "25000",
          type: "INCOME" as const,
          date: "2026-05-27T00:00:00.000Z",
        },
      ],
    };

    const result = await createTransactionsBulk(input);

    expect(apiRequest).not.toHaveBeenCalled();

    const queue = getOfflineQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].amount).toBe("10000");
    expect(queue[1].amount).toBe("25000");

    expect(result.length).toBe(2);
    expect(result[0].id).toBe(queue[0].offlineId);
    expect(result[1].id).toBe(queue[1].offlineId);
  });

  it("should sync offline transactions to API and clear the queue", async () => {
    vi.stubGlobal("navigator", { onLine: true });

    // Masukkan transaksi ke antrean offline secara manual
    const offlineTxs = [
      {
        categoryId: "cat-1",
        amount: "10000",
        type: "EXPENSE" as const,
        date: "2026-05-27T00:00:00.000Z",
        offlineId: "offline-1",
        queuedAt: new Date().toISOString(),
      },
      {
        categoryId: "cat-2",
        amount: "20000",
        type: "INCOME" as const,
        date: "2026-05-27T00:00:00.000Z",
        offlineId: "offline-2",
        queuedAt: new Date().toISOString(),
      },
    ];
    saveOfflineQueue(offlineTxs);

    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true });

    const syncResult = await syncOfflineTransactions();

    expect(syncResult).toBe(true);
    expect(apiRequest).toHaveBeenCalledWith("/api/transactions/bulk", {
      method: "POST",
      body: {
        transactions: [
          {
            categoryId: "cat-1",
            amount: "10000",
            type: "EXPENSE",
            date: "2026-05-27T00:00:00.000Z",
          },
          {
            categoryId: "cat-2",
            amount: "20000",
            type: "INCOME",
            date: "2026-05-27T00:00:00.000Z",
          },
        ],
      },
    });

    // Pastikan queue dikosongkan setelah sukses sinkronisasi
    expect(getOfflineQueue().length).toBe(0);
  });
});
