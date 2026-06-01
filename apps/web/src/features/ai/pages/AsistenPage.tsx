import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../../components/layout/AppShell";
import { queryKeys } from "../../../lib/query-keys";
import { useAuth } from "../../auth/auth-context";
import { getUserProfile } from "../../profile/profile.service";
import { createTransaction } from "../../transactions/transaction.service";
import { useMutation } from "@tanstack/react-query";
import { sendAiChatMessage, getAiChatHistory, clearAiChatHistory } from "../ai.service";
import { getCategories } from "../../categories/category.service";
import type { Category } from "../../categories/category.types";
import type { AiChatMessage, AiTransactionDraft } from "../ai.types";
import {
  AI_SUPPORT_MAILTO,
  MAX_STORED_MESSAGES,
  MAX_VISIBLE_MESSAGE_SUGGESTIONS,
  SUGGESTED_PROMPT_OPTIONS,
  SUGGESTED_PROMPTS,
  buildRecentHistory,
  createAssistantMessage,
  createDraftKey,
  createMessageId,
  createWelcomeMessage,
  findLatestActiveDraftGroup,
  formatDraftAmount,
  formatDraftConfidence,
  formatDraftDate,
  formatDraftType,
  formatIntentLabel,
  formatMissingField,
  getCancelledDraftStorageKey,
  getChatHistoryStorageKey,
  getDraftAmountTotal,
  getDraftConfidenceClass,
  getDraftEntries,
  getMessageTransactionDrafts,
  getErrorMessage,
  getSavableDraftEntries,
  getSavedDraftStorageKey,
  hasStoredDraftState,
  isCancelDraftRequest,
  isDraftActionSuggestion,
  isTransactionDraftReadyToSave,
  isValidStoredMessages,
  isValidStringArray,
  shouldReduceMotion
} from "../ai-chat-utils";

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent) {
    return null;
  }

  return (
    <span className="inline-flex w-fit rounded-full bg-[var(--sakuin-ai-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--sakuin-ai)] ring-1 ring-[var(--sakuin-border)]">
      {formatIntentLabel(intent)}
    </span>
  );
}

function TypewriterContent({
  content,
  shouldAnimate
}: {
  content: string;
  shouldAnimate: boolean;
}) {
  const tokens = content.split(/(\s+)/);
  const [visibleTokenCount, setVisibleTokenCount] = useState(
    shouldAnimate ? 0 : tokens.length
  );

  useEffect(() => {
    if (!shouldAnimate || shouldReduceMotion()) {
      setVisibleTokenCount(tokens.length);
      return;
    }

    setVisibleTokenCount(0);

    if (tokens.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setVisibleTokenCount((currentCount) => {
        if (currentCount >= tokens.length) {
          window.clearInterval(intervalId);
          return currentCount;
        }

        return currentCount + 1;
      });
    }, 22);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [content, shouldAnimate, tokens.length]);

  return (
    <>
      {tokens.slice(0, visibleTokenCount).join("")}
      {shouldAnimate && visibleTokenCount < tokens.length ? (
        <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-slate-400 align-middle" />
      ) : null}
    </>
  );
}

