import { apiRequest } from "./api-client";
import { getActiveAccountScope } from "./auth-storage";
import type { CreateTransactionInput } from "../features/transactions/transaction.types";

const OFFLINE_QUEUE_KEY = "sakuin_offline_transactions_queue";

export interface OfflineTransaction extends CreateTransactionInput {
  offlineId: string;
  queuedAt: string;
  ownerScope: string;
}

function getOfflineQueueKey(ownerScope: string) {
  return `${OFFLINE_QUEUE_KEY}:${encodeURIComponent(ownerScope)}`;
}

export function getOfflineQueue(
  ownerScope = getActiveAccountScope()
): OfflineTransaction[] {
  if (typeof window === "undefined") return [];
  if (!ownerScope) return [];

  try {
    const queue = localStorage.getItem(getOfflineQueueKey(ownerScope));
    return queue ? JSON.parse(queue) : [];
  } catch (e) {
    console.error("[OfflineQueue] Gagal mengambil antrean offline:", e);
    return [];
  }
}

export function saveOfflineQueue(
  queue: OfflineTransaction[],
  ownerScope = getActiveAccountScope()
) {
  if (typeof window === "undefined") return;
  if (!ownerScope) return;

  try {
    localStorage.setItem(getOfflineQueueKey(ownerScope), JSON.stringify(queue));
    // Trigger custom event agar UI tahu antrean berubah
    window.dispatchEvent(new Event("sakuin-offline-queue-changed"));
  } catch (e) {
    console.error("[OfflineQueue] Gagal menyimpan antrean offline:", e);
  }
}

export function addToOfflineQueue(transaction: CreateTransactionInput) {
  const ownerScope = getActiveAccountScope();

  if (!ownerScope) {
    throw new Error("Akun aktif diperlukan untuk menyimpan transaksi offline.");
  }

  const queue = getOfflineQueue(ownerScope);
  const newTx: OfflineTransaction = {
    ...transaction,
    offlineId: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    queuedAt: new Date().toISOString(),
    ownerScope
  };
  queue.push(newTx);
  saveOfflineQueue(queue, ownerScope);
  console.log("[OfflineQueue] Transaksi ditambahkan ke antrean offline.");
  return newTx;
}

export async function syncOfflineTransactions(): Promise<boolean> {
  const ownerScope = getActiveAccountScope();

  if (!ownerScope) return false;

  const storedQueue = getOfflineQueue(ownerScope);
  const queue = storedQueue.filter(
    (transaction) => transaction.ownerScope === ownerScope
  );
  if (queue.length === 0) return false;

  console.log(`[OfflineQueue] Memulai sinkronisasi ${queue.length} transaksi offline ke server...`);
  
  try {
    const payload = {
      transactions: queue.map(({ categoryId, amount, type, note, date }) => ({
        categoryId,
        amount,
        type,
        note,
        date
      }))
    };

    await apiRequest("/api/transactions/bulk", {
      method: "POST",
      body: payload
    });

    console.log("[OfflineQueue] Sinkronisasi transaksi offline berhasil!");
    // Bersihkan antrean
    saveOfflineQueue(
      storedQueue.filter((transaction) => transaction.ownerScope !== ownerScope),
      ownerScope
    );
    // Trigger refresh transaksi
    window.dispatchEvent(new Event("sakuin:transaction-added"));
    
    // Tampilkan notifikasi toast jika didukung
    window.dispatchEvent(new CustomEvent("sakuin-toast", {
      detail: {
        message: `${queue.length} transaksi offline berhasil disinkronkan!`,
        type: "success"
      }
    }));
    return true;
  } catch (error) {
    console.error("[OfflineQueue] Gagal sinkronisasi transaksi offline:", error);
    return false;
  }
}

export function hasLegacyOfflineQueue() {
  if (typeof window === "undefined") return false;

  return Boolean(localStorage.getItem(OFFLINE_QUEUE_KEY));
}
