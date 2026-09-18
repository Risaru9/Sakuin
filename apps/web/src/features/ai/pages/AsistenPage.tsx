import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  Trash2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../../components/layout/AppShell";
import { BottomSheet, SakuMascot, StickerButton } from "../../../components/saku";
import { cn } from "../../../lib/cn";
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
    <span className="saku-line-hair mb-1.5 inline-flex w-fit rounded-full bg-saku-accent-soft px-2 text-[11px] font-black">
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
        <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-saku-muted align-middle" />
      ) : null}
    </>
  );
}

function DraftField({ label, children, wide = false }: { label: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("saku-line-hair min-w-0 rounded-2xl bg-saku-paper px-3 py-2", wide && "col-span-2")}>
      <p className="text-[10px] font-black tracking-[0.05em] text-saku-muted uppercase">{label}</p>
      <div className="mt-0.5 truncate text-sm font-black">{children}</div>
    </div>
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
  const status = isSaved
    ? { label: "Sudah disimpan", className: "bg-saku-income-soft" }
    : isCancelled
      ? { label: "Dibatalkan", className: "bg-saku-bg text-saku-muted" }
      : isSaving
        ? { label: "Menyimpan", className: "bg-saku-accent-soft" }
        : isReadyToSave
          ? { label: "Siap disimpan", className: "bg-saku-income-soft" }
          : { label: "Perlu dilengkapi", className: "bg-saku-coin-soft" };

  return (
    <div className="saku-line-thin mt-3 overflow-hidden rounded-[18px] bg-saku-bg">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 pt-3">
        <div className="min-w-0">
          <p className="font-saku-head text-base font-semibold">{title}</p>
          <p className="text-xs font-bold text-saku-muted">Belum tersimpan. Cek dulu, lalu simpan.</p>
        </div>
        <span className={cn("saku-line-hair shrink-0 rounded-full px-2 text-[11px] font-black", status.className)}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <DraftField label="Jenis">{formatDraftType(draft.type)}</DraftField>
        <DraftField label="Nominal">
          <span className="font-saku-head font-semibold">{formatDraftAmount(draft.amount)}</span>
        </DraftField>
        <DraftField label={<label htmlFor={`draft-category-${title}`}>Kategori</label>}>
          {isSaved || isCancelled || isSaving || !onChangeCategory ? (
            draft.categoryName ?? "Perlu dipilih"
          ) : (
            <select
              className="w-full cursor-pointer border-b-2 border-dashed border-saku-dash bg-transparent text-sm font-black outline-none"
              id={`draft-category-${title}`}
              onChange={(event) => {
                const category = categories.find((item) => item.id === event.target.value);

                if (category) {
                  onChangeCategory(category.id, category.name);
                }
              }}
              value={draft.categoryId ?? ""}
            >
              <option disabled value="">
                Pilih kategori
              </option>
              {categories
                .filter((category) => category.type === draft.type)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          )}
        </DraftField>
        <DraftField label="Tanggal">{formatDraftDate(draft.date)}</DraftField>
        <DraftField label="Catatan" wide>
          <span className="whitespace-normal">{draft.note ?? "Belum ada catatan"}</span>
        </DraftField>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black ring-1", getDraftConfidenceClass(draft.confidence))}>
          Yakin: {formatDraftConfidence(draft.confidence)}
        </span>
        {draft.missingFields.length > 0 ? (
          <span className="saku-line-hair rounded-full bg-saku-coin-soft px-2 text-[11px] font-black">
            Kurang: {draft.missingFields.map(formatMissingField).join(", ")}
          </span>
        ) : null}
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1.5 px-3">
          {draft.warnings.map((warning, index) => (
            <li className="flex items-start gap-1.5 text-xs font-extrabold text-saku-watch-text" key={`${warning}-${index}`}>
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.6} />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2 p-3">
        <button
          className={cn(
            "saku-line-thin saku-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
            isSaved
              ? "cursor-default bg-saku-income-soft"
              : canSave
                ? "bg-saku-accent text-white shadow-saku-xs"
                : "cursor-not-allowed bg-saku-paper text-saku-muted"
          )}
          disabled={!canSave}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Menyimpan...
            </>
          ) : isSaved ? (
            <>
              <CheckCircle2 aria-hidden="true" className="size-4" strokeWidth={2.6} />
              Sudah disimpan
            </>
          ) : isCancelled ? (
            <>
              <Ban aria-hidden="true" className="size-4" strokeWidth={2.6} />
              Dibatalkan
            </>
          ) : (
            <>
              <Save aria-hidden="true" className="size-4" strokeWidth={2.6} />
              Simpan Draft
            </>
          )}
        </button>
        <button
          className={cn(
            "saku-line-thin inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-saku-paper px-3 text-[13px] font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
            canCancel ? "text-saku-over-text" : "cursor-not-allowed text-saku-muted"
          )}
          disabled={!canCancel}
          onClick={onCancel}
          type="button"
        >
          <Ban aria-hidden="true" className="size-4" strokeWidth={2.6} />
          Batalkan Draft
        </button>
      </div>

      {!isReadyToSave && !isCancelled ? (
        <p className="px-3 pb-3 text-center text-xs font-bold text-saku-muted">Draft belum lengkap, jadi belum bisa disimpan.</p>
      ) : null}
      {isCancelled ? (
        <p className="px-3 pb-3 text-center text-xs font-bold text-saku-muted">Draft ini sudah dibatalkan dan tidak akan disimpan.</p>
      ) : null}
    </div>
  );
}

/** Saku's round face next to its answers. */
function SakuAvatar({ mood = "happy" }: { mood?: "happy" | "wow" | "worried" }) {
  return (
    <span aria-hidden="true" className="saku-line-hair flex size-[34px] shrink-0 items-end justify-center overflow-hidden rounded-full bg-saku-coin-soft">
      <SakuMascot mood={mood} size={30} />
    </span>
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

  if (isUser) {
    return (
      <div className="flex justify-end motion-safe:animate-saku-rise" ref={messageRef}>
        <div className="saku-line-thin max-w-[80%] rounded-[20px_20px_6px_20px] bg-saku-accent px-3.5 py-2.5 text-[15px] font-extrabold break-words whitespace-pre-line text-white shadow-saku-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 motion-safe:animate-saku-rise" ref={messageRef}>
      <SakuAvatar />
      <div className="saku-line-thin min-w-0 flex-1 rounded-[20px_20px_20px_6px] bg-saku-paper px-3.5 py-3 shadow-saku-xs lg:max-w-[78%] lg:flex-none">
        <IntentBadge intent={message.intent} />

        <p className="text-sm font-extrabold break-words whitespace-pre-line">
          <TypewriterContent content={message.content} shouldAnimate={shouldAnimateContent} />
        </p>

        {transactionDrafts.length > 1 ? (
          <div className="saku-line-thin mt-3 flex flex-col gap-2.5 rounded-[18px] bg-saku-income-soft p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-extrabold">
              {savableDraftEntries.length > 0
                ? `${savableDraftEntries.length} draft siap disimpan sekaligus. Total ${formatDraftAmount(String(savableTotal))}.`
                : "Tidak ada draft aktif yang siap disimpan."}
            </p>
            <button
              className="saku-line-thin saku-press inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-saku-accent px-4 text-[13px] font-black text-white shadow-saku-xs disabled:cursor-not-allowed disabled:bg-saku-paper disabled:text-saku-muted disabled:shadow-none"
              disabled={disabled || isAnyDraftSaving || savableDraftEntries.length === 0}
              onClick={() => {
                void onSaveAllDrafts(message);
              }}
              type="button"
            >
              {isAnyDraftSaving ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save aria-hidden="true" className="size-4" strokeWidth={2.6} />
                  Simpan Semua Draft
                </>
              )}
            </button>
          </div>
        ) : null}

        {transactionDrafts.map((draft, draftIndex) => {
          const draftKey = createDraftKey(message.id, draftIndex);

          return (
            <TransactionDraftPanel
              categories={categories}
              draft={draft}
              isCancelled={hasStoredDraftState(cancelledDraftMessageIds, message.id, draftIndex)}
              isSaved={hasStoredDraftState(savedDraftMessageIds, message.id, draftIndex)}
              isSaving={savingDraftIds.has(draftKey)}
              key={draftKey}
              onCancel={() => onCancelDraft(message, draft, draftKey, draftIndex)}
              onChangeCategory={(categoryId, categoryName) =>
                onChangeDraftCategory?.(message.id, draftIndex, categoryId, categoryName)
              }
              onSave={() => onSaveDraft(message, draft, draftKey, draftIndex)}
              title={transactionDrafts.length > 1 ? `Draft transaksi ${draftIndex + 1}` : "Draft transaksi"}
            />
          );
        })}

        {message.cards && message.cards.length > 0 ? (
          <dl className="mt-2">
            {message.cards.map((card, index) => (
              <div
                className={cn(
                  "flex items-baseline justify-between gap-2 py-1.5",
                  index < (message.cards?.length ?? 0) - 1 && "saku-dash-bottom"
                )}
                key={`${message.id}-${card.label}`}
              >
                <dt className="text-xs font-extrabold text-saku-muted">{card.label}</dt>
                <dd className="text-right font-saku-head text-sm font-semibold break-words">{card.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {visibleSuggestions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {visibleSuggestions.map((suggestion) => (
              <button
                aria-label={`Kirim prompt: ${suggestion}`}
                className="saku-line-hair saku-press rounded-full bg-saku-coin-soft px-2.5 py-1 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-60"
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
  return (
    <BottomSheet
      footer={
        <div className="flex gap-2.5">
          <StickerButton onClick={onClose} variant="plain">
            Batal
          </StickerButton>
          <StickerButton className="flex-1" onClick={onConfirm} variant="danger">
            Hapus
          </StickerButton>
        </div>
      }
      onClose={onClose}
      open={open}
      title="Hapus riwayat chat?"
    >
      <div className="flex items-center gap-3">
        <SakuMascot mood="worried" size={60} />
        <p className="text-sm font-bold text-saku-muted">
          Riwayat obrolan dengan Saku dihapus. Catatan transaksi, target, dan akunmu tetap aman.
        </p>
      </div>
    </BottomSheet>
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
  const [isOffline, setIsOffline] = useState(navigator.onLine === false);

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
    <AppShell mobileNav={false} profileName={displayedName} profileEmail={displayedEmail}>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-saku-bg text-saku-ink lg:static lg:z-auto lg:mx-auto lg:h-[calc(100vh-4rem)] lg:max-w-3xl lg:rounded-saku-hero lg:border-[2.5px] lg:border-saku-ink lg:shadow-saku">
        <header className="flex shrink-0 items-center gap-2.5 border-b-[2.5px] border-saku-ink bg-saku-paper px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 lg:pt-3">
          <button
            aria-label="Kembali ke halaman sebelumnya"
            className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-saku-paper shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/dashboard", { replace: true });
              }
            }}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
          </button>
          <span aria-hidden="true" className="saku-line-thin flex size-11 shrink-0 items-end justify-center overflow-hidden rounded-full bg-saku-coin-soft">
            <SakuMascot animated size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-saku-head text-xl font-semibold">Tanya Saku</h1>
            <p className="truncate text-xs font-bold text-saku-muted">Asisten AI dari catatanmu</p>
          </div>
          <button
            aria-label="Hapus riwayat chat"
            className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-saku-paper shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => setIsClearHistoryDialogOpen(true)}
            title="Hapus riwayat chat"
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
          </button>
        </header>

        <div
          aria-label="Percakapan Asisten Sakuin"
          aria-live="polite"
          aria-relevant="additions text"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3.5"
          role="log"
        >
          <div className="space-y-3.5">
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
              <div className="flex items-end gap-2 motion-safe:animate-saku-rise">
                <SakuAvatar mood="wow" />
                <div className="saku-line-thin rounded-[20px_20px_20px_6px] bg-saku-paper px-3.5 py-2.5 shadow-saku-xs">
                  <div className="flex items-center gap-2 text-[13px] font-extrabold text-saku-muted">
                    <span aria-hidden="true" className="flex items-center gap-1 text-saku-accent">
                      <span className="sakuin-typing-dot" />
                      <span className="sakuin-typing-dot" />
                      <span className="sakuin-typing-dot" />
                    </span>
                    Saku sedang membaca catatanmu…
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} aria-hidden="true" />
          </div>
        </div>

        <footer className="shrink-0 px-3 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {error ? (
            <div className="mb-2.5 rounded-2xl bg-saku-over-soft px-3 py-2.5 text-sm font-bold text-saku-over-text" role="alert">
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
                <div className="min-w-0">
                  <p>{error}</p>
                  <p className="mt-0.5 text-xs font-bold opacity-80">
                    Coba ulangi pesan terakhir, atau hubungi support kalau kendala terus muncul.
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lastFailedPrompt ? (
                  <button
                    className="saku-line-hair inline-flex min-h-9 items-center gap-1.5 rounded-full bg-saku-paper px-3 text-xs font-black text-saku-ink disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    onClick={handleRetryLastFailedPrompt}
                    type="button"
                  >
                    <RefreshCcw aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                    Coba lagi
                  </button>
                ) : null}
                <a
                  className="saku-line-hair inline-flex min-h-9 items-center gap-1.5 rounded-full bg-saku-paper px-3 text-xs font-black text-saku-ink"
                  href={AI_SUPPORT_MAILTO}
                >
                  <LifeBuoy aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                  Hubungi support
                </a>
              </div>
            </div>
          ) : null}

          <p className="mb-2 text-center text-[11px] font-bold text-saku-muted">
            Saku memberi gambaran dari catatanmu, bukan nasihat keuangan resmi.
          </p>

          <div aria-label="Prompt rekomendasi" className="-mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3 pb-1">
            {SUGGESTED_PROMPT_OPTIONS.map((option) => (
              <button
                aria-label={`Kirim prompt: ${option.prompt}`}
                className="saku-line-thin saku-press inline-flex min-h-10 shrink-0 items-center rounded-full bg-saku-paper px-3 text-xs font-black shadow-saku-xs disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || isOffline}
                key={option.prompt}
                onClick={() => handlePromptClick(option.prompt)}
                title={option.helper}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <form
            aria-label="Kirim pesan ke Asisten Sakuin"
            className="saku-line flex items-end gap-2 rounded-[28px] bg-saku-paper py-1.5 pr-1.5 pl-4 shadow-saku focus-within:ring-4 focus-within:ring-saku-accent/30"
            onSubmit={handleSubmit}
          >
            <textarea
              aria-label="Tulis pertanyaan atau transaksi untuk Asisten Sakuin"
              className="max-h-32 min-h-[42px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[15px] font-bold outline-none placeholder:text-saku-muted disabled:cursor-not-allowed"
              disabled={isSubmitting || isOffline}
              enterKeyHint="send"
              maxLength={1000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={isOffline ? "Tanya Saku butuh internet." : "Tanya apa saja soal uangmu…"}
              ref={textareaRef}
              rows={1}
              value={input}
            />
            <button
              aria-label="Kirim pesan"
              className="saku-line-thin saku-press flex size-[42px] shrink-0 items-center justify-center rounded-full bg-saku-coin disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || isOffline || input.trim().length === 0}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 aria-hidden="true" className="size-[18px] animate-spin" />
              ) : (
                <Send aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
              )}
            </button>
          </form>
          {input.length > 800 ? (
            <p className="mt-1 text-right text-[11px] font-bold text-saku-muted">{input.length}/1000</p>
          ) : null}
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
