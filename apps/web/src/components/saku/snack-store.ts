import { useSyncExternalStore } from "react";
import type { SakuMood } from "./saku-mascot";

/**
 * One app-wide Saku message at a time ("Kopi susu tercatat · Batalkan").
 * Saving from the composer and deleting from the list share the same slot, so a new
 * message always replaces the previous one instead of stacking.
 */
export type SakuSnack = {
  id: number;
  title: string;
  detail?: string;
  mood?: SakuMood;
  actionLabel?: string;
  onAction?: () => void;
  /** Transaction ids the list highlights while the message is visible. */
  highlightIds?: string[];
  /** Sticker on highlighted rows; "Baru!" when not set. */
  highlightTag?: string;
};

export const SNACK_DURATION_MS = 5_000;

let currentSnack: SakuSnack | null = null;
let nextSnackId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function showSnack(snack: Omit<SakuSnack, "id">) {
  clearTimeout(dismissTimer);
  const id = nextSnackId++;
  currentSnack = { ...snack, id };
  dismissTimer = setTimeout(() => dismissSnack(id), SNACK_DURATION_MS);
  notify();
}

/** Hides the message; with an id, only if that message is still the one showing. */
export function dismissSnack(id?: number) {
  if (!currentSnack || (id !== undefined && currentSnack.id !== id)) {
    return;
  }

  clearTimeout(dismissTimer);
  currentSnack = null;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentSnack;
}

export function useSakuSnack() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
