import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTransaction, createTransactionsBulk } from "./transaction.service";
import {
  getOfflineQueue,
  hasLegacyOfflineQueue,
  saveOfflineQueue,
  syncOfflineTransactions
} from "../../lib/offline-queue";
import { apiRequest } from "../../lib/api-client";
import { setCachedUser } from "../../lib/auth-storage";

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
    setCachedUser({
      id: "user-a",
      name: "User A",
      email: "user-a@example.com",
      safeBalanceLimit: "0"
    });
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

  it("should queue single transaction when online request fails because of network", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.mocked(apiRequest).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const input = {
      categoryId: "cat-1",
      amount: "10000",
      type: "EXPENSE" as const,
      note: "Makan siang",
      date: "2026-05-27T00:00:00.000Z",
    };

    const result = await createTransaction(input);

    expect(apiRequest).toHaveBeenCalledWith("/api/transactions", {
      method: "POST",
      body: input,
    });

    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].amount).toBe("10000");
    expect(result.id).toBe(queue[0].offlineId);
    expect(result.category.name).toBe("Transaksi Offline");
  });

  it("should not queue transaction when API returns a validation error", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.mocked(apiRequest).mockRejectedValueOnce(
      new Error("Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi")
    );

    const input = {
      categoryId: "category-tidak-valid",
      amount: "10000",
      type: "EXPENSE" as const,
      date: "2026-05-27T00:00:00.000Z",
    };

    await expect(createTransaction(input)).rejects.toThrow(
      "Kategori tidak ditemukan"
    );
    expect(getOfflineQueue()).toHaveLength(0);
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

  it("should queue bulk transactions when online request fails because of network", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.mocked(apiRequest).mockRejectedValueOnce(new TypeError("Failed to fetch"));

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

    expect(apiRequest).toHaveBeenCalledWith("/api/transactions/bulk", {
      method: "POST",
      body: input,
    });

    const queue = getOfflineQueue();
    expect(queue).toHaveLength(2);
    expect(result).toHaveLength(2);
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
        ownerScope: "user-a",
      },
      {
        categoryId: "cat-2",
        amount: "20000",
        type: "INCOME" as const,
        date: "2026-05-27T00:00:00.000Z",
        offlineId: "offline-2",
        queuedAt: new Date().toISOString(),
        ownerScope: "user-a",
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

  it("should not sync offline transactions owned by another account", async () => {
    saveOfflineQueue(
      [
        {
          categoryId: "cat-1",
          amount: "10000",
          type: "EXPENSE",
          date: "2026-05-27T00:00:00.000Z",
          offlineId: "offline-user-a",
          queuedAt: new Date().toISOString(),
          ownerScope: "user-a"
        }
      ],
      "user-a"
    );

    setCachedUser({
      id: "user-b",
      name: "User B",
      email: "user-b@example.com",
      safeBalanceLimit: "0"
    });

    expect(await syncOfflineTransactions()).toBe(false);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(getOfflineQueue("user-a")).toHaveLength(1);
  });

  it("should quarantine legacy queue entries instead of syncing them automatically", async () => {
    localStorage.setItem(
      "sakuin_offline_transactions_queue",
      JSON.stringify([{ offlineId: "legacy-offline-entry" }])
    );

    expect(hasLegacyOfflineQueue()).toBe(true);
    expect(await syncOfflineTransactions()).toBe(false);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(hasLegacyOfflineQueue()).toBe(true);
  });
});
