import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  CheckCircle2,
  Loader2,
  Save,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../../components/layout/AppShell";
import { ApiClientError } from "../../../lib/api-client";
import { queryKeys } from "../../../lib/query-keys";
import { useAuth } from "../../auth/auth-context";
import { getUserProfile } from "../../profile/profile.service";
import { createTransaction } from "../../transactions/transaction.service";
import { sendAiChatMessage } from "../ai.service";
import type {
  AiChatHistoryMessage,
  AiChatMessage,
  AiChatResponse,
  AiTransactionDraft
} from "../ai.types";

const CHAT_HISTORY_STORAGE_PREFIX = "sakuin_ai_chat_history_v1";
const SAVED_DRAFT_STORAGE_PREFIX = "sakuin_ai_saved_draft_ids_v1";
const CANCELLED_DRAFT_STORAGE_PREFIX = "sakuin_ai_cancelled_draft_ids_v1";

const SUGGESTED_PROMPTS = [
  "Catat makan ayam geprek 15000",
  "Pengeluaran bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan pengeluaran bulan ini dan bulan lalu",
  "Target tabungan saya realistis?"
];

const MAX_VISIBLE_MESSAGE_SUGGESTIONS = 3;
const MAX_STORED_MESSAGES = 80;
const MAX_HISTORY_MESSAGES_SENT = 12;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getChatHistoryStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${CHAT_HISTORY_STORAGE_PREFIX}:${userId}`;
}

function getSavedDraftStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${SAVED_DRAFT_STORAGE_PREFIX}:${userId}`;
}

function getCancelledDraftStorageKey(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  return `${CANCELLED_DRAFT_STORAGE_PREFIX}:${userId}`;
}

function createWelcomeMessage(): AiChatMessage {
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menghubungi Asisten Sakuin.";
}