function TransactionDraftPanel({
  draft,
  title = "Draft transaksi",
  isSaving,
  isSaved,
  isCancelled,
  onSave,
  onCancel,
  categories = [],
  onChangeCategory
}: {
  draft: AiTransactionDraft;
  title?: string;
  isSaving: boolean;
  isSaved: boolean;
  isCancelled: boolean;
  onSave: () => void;
  onCancel: () => void;
  categories?: Category[];
  onChangeCategory?: (categoryId: string, categoryName: string) => void;
}) {
  const isReadyToSave = isTransactionDraftReadyToSave(draft);
  const canSave = isReadyToSave && !isSaving && !isSaved && !isCancelled;
  const canCancel = !isSaving && !isSaved && !isCancelled;

  return (
    <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-[var(--sakuin-border)] bg-[var(--sakuin-ai-soft)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--sakuin-border)] px-3 py-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[var(--sakuin-text)]">
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
              : isSaving
                ? "Menyimpan"
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
          <label htmlFor={`draft-category-${title}`} className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px] block mb-0.5">
            Kategori
          </label>
          {isSaved || isCancelled || isSaving || !onChangeCategory ? (
            <p className="mt-1 truncate text-xs font-black text-slate-950 sm:text-sm">
              {draft.categoryName ?? "Perlu dipilih"}
            </p>
          ) : (
            <select
              id={`draft-category-${title}`}
              value={draft.categoryId ?? ""}
              onChange={(e) => {
                const selectedId = e.target.value;
                const cat = categories.find((c) => c.id === selectedId);
                if (cat) {
                  onChangeCategory(cat.id, cat.name);
                }
              }}
              className="mt-1 w-full bg-transparent text-xs font-black text-slate-950 focus:outline-none cursor-pointer border-b border-dashed border-slate-300 pb-0.5"
            >
              <option value="" disabled>Pilih Kategori</option>
              {categories
                .filter((c) => c.type === draft.type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}
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

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sakuin-border)] px-3 py-3">
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

      <div className="grid gap-2 border-t border-[var(--sakuin-border)] px-3 py-3 sm:grid-cols-2">
        <button
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-sm transition sm:text-sm",
            isSaved
              ? "cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
              : isCancelled
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : isReadyToSave
                  ? "bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="space-y-2 border-t border-[var(--sakuin-border)] px-3 py-3">
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
  onSaveAllDrafts,
  disabled,
  savingDraftIds,
  savedDraftMessageIds,
  cancelledDraftMessageIds,
  shouldAnimateContent,
  messageRef,
  categories = [],
  onChangeDraftCategory
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
  onSaveAllDrafts: (message: AiChatMessage) => void | Promise<void>;
  disabled: boolean;
  savingDraftIds: Set<string>;
  savedDraftMessageIds: Set<string>;
  cancelledDraftMessageIds: Set<string>;
  shouldAnimateContent: boolean;
  messageRef?: (element: HTMLDivElement | null) => void;
  categories?: Category[];
  onChangeDraftCategory?: (
    messageId: string,
    draftIndex: number,
    categoryId: string,
    categoryName: string
  ) => void;
}) {
  const isUser = message.role === "user";
  const visibleSuggestions =
    message.suggestions
      ?.filter((suggestion) => !isDraftActionSuggestion(suggestion))
      .slice(0, MAX_VISIBLE_MESSAGE_SUGGESTIONS) ?? [];
  const transactionDrafts = getMessageTransactionDrafts(message);
  const draftEntries = getDraftEntries(message);
  const savableDraftEntries = getSavableDraftEntries(
    message,
    savedDraftMessageIds,
    cancelledDraftMessageIds,
    savingDraftIds
  );
  const isAnyDraftSaving = draftEntries.some((entry) =>
    savingDraftIds.has(entry.draftKey)
  );
  const savableTotal = getDraftAmountTotal(
    savableDraftEntries.map((entry) => entry.draft)
  );

  return (
    <div
      className={isUser ? "flex justify-end" : "flex justify-start"}
      ref={messageRef}
    >
      <div
        className={
          isUser
            ? "flex max-w-[84%] flex-row-reverse items-start gap-2 sm:max-w-[76%] sm:gap-3 lg:max-w-[68%]"
            : "flex max-w-[88%] items-start gap-2 sm:max-w-[80%] sm:gap-3 lg:max-w-[72%]"
        }
      >
        <div
          className={
            isUser
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-secondary)] text-white sm:h-9 sm:w-9"
              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-ai)] text-white shadow-md shadow-black/10 sm:h-9 sm:w-9"
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
              ? "rounded-[1.15rem] rounded-tr-md bg-[var(--sakuin-secondary)] px-4 py-3 text-white shadow-sm"
              : "rounded-[1.15rem] rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-800 shadow-sm shadow-slate-950/5"
          }
        >
          {!isUser ? (
            <div className="mb-2">
              <IntentBadge intent={message.intent} />
            </div>
          ) : null}

          <p className="whitespace-pre-line break-words text-[13px] font-semibold leading-6 sm:text-sm">
            <TypewriterContent
              content={message.content}
              shouldAnimate={shouldAnimateContent}
            />
          </p>

          {!isUser && transactionDrafts.length > 1 ? (
            <div className="mt-3 rounded-[1.1rem] border border-emerald-100 bg-emerald-50/80 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                    Aksi cepat multi draft
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
                    {savableDraftEntries.length > 0
                      ? `${savableDraftEntries.length} draft siap disimpan sekaligus. Total ${formatDraftAmount(
                          String(savableTotal)
                        )}.`
                      : "Tidak ada draft aktif yang siap disimpan."}
                  </p>
                </div>

                <button
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto sm:text-sm"
                  disabled={
                    disabled ||
                    isAnyDraftSaving ||
                    savableDraftEntries.length === 0
                  }
                  onClick={() => {
                    void onSaveAllDrafts(message);
                  }}
                  type="button"
                >
                  {isAnyDraftSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Semua Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

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
                    isSaving={savingDraftIds.has(draftKey)}
                    key={draftKey}
                    onCancel={() =>
                      onCancelDraft(message, draft, draftKey, draftIndex)
                    }
                    onSave={() =>
                      onSaveDraft(message, draft, draftKey, draftIndex)
                    }
                    categories={categories}
                    onChangeCategory={(catId, catName) =>
                      onChangeDraftCategory?.(message.id, draftIndex, catId, catName)
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
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {message.cards.map((card) => (
                <div
                  className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  key={`${message.id}-${card.label}`}
                >
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
                    {card.label}
                  </p>
                  <p className="mt-1 break-words text-xs font-black text-slate-950 sm:text-sm">
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
                  aria-label={`Kirim prompt: ${suggestion}`}
                  className="rounded-full bg-[var(--sakuin-ai-soft)] px-3 py-1.5 text-left text-[10px] font-black leading-4 text-[var(--sakuin-ai)] ring-1 ring-[var(--sakuin-border)] transition hover:bg-[var(--sakuin-ai-soft)] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--sakuin-secondary)]/40 px-4 backdrop-blur-sm">
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
            aria-label="Tutup dialog hapus riwayat"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userMessageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([
    createWelcomeMessage()
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraftIds, setSavingDraftIds] = useState<Set<string>>(
    () => new Set()
  );
  const [savedDraftMessageIds, setSavedDraftMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [cancelledDraftMessageIds, setCancelledDraftMessageIds] = useState<
    Set<string>
  >(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [savedDraftIdsLoaded, setSavedDraftIdsLoaded] = useState(false);
  const [cancelledDraftIdsLoaded, setCancelledDraftIdsLoaded] = useState(false);
  const [appliedRoutePrompt, setAppliedRoutePrompt] = useState<string | null>(
    null
  );
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] =
    useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories()
  });
  const categories = categoriesQuery.data ?? [];

  const chatHistoryQuery = useQuery({
    queryKey: ["ai", "chat"],
    queryFn: getAiChatHistory,
    enabled: !!user?.id
  });

  const clearChatMutation = useMutation({
    mutationFn: clearAiChatHistory,
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: ["ai", "chat"] }, []);
    }
  });

  const displayedName = profileQuery.data?.name ?? user?.name ?? "User";
  const displayedEmail = profileQuery.data?.email ?? user?.email ?? "-";
  const latestAssistantMessageId =
    [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.id !== "welcome-message")
      ?.id ?? null;

  function setUserMessageRef(messageId: string) {
    return (element: HTMLDivElement | null) => {
      if (element) {
        userMessageRefs.current.set(messageId, element);
        return;
      }

      userMessageRefs.current.delete(messageId);
    };
  }

  function scrollToUserMessage(messageId: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        userMessageRefs.current.get(messageId)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  function scrollToChatEnd(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: shouldReduceMotion() ? "auto" : behavior,
          block: "end"
        });
      });
    });
  }

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [input]);

  useEffect(() => {
    const routePrompt = searchParams.get("prompt");

    if (!routePrompt) {
      setAppliedRoutePrompt(null);
      return;
    }

    if (appliedRoutePrompt === routePrompt) {
      return;
    }

    setInput(routePrompt.trim().slice(0, 1000));
    setAppliedRoutePrompt(routePrompt);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("prompt");
    setSearchParams(nextSearchParams, { replace: true });
  }, [appliedRoutePrompt, searchParams, setSearchParams]);

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    scrollToChatEnd("smooth");
  }, [historyLoaded, isSubmitting, messages.length]);

  useEffect(() => {
    if (chatHistoryQuery.isSuccess) {
      const dbHistory = chatHistoryQuery.data;
      if (dbHistory.length > 0) {
        setMessages(dbHistory);
      } else {
        setMessages([createWelcomeMessage()]);
      }
      setHistoryLoaded(true);

      const storageKey = getChatHistoryStorageKey(user?.id);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [chatHistoryQuery.isSuccess, chatHistoryQuery.data, user?.id]);

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

  function cancelDraftMessage(
    message: AiChatMessage,
    draft: AiTransactionDraft,
    draftKey: string,
    draftIndex: number
  ) {
    if (
      hasStoredDraftState(savedDraftMessageIds, message.id, draftIndex) ||
      hasStoredDraftState(cancelledDraftMessageIds, message.id, draftIndex) ||
      savingDraftIds.has(draftKey)
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

    if (!normalizedMessage || isSubmitting) {
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
    scrollToUserMessage(userMessage.id);
    setInput("");
    setError(null);
    setLastFailedPrompt(null);
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
      setLastFailedPrompt(normalizedMessage);

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

  function handleUpdateDraftCategory(
    messageId: string,
    draftIndex: number,
    categoryId: string,
    categoryName: string
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((msg) => {
        if (msg.id !== messageId) {
          return msg;
        }

        if (msg.transactionDraft && draftIndex === 0) {
          return {
            ...msg,
            transactionDraft: {
              ...msg.transactionDraft,
              categoryId,
              categoryName
            }
          };
        }

        if (msg.transactionDrafts && msg.transactionDrafts[draftIndex]) {
          const nextDrafts = [...msg.transactionDrafts];
          nextDrafts[draftIndex] = {
            ...nextDrafts[draftIndex],
            categoryId,
            categoryName
          };
          return {
            ...msg,
            transactionDrafts: nextDrafts
          };
        }

        return msg;
      })
    );
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
      savingDraftIds.has(draftKey)
    ) {
      return;
    }

    setSavingDraftIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(draftKey);
      return nextIds;
    });
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
      setSavingDraftIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(draftKey);
        return nextIds;
      });
    }
  }

  async function handleSaveAllDrafts(message: AiChatMessage) {
    const savableDraftEntries = getSavableDraftEntries(
      message,
      savedDraftMessageIds,
      cancelledDraftMessageIds,
      savingDraftIds
    );

    if (savableDraftEntries.length === 0) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            "Tidak ada draft aktif yang siap disimpan. Draft mungkin sudah tersimpan, sudah dibatalkan, atau belum lengkap.",
          intent: "TRANSACTION_DRAFT",
          cards: [
            {
              label: "Status",
              value: "Tidak ada draft siap"
            }
          ],
          suggestions: ["Catat transaksi lain", "Lihat pengeluaran bulan ini"],
          createdAt: new Date().toISOString()
        }
      ]);

      return;
    }

    setSavingDraftIds((currentIds) => {
      const nextIds = new Set(currentIds);

      savableDraftEntries.forEach((entry) => {
        nextIds.add(entry.draftKey);
      });

      return nextIds;
    });
    setError(null);

    try {
      const results = await Promise.allSettled(
        savableDraftEntries.map((entry) =>
          createTransaction({
            type: entry.draft.type,
            amount: entry.draft.amount,
            categoryId: entry.categoryId,
            note: entry.draft.note?.trim() || undefined,
            date: entry.draft.date
          })
        )
      );

      const successfulEntries = savableDraftEntries.filter(
        (_, index) => results[index].status === "fulfilled"
      );
      const failedCount = results.length - successfulEntries.length;

      if (successfulEntries.length > 0) {
        await queryClient.invalidateQueries();

        setSavedDraftMessageIds((currentIds) => {
          const nextIds = new Set(currentIds);

          successfulEntries.forEach((entry) => {
            nextIds.add(entry.draftKey);
          });

          return nextIds;
        });
      }

      if (failedCount > 0) {
        setError(
          `${failedCount} draft belum berhasil disimpan. Coba simpan ulang draft yang masih aktif.`
        );
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content:
            failedCount > 0
              ? `${successfulEntries.length} draft berhasil disimpan, tetapi ${failedCount} draft belum berhasil. Draft yang gagal masih bisa dicoba lagi.`
              : `${successfulEntries.length} draft transaksi berhasil disimpan sekaligus. Data dashboard dan transaksi akan ikut diperbarui.`,
          intent: "TRANSACTION_DRAFT",
          cards: [
            {
              label: "Berhasil",
              value: String(successfulEntries.length)
            },
            {
              label: "Gagal",
              value: String(failedCount)
            },
            {
              label: "Total tersimpan",
              value: formatDraftAmount(
                String(
                  getDraftAmountTotal(
                    successfulEntries.map((entry) => entry.draft)
                  )
                )
              )
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
            "Draft transaksi belum berhasil disimpan. Cek koneksi atau coba ulangi beberapa saat lagi.",
          intent: "TRANSACTION_DRAFT",
          cards: [],
          suggestions: ["Coba catat ulang", "Lihat pengeluaran bulan ini"],
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setSavingDraftIds((currentIds) => {
        const nextIds = new Set(currentIds);

        savableDraftEntries.forEach((entry) => {
          nextIds.delete(entry.draftKey);
        });

        return nextIds;
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function handlePromptClick(prompt: string) {
    void submitMessage(prompt);
  }

  function handleRetryLastFailedPrompt() {
    if (!lastFailedPrompt || isSubmitting) {
      return;
    }

    void submitMessage(lastFailedPrompt);
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage(input);
  }

  function handleConfirmClearHistory() {
    clearChatMutation.mutate();

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
    setSavingDraftIds(new Set());
    setError(null);
    setIsClearHistoryDialogOpen(false);
  }

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white text-slate-950 lg:static lg:z-auto lg:mx-auto lg:h-[calc(100vh-4rem)] lg:max-w-7xl lg:rounded-[1.75rem] lg:border lg:border-[var(--sakuin-border)] lg:shadow-xl lg:shadow-black/5">
        <header className="shrink-0 border-b border-[var(--sakuin-border)] bg-white px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:py-4 lg:px-6 lg:pt-4">
          <div className="flex items-start gap-3">
            <button
              aria-label="Kembali ke halaman sebelumnya"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/dashboard", { replace: true });
                }
              }}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sakuin-ai-soft)] px-3 py-1 text-xs font-black text-[var(--sakuin-ai)] ring-1 ring-[var(--sakuin-border)]">
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
              aria-label="Hapus riwayat chat"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setIsClearHistoryDialogOpen(true)}
              title="Hapus riwayat chat"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          aria-label="Percakapan Asisten Sakuin"
          aria-live="polite"
          aria-relevant="additions text"
          className="min-h-0 flex-1 overflow-y-auto bg-[var(--sakuin-bg)] px-3 py-3 sm:px-5 sm:py-5 lg:px-6"
          role="log"
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                cancelledDraftMessageIds={cancelledDraftMessageIds}
                disabled={isSubmitting}
                key={message.id}
                message={message}
                messageRef={
                  message.role === "user"
                    ? setUserMessageRef(message.id)
                    : undefined
                }
                onCancelDraft={cancelDraftMessage}
                onSaveAllDrafts={handleSaveAllDrafts}
                onSaveDraft={handleSaveDraft}
                onSuggestionClick={handlePromptClick}
                savedDraftMessageIds={savedDraftMessageIds}
                savingDraftIds={savingDraftIds}
                shouldAnimateContent={
                  message.role === "assistant" &&
                  message.id === latestAssistantMessageId
                }
                categories={categories}
                onChangeDraftCategory={handleUpdateDraftCategory}
              />
            ))}

            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="flex max-w-[96%] items-start gap-2 sm:max-w-[86%] sm:gap-3 lg:max-w-[78%]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-ai)] text-white shadow-md shadow-black/10 sm:h-9 sm:w-9">
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

            <div ref={chatEndRef} aria-hidden="true" />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:py-3 lg:pb-3">
          {error ? (
            <div
              className="mb-3 grid gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700 sm:text-sm"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p>{error}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-rose-600/80 sm:text-xs">
                    Coba ulangi pesan terakhir, atau hubungi support kalau
                    kendala terus muncul.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {lastFailedPrompt ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    onClick={handleRetryLastFailedPrompt}
                    type="button"
                  >
                    <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" />
                    Coba lagi
                  </button>
                ) : null}

                <a
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                  href={AI_SUPPORT_MAILTO}
                >
                  <LifeBuoy aria-hidden="true" className="h-3.5 w-3.5" />
                  Hubungi support
                </a>
              </div>
            </div>
          ) : null}

          <div
            aria-label="Prompt rekomendasi"
            className="mb-3 flex gap-2 overflow-x-auto pb-1"
          >
            {SUGGESTED_PROMPT_OPTIONS.map((option) => (
              <button
                aria-label={`Kirim prompt: ${option.prompt}`}
                className="shrink-0 rounded-2xl border border-[var(--sakuin-border)] bg-white px-3 py-2 text-left shadow-sm transition hover:border-[var(--sakuin-border)] hover:bg-[var(--sakuin-ai-soft)] hover:text-[var(--sakuin-ai)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || isOffline}
                key={option.prompt}
                onClick={() => handlePromptClick(option.prompt)}
                type="button"
              >
                <span className="block text-[11px] font-black text-slate-800 sm:text-xs">
                  {option.label}
                </span>
                <span className="block max-w-36 truncate text-[10px] font-semibold text-slate-500">
                  {option.helper}
                </span>
              </button>
            ))}
          </div>

          <form
            aria-label="Kirim pesan ke Asisten Sakuin"
            className="flex items-end gap-2 sm:gap-3"
            onSubmit={handleSubmit}
          >
            <div className="min-w-0 flex-1">
              <textarea
                aria-label="Tulis pertanyaan atau transaksi untuk Asisten Sakuin"
                className="max-h-32 min-h-12 w-full resize-none rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-3 text-sm font-semibold leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting || isOffline}
                enterKeyHint="send"
                maxLength={1000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={isOffline ? "Fitur Asisten tidak tersedia saat offline." : "Tanya keuangan atau catat transaksi..."}
                ref={textareaRef}
                rows={1}
                value={input}
              />
              <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                {input.length}/1000
              </p>
            </div>

            <button
              aria-label="Kirim pesan"
              className="mb-5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-ai)] text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || isOffline || input.trim().length === 0}
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
