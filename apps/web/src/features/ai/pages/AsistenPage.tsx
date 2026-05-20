import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  UserRound
} from "lucide-react";
import { AppShell } from "../../../components/layout/AppShell";
import { ApiClientError } from "../../../lib/api-client";
import { useAuth } from "../../auth/auth-context";
import { getUserProfile } from "../../profile/profile.service";
import { sendAiChatMessage } from "../ai.service";
import type { AiChatMessage, AiChatResponse } from "../ai.types";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";

const SUGGESTED_PROMPTS = [
  "Pengeluaran saya bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan bulan ini dengan bulan lalu",
  "Kasih saran hemat",
  "Analisis goals saya"
];

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

function IntentBadge({ intent }: { intent?: string }) {
  if (!intent) {
    return null;
  }

  const label = intent
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <span className="inline-flex w-fit rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700 ring-1 ring-violet-100">
      {label}
    </span>
  );
}

function ChatBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={
        isUser
          ? "flex justify-end"
          : "flex justify-start"
      }
    >
      <div
        className={
          isUser
            ? "flex max-w-[92%] flex-row-reverse items-start gap-3 sm:max-w-[76%]"
            : "flex max-w-[92%] items-start gap-3 sm:max-w-[76%]"
        }
      >
        <div
          className={
            isUser
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
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
              ? "rounded-[1.35rem] rounded-tr-md bg-slate-950 px-4 py-3 text-white shadow-sm"
              : "rounded-[1.35rem] rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-800 shadow-sm shadow-slate-950/5"
          }
        >
          {!isUser ? (
            <div className="mb-2">
              <IntentBadge intent={message.intent} />
            </div>
          ) : null}

          <p className="whitespace-pre-line text-sm font-medium leading-6">
            {message.content}
          </p>

          {!isUser && message.cards && message.cards.length > 0 ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {message.cards.map((card) => (
                <div
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  key={`${message.id}-${card.label}`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {!isUser && message.suggestions && message.suggestions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.suggestions.slice(0, 4).map((suggestion) => (
                <span
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700"
                  key={`${message.id}-${suggestion}`}
                >
                  {suggestion}
                </span>
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
        "Halo, saya Asisten Sakuin. Saya bisa membantu menjawab pertanyaan seputar pengeluaran, pemasukan, goals, dan kondisi keuanganmu di Sakuin.",
      intent: "FINANCIAL_SUMMARY",
      cards: [],
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
      <div className="relative isolate mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 h-80 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100 blur-3xl" />

        <header className="border-b border-slate-100 bg-white/80 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                to="/dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Asisten Sakuin
                </p>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Tanya kondisi keuanganmu
                </h1>

                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  Asisten ini hanya menjawab topik keuangan pribadi di Sakuin,
                  seperti transaksi, pengeluaran, pemasukan, goals, dan saran
                  hemat ringan.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-800">
              Mode awal: rule-based
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
          <div className="space-y-5">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}

            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="flex max-w-[92%] items-start gap-3 sm:max-w-[76%]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                    <Bot className="h-4 w-4" />
                  </div>

                  <div className="rounded-[1.35rem] rounded-tl-md border border-slate-100 bg-white px-4 py-3 text-slate-600 shadow-sm shadow-slate-950/5">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Asisten sedang membaca data Sakuin...
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white/90 p-4 backdrop-blur-xl sm:p-5">
          {error ? (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="flex items-end gap-3" onSubmit={handleSubmit}>
            <div className="min-w-0 flex-1">
              <textarea
                className="max-h-36 min-h-12 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={isSubmitting}
                maxLength={1000}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Tanya tentang pengeluaran, pemasukan, goals, atau kondisi keuanganmu..."
                rows={1}
                value={input}
              />
              <p className="mt-1 text-right text-[11px] font-semibold text-slate-400">
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

          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <p>
              Asisten Sakuin belum memberi nasihat investasi, pinjaman, pajak,
              atau hukum. Jawaban dibuat untuk membantu memahami data keuangan
              pribadi di Sakuin.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}