function createAssistantMessage(response: AiChatResponse): AiChatMessage {
  return {
    id: createMessageId(),
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

function formatIntentLabel(intent?: string) {
  if (!intent) {
    return "";
  }

  return intent
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDraftType(type: AiTransactionDraft["type"]) {
  return type === "INCOME" ? "Pemasukan" : "Pengeluaran";
}

function formatDraftAmount(amount: string) {
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

function formatDraftDate(date: string) {
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

function formatDraftConfidence(confidence: AiTransactionDraft["confidence"]) {
  if (confidence === "high") {
    return "Tinggi";
  }

  if (confidence === "medium") {
    return "Sedang";
  }

  return "Rendah";
}

function getDraftConfidenceClass(confidence: AiTransactionDraft["confidence"]) {
  if (confidence === "high") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (confidence === "medium") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-rose-50 text-rose-700 ring-rose-100";
}

function formatMissingField(field: string) {
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

function isTransactionDraftReadyToSave(draft: AiTransactionDraft) {
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

function getMessageTransactionDrafts(message: AiChatMessage) {
  if (message.transactionDrafts && message.transactionDrafts.length > 0) {
    return message.transactionDrafts;
  }

  if (message.transactionDraft) {
    return [message.transactionDraft];
  }

  return [];
}

function createDraftKey(messageId: string, draftIndex: number) {
  return `${messageId}:${draftIndex}`;
}

function hasStoredDraftState(
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

function isValidStoredMessages(value: unknown): value is AiChatMessage[] {
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

function isValidStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function buildRecentHistory(messages: AiChatMessage[]): AiChatHistoryMessage[] {
  return messages
    .filter((message) => message.id !== "welcome-message")
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES_SENT)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1500)
    }));
}

function isCancelDraftRequest(message: string) {
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

function findLatestActiveDraftGroup(
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

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent) {
    return null;
  }

  return (
    <span className="inline-flex w-fit rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-100">
      {formatIntentLabel(intent)}
    </span>
  );
}

function TransactionDraftPanel({
  draft,
  title = "Draft transaksi",
  isSaving,
  isSaved,
  isCancelled,
  onSave,
  onCancel
}: {
  draft: AiTransactionDraft;
  title?: string;
  isSaving: boolean;
  isSaved: boolean;
  isCancelled: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isReadyToSave = isTransactionDraftReadyToSave(draft);
  const canSave = isReadyToSave && !isSaving && !isSaved && !isCancelled;
  const canCancel = !isSaving && !isSaved && !isCancelled;

  return (
    <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-100/80 px-3 py-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-violet-700">
            {title}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            Belum disimpan otomatis. Review dulu sebelum masuk ke transaksi.
          </p>
        </div>

        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1",
            isSaved
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : isCancelled
                ? "bg-slate-100 text-slate-600 ring-slate-200"
                : isReadyToSave
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-amber-50 text-amber-700 ring-amber-100"
          ].join(" ")}
        >
          {isSaved
            ? "Sudah disimpan"
            : isCancelled
              ? "Dibatalkan"
              : isReadyToSave
                ? "Siap direview"
                : "Perlu dilengkapi"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Tipe
          </p>
          <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
            {formatDraftType(draft.type)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Nominal
          </p>
          <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
            {formatDraftAmount(draft.amount)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Kategori
          </p>
          <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
            {draft.categoryName ?? "Perlu dipilih"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Tanggal
          </p>
          <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
            {formatDraftDate(draft.date)}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-white/80 bg-white/80 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Catatan
          </p>
          <p className="mt-1 text-xs font-black leading-5 text-slate-950 sm:text-sm">
            {draft.note ?? "Belum ada catatan"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-violet-100/80 px-3 py-3">
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1",
            getDraftConfidenceClass(draft.confidence)
          ].join(" ")}
        >
          Confidence: {formatDraftConfidence(draft.confidence)}
        </span>

        {draft.missingFields.length > 0 ? (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-100">
            Kurang: {draft.missingFields.map(formatMissingField).join(", ")}
          </span>
        ) : null}
      </div>

      <div className="grid gap-2 border-t border-violet-100/80 px-3 py-3 sm:grid-cols-2">
        <button
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-sm transition sm:text-sm",
            isSaved
              ? "cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : isCancelled
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : isReadyToSave
                  ? "bg-slate-950 text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
          ].join(" ")}
          disabled={!canSave}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : isSaved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Sudah disimpan
            </>
          ) : isCancelled ? (
            <>
              <Ban className="h-4 w-4" />
              Dibatalkan
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Draft
            </>
          )}
        </button>

        <button
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black shadow-sm transition sm:text-sm",
            canCancel
              ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          ].join(" ")}
          disabled={!canCancel}
          onClick={onCancel}
          type="button"
        >
          <Ban className="h-4 w-4" />
          Batalkan Draft
        </button>

        {!isReadyToSave && !isCancelled ? (
          <p className="text-center text-[11px] font-bold leading-5 text-slate-500 sm:col-span-2">
            Draft belum lengkap, jadi belum bisa disimpan.
          </p>
        ) : null}

        {isCancelled ? (
          <p className="text-center text-[11px] font-bold leading-5 text-slate-500 sm:col-span-2">
            Draft ini sudah dibatalkan dan tidak akan disimpan.
          </p>
        ) : null}
      </div>

      {draft.warnings.length > 0 ? (
        <div className="space-y-2 border-t border-violet-100/80 px-3 py-3">
          {draft.warnings.map((warning, index) => (
            <div
              className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800"
              key={`${warning}-${index}`}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({
  message,
  onSuggestionClick,
  onSaveDraft,
  onCancelDraft,
  disabled,
  savingDraftMessageId,
  savedDraftMessageIds,
  cancelledDraftMessageIds
}: {
  message: AiChatMessage;
  onSuggestionClick: (suggestion: string) => void;
  onSaveDraft: (
    message: AiChatMessage,
    draft: AiTransactionDraft,
    draftKey: string,
    draftIndex: number
  ) => void | Promise<void>;
  onCancelDraft: (
    message: AiChatMessage,
    draft: AiTransactionDraft,
    draftKey: string,
    draftIndex: number
  ) => void;
  disabled: boolean;
  savingDraftMessageId: string | null;
  savedDraftMessageIds: Set<string>;
  cancelledDraftMessageIds: Set<string>;
}) {
  const isUser = message.role === "user";
  const visibleSuggestions =
    message.suggestions?.slice(0, MAX_VISIBLE_MESSAGE_SUGGESTIONS) ?? [];
  const transactionDrafts = getMessageTransactionDrafts(message);

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "flex max-w-[92%] flex-row-reverse items-start gap-2 sm:max-w-[78%] sm:gap-3 lg:max-w-[70%]"
            : "flex max-w-[96%] items-start gap-2 sm:max-w-[86%] sm:gap-3 lg:max-w-[78%]"
        }
      >
        <div
          className={
            isUser
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white sm:h-9 sm:w-9"
              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 sm:h-9 sm:w-9"
          }
        >
          {isUser ? (
            <UserRound className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>

        <div
          className={
            isUser
              ? "rounded-[1.15rem] rounded-tr-md bg-slate-950 px-4 py-3 text-white shadow-sm"
              : "rounded-[1.15rem] rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-800 shadow-sm shadow-slate-950/5"
          }
        >
          {!isUser ? (
            <div className="mb-2">
              <IntentBadge intent={message.intent} />
            </div>
          ) : null}

          <p className="whitespace-pre-line text-[13px] font-semibold leading-6 sm:text-sm">
            {message.content}
          </p>

          {!isUser && transactionDrafts.length > 0 ? (
            <div className="mt-3 space-y-3">
              {transactionDrafts.map((draft, draftIndex) => {
                const draftKey = createDraftKey(message.id, draftIndex);
                const isSaved = hasStoredDraftState(
                  savedDraftMessageIds,
                  message.id,
                  draftIndex
                );
                const isCancelled = hasStoredDraftState(
                  cancelledDraftMessageIds,
                  message.id,
                  draftIndex
                );

                return (
                  <TransactionDraftPanel
                    draft={draft}
                    isCancelled={isCancelled}
                    isSaved={isSaved}
                    isSaving={savingDraftMessageId === draftKey}
                    key={draftKey}
                    onCancel={() =>
                      onCancelDraft(message, draft, draftKey, draftIndex)
                    }
                    onSave={() =>
                      onSaveDraft(message, draft, draftKey, draftIndex)
                    }
                    title={
                      transactionDrafts.length > 1
                        ? `Draft transaksi ${draftIndex + 1}`
                        : "Draft transaksi"
                    }
                  />
                );
              })}
            </div>
          ) : null}

          {!isUser && message.cards && message.cards.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {message.cards.map((card) => (
                <div
                  className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  key={`${message.id}-${card.label}`}
                >
                  <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
                    {card.label}
                  </p>
                  <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {!isUser && visibleSuggestions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleSuggestions.map((suggestion) => (
                <button
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-left text-[10px] font-black leading-4 text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={disabled}
                  key={`${message.id}-${suggestion}`}
                  onClick={() => onSuggestionClick(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClearHistoryDialog({
  open,
  onClose,
  onConfirm
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-950">
              Hapus riwayat chat?
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Riwayat chat Asisten Sakuin di perangkat ini akan dihapus. Data
              transaksi, goals, dan akun kamu tidak akan terhapus.
            </p>
          </div>

          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Batal
          </button>

          <button
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-700"
            onClick={onConfirm}
            type="button"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export function AsistenPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([
    createWelcomeMessage()
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraftMessageId, setSavingDraftMessageId] = useState<string | null>(
    null
  );
  const [savedDraftMessageIds, setSavedDraftMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [cancelledDraftMessageIds, setCancelledDraftMessageIds] = useState<
    Set<string>
  >(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [savedDraftIdsLoaded, setSavedDraftIdsLoaded] = useState(false);
  const [cancelledDraftIdsLoaded, setCancelledDraftIdsLoaded] = useState(false);
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] =
    useState(false);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
  });

  const displayedName = profileQuery.data?.name ?? user?.name ?? "User";
  const displayedEmail = profileQuery.data?.email ?? user?.email ?? "-";

  useEffect(() => {
    const storageKey = getChatHistoryStorageKey(user?.id);

    if (!storageKey) {
      setMessages([createWelcomeMessage()]);
      setHistoryLoaded(true);
      return;
    }

    try {
      const storedHistory = localStorage.getItem(storageKey);

      if (!storedHistory) {
        setMessages([createWelcomeMessage()]);
        setHistoryLoaded(true);
        return;
      }

      const parsedHistory = JSON.parse(storedHistory) as unknown;

      if (isValidStoredMessages(parsedHistory) && parsedHistory.length > 0) {
        setMessages(parsedHistory.slice(-MAX_STORED_MESSAGES));
      } else {
        setMessages([createWelcomeMessage()]);
      }
    } catch {
      setMessages([createWelcomeMessage()]);
    } finally {
      setHistoryLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    const storageKey = getSavedDraftStorageKey(user?.id);

    if (!storageKey) {
      setSavedDraftMessageIds(new Set());
      setSavedDraftIdsLoaded(true);
      return;
    }

    try {
      const storedSavedDraftIds = localStorage.getItem(storageKey);

      if (!storedSavedDraftIds) {
        setSavedDraftMessageIds(new Set());
        setSavedDraftIdsLoaded(true);
        return;
      }

      const parsedSavedDraftIds = JSON.parse(storedSavedDraftIds) as unknown;

      if (isValidStringArray(parsedSavedDraftIds)) {
        setSavedDraftMessageIds(new Set(parsedSavedDraftIds));
      } else {
        setSavedDraftMessageIds(new Set());
      }
    } catch {
      setSavedDraftMessageIds(new Set());
    } finally {
      setSavedDraftIdsLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    const storageKey = getCancelledDraftStorageKey(user?.id);

    if (!storageKey) {
      setCancelledDraftMessageIds(new Set());
      setCancelledDraftIdsLoaded(true);
      return;
    }

    try {
      const storedCancelledDraftIds = localStorage.getItem(storageKey);

      if (!storedCancelledDraftIds) {
        setCancelledDraftMessageIds(new Set());
        setCancelledDraftIdsLoaded(true);
        return;
      }

      const parsedCancelledDraftIds = JSON.parse(
        storedCancelledDraftIds
      ) as unknown;

      if (isValidStringArray(parsedCancelledDraftIds)) {
        setCancelledDraftMessageIds(new Set(parsedCancelledDraftIds));
      } else {
        setCancelledDraftMessageIds(new Set());
      }
    } catch {
      setCancelledDraftMessageIds(new Set());
    } finally {
      setCancelledDraftIdsLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    const storageKey = getChatHistoryStorageKey(user?.id);

    if (!historyLoaded || !storageKey) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
      // Local storage can fail in private mode or if quota is full.
    }
  }, [historyLoaded, messages, user?.id]);

  useEffect(() => {
    const storageKey = getSavedDraftStorageKey(user?.id);

    if (!savedDraftIdsLoaded || !storageKey) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([...savedDraftMessageIds])
      );
    } catch {
      // Local storage can fail in private mode or if quota is full.
    }
  }, [savedDraftIdsLoaded, savedDraftMessageIds, user?.id]);

  useEffect(() => {
    const storageKey = getCancelledDraftStorageKey(user?.id);

    if (!cancelledDraftIdsLoaded || !storageKey) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([...cancelledDraftMessageIds])
      );
    } catch {
      // Local storage can fail in private mode or if quota is full.
    }
  }, [cancelledDraftIdsLoaded, cancelledDraftMessageIds, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, isSubmitting, savingDraftMessageId]);

  function cancelDraftMessage(
    message: AiChatMessage,
    draft: AiTransactionDraft,
    draftKey: string,
    draftIndex: number
  ) {
    if (
      hasStoredDraftState(savedDraftMessageIds, message.id, draftIndex) ||
      hasStoredDraftState(cancelledDraftMessageIds, message.id, draftIndex)
    ) {
      return;
    }

    setCancelledDraftMessageIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(draftKey);
      return nextIds;
    });

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "assistant",
        content:
          "Draft transaksi sudah dibatalkan. Transaksi tidak disimpan dan tidak akan masuk ke halaman Transactions.",
        intent: "TRANSACTION_DRAFT",
        cards: [
          {
            label: "Status",
            value: "Dibatalkan"
          },
          {
            label: "Nominal",
            value: formatDraftAmount(draft.amount)
          },
          {
            label: "Kategori",
            value: draft.categoryName ?? "-"
          }
        ],
        suggestions: [
          "Catat transaksi lain",
          "Lihat pengeluaran bulan ini",
          "Saya boros di mana?"
        ],
        createdAt: new Date().toISOString()
      }
    ]);
  }

  async function submitMessage(message: string) {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || isSubmitting || savingDraftMessageId) {
      return;
    }

    const userMessage: AiChatMessage = {
      id: createMessageId(),
      role: "user",
      content: normalizedMessage,
      createdAt: new Date().toISOString()
    };

    if (isCancelDraftRequest(normalizedMessage)) {
      const activeDraftGroup = findLatestActiveDraftGroup(
        messages,
        savedDraftMessageIds,
        cancelledDraftMessageIds
      );

      if (!activeDraftGroup) {
        setMessages((currentMessages) => [
          ...currentMessages,
          userMessage,
          {
            id: createMessageId(),
            role: "assistant",
            content:
              "Belum ada draft transaksi aktif yang bisa dibatalkan. Kalau ingin mencatat transaksi, tulis seperti: catat makan 15000.",
            intent: "TRANSACTION_DRAFT",
            cards: [
              {
                label: "Status",
                value: "Tidak ada draft aktif"
              }
            ],
            suggestions: [
              "Catat makan ayam geprek 15000",
              "Pengeluaran bulan ini gimana?",
              "Saya boros di mana?"
            ],
            createdAt: new Date().toISOString()
          }
        ]);

        setInput("");
        setError(null);
        return;
      }

      setCancelledDraftMessageIds((currentIds) => {
        const nextIds = new Set(currentIds);

        activeDraftGroup.draftKeys.forEach((draftKey) => {
          nextIds.add(draftKey);
        });

        return nextIds;
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            activeDraftGroup.draftKeys.length > 1
              ? `${activeDraftGroup.draftKeys.length} draft transaksi terakhir sudah dibatalkan. Transaksi tersebut tidak disimpan.`
              : "Baik, draft transaksi terakhir sudah dibatalkan. Transaksi tersebut tidak disimpan.",
          intent: "TRANSACTION_DRAFT",
          cards: [
            {
              label: "Status",
              value: "Dibatalkan"
            },
            {
              label: "Jumlah draft",
              value: String(activeDraftGroup.draftKeys.length)
            }
          ],
          suggestions: [
            "Catat transaksi lain",
            "Lihat pengeluaran bulan ini",
            "Saya boros di mana?"
          ],
          createdAt: new Date().toISOString()
        }
      ]);

      setInput("");
      setError(null);
      return;
    }

    const history = buildRecentHistory(messages);

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await sendAiChatMessage({
        message: normalizedMessage,
        history
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createAssistantMessage(response)
      ]);
    } catch (caughtError) {
      const messageText = getErrorMessage(caughtError);

      setError(messageText);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Maaf, saya belum bisa memproses pesan itu. Coba ulangi beberapa saat lagi.",
          intent: "OUT_OF_SCOPE",
          cards: [],
          suggestions: SUGGESTED_PROMPTS,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft(
    message: AiChatMessage,
    draft: AiTransactionDraft,
    draftKey: string,
    draftIndex: number
  ) {
    const categoryId = draft.categoryId;

    if (hasStoredDraftState(cancelledDraftMessageIds, message.id, draftIndex)) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Draft transaksi ini sudah dibatalkan, jadi tidak bisa disimpan. Buat draft baru jika ingin mencatat transaksi.",
          intent: "TRANSACTION_DRAFT",
          cards: [
            {
              label: "Status",
              value: "Dibatalkan"
            }
          ],
          suggestions: ["Catat transaksi lain", "Lihat pengeluaran bulan ini"],
          createdAt: new Date().toISOString()
        }
      ]);

      return;
    }

    if (!isTransactionDraftReadyToSave(draft) || !categoryId) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Draft transaksi ini belum lengkap, jadi belum bisa disimpan. Lengkapi dulu nominal, kategori, dan tanggalnya.",
          intent: "TRANSACTION_DRAFT",
          cards: [],
          suggestions: ["Catat transaksi lain", "Lihat pengeluaran bulan ini"],
          createdAt: new Date().toISOString()
        }
      ]);

      return;
    }

    if (
      hasStoredDraftState(savedDraftMessageIds, message.id, draftIndex) ||
      savingDraftMessageId
    ) {
      return;
    }

    setSavingDraftMessageId(draftKey);
    setError(null);

    try {
      await createTransaction({
        type: draft.type,
        amount: draft.amount,
        categoryId,
        note: draft.note?.trim() || undefined,
        date: draft.date
      });

      await queryClient.invalidateQueries();

      setSavedDraftMessageIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(draftKey);
        return nextIds;
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Transaksi dari draft sudah berhasil disimpan. Data dashboard dan transaksi akan ikut diperbarui.",
          intent: "TRANSACTION_DRAFT",
          cards: [
            {
              label: "Status",
              value: "Tersimpan"
            },
            {
              label: "Nominal",
              value: formatDraftAmount(draft.amount)
            },
            {
              label: "Kategori",
              value: draft.categoryName ?? "-"
            }
          ],
          suggestions: [
            "Catat transaksi lain",
            "Lihat pengeluaran bulan ini",
            "Saya boros di mana?"
          ],
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (caughtError) {
      const messageText = getErrorMessage(caughtError);

      setError(messageText);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Draft transaksi belum berhasil disimpan. Cek lagi data draft atau coba ulangi beberapa saat lagi.",
          intent: "TRANSACTION_DRAFT",
          cards: [],
          suggestions: ["Coba catat ulang", "Lihat pengeluaran bulan ini"],
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setSavingDraftMessageId(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function handlePromptClick(prompt: string) {
    void submitMessage(prompt);
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage(input);
  }

  function handleConfirmClearHistory() {
    const chatHistoryStorageKey = getChatHistoryStorageKey(user?.id);
    const savedDraftStorageKey = getSavedDraftStorageKey(user?.id);
    const cancelledDraftStorageKey = getCancelledDraftStorageKey(user?.id);

    if (chatHistoryStorageKey) {
      localStorage.removeItem(chatHistoryStorageKey);
    }

    if (savedDraftStorageKey) {
      localStorage.removeItem(savedDraftStorageKey);
    }

    if (cancelledDraftStorageKey) {
      localStorage.removeItem(cancelledDraftStorageKey);
    }

    setMessages([createWelcomeMessage()]);
    setSavedDraftMessageIds(new Set());
    setCancelledDraftMessageIds(new Set());
    setError(null);
    setIsClearHistoryDialogOpen(false);
  }

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-white text-slate-950 lg:static lg:mx-auto lg:h-[calc(100vh-4rem)] lg:max-w-7xl lg:rounded-[1.75rem] lg:border lg:border-slate-200 lg:shadow-xl lg:shadow-slate-950/5">
        <header className="shrink-0 border-b border-slate-100 bg-white px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              to="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Asisten Sakuin
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                  Financial only
                </span>
              </div>

              <h1 className="mt-2 text-lg font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                Tanya kondisi keuanganmu
              </h1>

              <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Tanyakan pengeluaran, pemasukan, goals, perbandingan periode,
                atau buat draft transaksi dari chat natural.
              </p>
            </div>

            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setIsClearHistoryDialogOpen(true)}
              title="Hapus riwayat chat"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-50 px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                cancelledDraftMessageIds={cancelledDraftMessageIds}
                disabled={isSubmitting || savingDraftMessageId !== null}
                key={message.id}
                message={message}
                onCancelDraft={cancelDraftMessage}
                onSaveDraft={handleSaveDraft}
                onSuggestionClick={handlePromptClick}
                savedDraftMessageIds={savedDraftMessageIds}
                savingDraftMessageId={savingDraftMessageId}
              />
            ))}

            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="flex max-w-[96%] items-start gap-2 sm:max-w-[86%] sm:gap-3 lg:max-w-[78%]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 sm:h-9 sm:w-9">
                    <Bot className="h-4 w-4" />
                  </div>

                  <div className="rounded-[1.15rem] rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-600 shadow-sm shadow-slate-950/5">
                    <div className="flex items-center gap-2 text-[13px] font-bold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membaca data Sakuin...
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700 sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                disabled={isSubmitting || savingDraftMessageId !== null}
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="flex items-end gap-2 sm:gap-3" onSubmit={handleSubmit}>
            <div className="min-w-0 flex-1">
              <textarea
                className="max-h-32 min-h-12 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting || savingDraftMessageId !== null}
                maxLength={1000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Tanya keuangan atau catat transaksi..."
                rows={1}
                value={input}
              />
              <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                {input.length}/1000
              </p>
            </div>

            <button
              className="mb-5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                isSubmitting ||
                savingDraftMessageId !== null ||
                input.trim().length === 0
              }
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </footer>
      </div>

      <ClearHistoryDialog
        onClose={() => setIsClearHistoryDialogOpen(false)}
        onConfirm={handleConfirmClearHistory}
        open={isClearHistoryDialogOpen}
      />
    </AppShell>
  );
}