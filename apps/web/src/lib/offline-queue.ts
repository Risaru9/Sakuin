import { apiRequest } from "./api-client";
import type { CreateTransactionInput } from "../features/transactions/transaction.types";

const OFFLINE_QUEUE_KEY = "sakuin_offline_transactions_queue";

export interface OfflineTransaction extends CreateTransactionInput {
  offlineId: string;
  queuedAt: string;
}

export function getOfflineQueue(): OfflineTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (e) {
    console.error("[OfflineQueue] Gagal mengambil antrean offline:", e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineTransaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    // Trigger custom event agar UI tahu antrean berubah
    window.dispatchEvent(new Event("sakuin-offline-queue-changed"));
  } catch (e) {
    console.error("[OfflineQueue] Gagal menyimpan antrean offline:", e);
  }
}

export function addToOfflineQueue(transaction: CreateTransactionInput) {
  const queue = getOfflineQueue();
  const newTx: OfflineTransaction = {
    ...transaction,
    offlineId: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    queuedAt: new Date().toISOString()
  };
  queue.push(newTx);
  saveOfflineQueue(queue);
  console.log("[OfflineQueue] Menambahkan transaksi ke antrean offline:", newTx);
  return newTx;
}

export async function syncOfflineTransactions(): Promise<boolean> {
  const queue = getOfflineQueue();
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

    // Kirim bulk post ke /api/transactions/bulk (akan dirouting otomatis ke /api/v1/...)
    await apiRequest("/api/transactions/bulk", {
      method: "POST",
      body: payload
    });

    console.log("[OfflineQueue] Sinkronisasi transaksi offline berhasil!");
    // Bersihkan antrean
    saveOfflineQueue([]);
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
