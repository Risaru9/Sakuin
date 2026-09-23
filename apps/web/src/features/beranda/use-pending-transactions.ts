import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getOfflineQueue } from "../../lib/offline-queue";
import { queryKeys } from "../../lib/query-keys";
import type { Category } from "../categories/category.types";
import { offlineEntryToTransaction } from "./beranda-data";

/** Entries saved while offline, shown as rows until the queue syncs them. */
export function usePendingTransactions(categories: Category[]) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState(() => getOfflineQueue());

  useEffect(() => {
    let previousLength = getOfflineQueue().length;

    function handleQueueChange() {
      const nextQueue = getOfflineQueue();

      if (nextQueue.length < previousLength) {
        // Entries left the queue (synced or undone), so fetch the rows the server now has.
        void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      }

      previousLength = nextQueue.length;
      setQueue(nextQueue);
    }

    handleQueueChange();
    window.addEventListener("sakuin-offline-queue-changed", handleQueueChange);

    return () => window.removeEventListener("sakuin-offline-queue-changed", handleQueueChange);
  }, [queryClient]);

  return useMemo(
    () => queue.map((entry) => offlineEntryToTransaction(entry, categories)),
    [queue, categories]
  );
}
