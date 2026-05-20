import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Loader2,
  Send,
  Sparkles,
  UserRound
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../../components/layout/AppShell";
import { ApiClientError } from "../../../lib/api-client";
import { queryKeys } from "../../../lib/query-keys";
import { useAuth } from "../../auth/auth-context";
import { getUserProfile } from "../../profile/profile.service";
import { sendAiChatMessage } from "../ai.service";
import type { AiChatMessage, AiChatResponse } from "../ai.types";

const SUGGESTED_PROMPTS = [
  "Pengeluaran bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan bulan ini dan bulan lalu",
  "Kasih saran hemat",
  "Analisis goals saya"
];

const MAX_VISIBLE_MESSAGE_SUGGESTIONS = 3;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function ChatBubble({
  message,
  onSuggestionClick,
  disabled
}: {
  message: AiChatMessage;
  onSuggestionClick: (suggestion: string) => void;
  disabled: boolean;
}) {
  const isUser = message.role === "user";
  const visibleSuggestions =
    message.suggestions?.slice(0, MAX_VISIBLE_MESSAGE_SUGGESTIONS) ?? [];

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

export function AsistenPage() {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
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
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
  });

  const displayedName = profileQuery.data?.name ?? user?.name ?? "User";
  const displayedEmail = profileQuery.data?.email ?? user?.email ?? "-";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages, isSubmitting]);

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

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await sendAiChatMessage({
        message: normalizedMessage
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createAssistantMessage(response)
      ]);
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setError(message);

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

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="-mx-3 -my-3 flex h-[calc(100dvh-5.75rem)] flex-col overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-950/5 sm:-mx-5 sm:-my-5 sm:h-[calc(100dvh-4rem)] sm:rounded-[1.75rem] lg:mx-auto lg:my-0 lg:h-[calc(100vh-4rem)] lg:max-w-7xl lg:rounded-[1.75rem]">
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
                atau saran hemat ringan berdasarkan data Sakuin.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-50 px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                disabled={isSubmitting}
                key={message.id}
                message={message}
                onSuggestionClick={handlePromptClick}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                maxLength={1000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Tanya tentang pengeluaran, pemasukan, goals..."
                rows={1}
                value={input}
              />
              <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                {input.length}/1000
              </p>
            </div>

            <button
              className="mb-5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || input.trim().length === 0}
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
    </AppShell>
  );
}