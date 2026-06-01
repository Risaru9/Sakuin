import { ApiClientError } from "../../lib/api-client";
import type {
  AiChatHistoryMessage,
  AiChatMessage,
  AiChatResponse,
  AiTransactionDraft
} from "./ai.types";

const CHAT_HISTORY_STORAGE_PREFIX = "sakuin_ai_chat_history_v1";
const SAVED_DRAFT_STORAGE_PREFIX = "sakuin_ai_saved_draft_ids_v1";
const CANCELLED_DRAFT_STORAGE_PREFIX = "sakuin_ai_cancelled_draft_ids_v1";
const SUPPORT_EMAIL = "sakuinofficial@gmail.com";

export const AI_SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Bantuan Asisten Sakuin"
)}&body=${encodeURIComponent(
  "Halo Sakuin,\n\nSaya mengalami kendala saat menggunakan Asisten Sakuin.\n\nKendala yang terjadi:\n\nPerangkat/browser yang digunakan:\n\nTerima kasih."
)}`;

export const SUGGESTED_PROMPT_OPTIONS = [
  {
    label: "Ringkasan",
    prompt: "Buat ringkasan kondisi keuangan saya",
    helper: "Lihat kondisi uangmu"
  },
  {
    label: "Pengeluaran",
    prompt: "Pengeluaran bulan ini gimana?",
    helper: "Baca arus keluar bulan ini"
  },
  {
    label: "Boros",
    prompt: "Saya boros di kategori apa?",
    helper: "Temukan kategori dominan"
  },
  {
    label: "Aman jajan?",
    prompt: "Apakah saya masih aman jajan hari ini?",
    helper: "Cek safe-to-spend"
  },
  {
    label: "Hemat minggu ini",
    prompt: "Bagaimana cara menghemat minggu ini?",
    helper: "Minta langkah praktis"
  },
  {
    label: "Goal",
    prompt: "Target tabungan saya masih realistis?",
    helper: "Evaluasi target tabungan"
  },
  {
    label: "Aksi hari ini",
    prompt: "Apa tindakan keuangan terbaik hari ini?",
    helper: "Pilih langkah kecil"
  },
  {
    label: "Pola",
    prompt: "Bantu saya memahami pola pengeluaran saya",
    helper: "Lihat kebiasaan transaksi"
  }
] as const;

export const SUGGESTED_PROMPTS = SUGGESTED_PROMPT_OPTIONS.map(
  (option) => option.prompt
);

export const MAX_VISIBLE_MESSAGE_SUGGESTIONS = 3;
export const MAX_STORED_MESSAGES = 80;
export const MAX_HISTORY_MESSAGES_SENT = 12;

export type TransactionDraftEntry = {
  draft: AiTransactionDraft;
  draftIndex: number;
  draftKey: string;
};

export type SavableTransactionDraftEntry = TransactionDraftEntry & {
  categoryId: string;
};

export function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function shouldReduceMotion() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getChatHistoryStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${CHAT_HISTORY_STORAGE_PREFIX}:${userId}`;
}

export function getSavedDraftStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${SAVED_DRAFT_STORAGE_PREFIX}:${userId}`;
}

export function getCancelledDraftStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${CANCELLED_DRAFT_STORAGE_PREFIX}:${userId}`;
}

export function createWelcomeMessage(): AiChatMessage {
  return {
    id: "welcome-message",
    role: "assistant",
    content:
      "Halo, saya Asisten Sakuin. Saya bisa membantu membaca pengeluaran, pemasukan, goals, dan kondisi keuanganmu di Sakuin.\n\nCatatan: saya hanya menjawab topik keuangan pribadi. Saya bukan pengganti nasihat investasi, pinjaman, pajak, atau hukum.",
    intent: "FINANCIAL_SUMMARY",
    cards: [
      {
        label: "Mode",
        value: "Financial only"
      },
      {
        label: "Status",
        value: "Asisten aktif"
      }
    ],
    suggestions: SUGGESTED_PROMPTS,
    createdAt: new Date().toISOString()
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menghubungi Asisten Sakuin.";
}

export function createAssistantMessage(
  response: AiChatResponse & { id?: string }
): AiChatMessage {
  return {
    id: response.id ?? createMessageId(),
    role: "assistant",
    content: response.reply,
    intent: response.intent,
    cards: response.cards,
    suggestions: response.suggestions,
    transactionDraft: response.transactionDraft,
    transactionDrafts: response.transactionDrafts,
    createdAt: new Date().toISOString()
  };
}

export function formatIntentLabel(intent?: string) {
  if (!intent) {
    return "";
  }

  return intent
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDraftType(type: AiTransactionDraft["type"]) {
  return type === "INCOME" ? "Pemasukan" : "Pengeluaran";
}

export function formatDraftAmount(amount: string) {
  const value = Number(amount);

  if (!amount || Number.isNaN(value) || value <= 0) {
    return "Belum terdeteksi";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDraftDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsedDate);
}

export function formatDraftConfidence(
  confidence: AiTransactionDraft["confidence"]
) {
  if (confidence === "high") {
    return "Tinggi";
  }

  if (confidence === "medium") {
    return "Sedang";
  }

  return "Rendah";
}

export function getDraftConfidenceClass(
  confidence: AiTransactionDraft["confidence"]
) {
  if (confidence === "high") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (confidence === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-rose-50 text-rose-700 ring-rose-100";
}

export function formatMissingField(field: string) {
  if (field === "amount") {
    return "Nominal";
  }

  if (field === "categoryId") {
    return "Kategori";
  }

  if (field === "date") {
    return "Tanggal";
  }

  if (field === "type") {
    return "Tipe";
  }

  return field;
}

export function isTransactionDraftReadyToSave(draft: AiTransactionDraft) {
  const amount = Number(draft.amount);

  return Boolean(
    draft.missingFields.length === 0 &&
      draft.type &&
      draft.categoryId &&
      draft.date &&
      draft.amount &&
      !Number.isNaN(amount) &&
      amount > 0
  );
}

export function getMessageTransactionDrafts(message: AiChatMessage) {
  if (message.transactionDrafts && message.transactionDrafts.length > 0) {
    return message.transactionDrafts;
  }

  if (message.transactionDraft) {
    return [message.transactionDraft];
  }

  return [];
}

export function createDraftKey(messageId: string, draftIndex: number) {
  return `${messageId}:${draftIndex}`;
}

export function hasStoredDraftState(
  storedDraftIds: Set<string>,
  messageId: string,
  draftIndex: number
) {
  const draftKey = createDraftKey(messageId, draftIndex);

  return (
    storedDraftIds.has(draftKey) ||
    (draftIndex === 0 && storedDraftIds.has(messageId))
  );
}

export function getDraftEntries(
  message: AiChatMessage
): TransactionDraftEntry[] {
  return getMessageTransactionDrafts(message).map((draft, draftIndex) => ({
    draft,
    draftIndex,
    draftKey: createDraftKey(message.id, draftIndex)
  }));
}

export function getSavableDraftEntries(
  message: AiChatMessage,
  savedDraftIds: Set<string>,
  cancelledDraftIds: Set<string>,
  savingDraftIds: Set<string>
) {
  return getDraftEntries(message).reduce<SavableTransactionDraftEntry[]>(
    (entries, entry) => {
      const categoryId = entry.draft.categoryId;

      if (!categoryId) {
        return entries;
      }

      if (!isTransactionDraftReadyToSave(entry.draft)) {
        return entries;
      }

      if (
        hasStoredDraftState(savedDraftIds, message.id, entry.draftIndex) ||
        hasStoredDraftState(cancelledDraftIds, message.id, entry.draftIndex) ||
        savingDraftIds.has(entry.draftKey)
      ) {
        return entries;
      }

      entries.push({
        ...entry,
        categoryId
      });

      return entries;
    },
    []
  );
}

export function getDraftAmountTotal(drafts: AiTransactionDraft[]) {
  return drafts.reduce((total, draft) => {
    const amount = Number(draft.amount);

    if (Number.isNaN(amount) || amount <= 0) {
      return total;
    }

    return total + amount;
  }, 0);
}

export function isDraftActionSuggestion(suggestion: string) {
  const normalizedSuggestion = suggestion
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const blockedSuggestions = new Set([
    "simpan",
    "simpan draft",
    "simpan semua",
    "simpan semua draft",
    "simpan semuanya",
    "save",
    "save draft",
    "save all",
    "save all drafts"
  ]);

  if (blockedSuggestions.has(normalizedSuggestion)) {
    return true;
  }

  return /^(simpan|save)\s+(semua|all|draft|semuanya)/.test(
    normalizedSuggestion
  );
}

export function isValidStoredMessages(value: unknown): value is AiChatMessage[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    const candidate = message as Partial<AiChatMessage>;

    return (
      typeof candidate.id === "string" &&
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string" &&
      typeof candidate.createdAt === "string"
    );
  });
}

export function isValidStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function buildRecentHistory(
  messages: AiChatMessage[]
): AiChatHistoryMessage[] {
  return messages
    .filter((message) => message.id !== "welcome-message")
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES_SENT)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1500)
    }));
}

export function isCancelDraftRequest(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage || normalizedMessage.length > 80) {
    return false;
  }

  const exactCancelMessages = new Set([
    "batal",
    "batalkan",
    "cancel",
    "batalin",
    "hapus draft",
    "batalkan draft",
    "cancel draft",
    "tolong batalkan",
    "tolong batalin",
    "tidak jadi",
    "ga jadi",
    "gak jadi",
    "nggak jadi"
  ]);

  if (exactCancelMessages.has(normalizedMessage)) {
    return true;
  }

  return /\b(batal|batalkan|batalin|cancel|hapus draft|tidak jadi|ga jadi|gak jadi|nggak jadi)\b/.test(
    normalizedMessage
  );
}

export function findLatestActiveDraftGroup(
  messages: AiChatMessage[],
  savedDraftMessageIds: Set<string>,
  cancelledDraftMessageIds: Set<string>
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "assistant") {
      continue;
    }

    const drafts = getMessageTransactionDrafts(message);

    if (drafts.length === 0) {
      continue;
    }

    const activeDraftKeys = drafts
      .map((_, draftIndex) => ({
        draftKey: createDraftKey(message.id, draftIndex),
        draftIndex
      }))
      .filter(
        ({ draftIndex }) =>
          !hasStoredDraftState(savedDraftMessageIds, message.id, draftIndex) &&
          !hasStoredDraftState(
            cancelledDraftMessageIds,
            message.id,
            draftIndex
          )
      )
      .map(({ draftKey }) => draftKey);

    if (activeDraftKeys.length > 0) {
      return {
        message,
        draftKeys: activeDraftKeys
      };
    }
  }

  return null;
}
