import { classifyAiIntent } from "./ai.intent.js";
import type {
  AiChatResponse,
  AiChatServiceInput,
  AiIntent
} from "./ai.types.js";

const OUT_OF_SCOPE_REPLY =
  "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.";

const FINANCIAL_INTENT_LABELS: Record<Exclude<AiIntent, "OUT_OF_SCOPE">, string> =
  {
    FINANCIAL_SUMMARY: "Ringkasan Keuangan",
    SPENDING_ANALYSIS: "Analisis Pengeluaran",
    INCOME_ANALYSIS: "Analisis Pemasukan",
    PERIOD_COMPARISON: "Perbandingan Periode",
    SAVING_ADVICE: "Saran Hemat",
    GOAL_ANALYSIS: "Analisis Goals",
    TRANSACTION_DRAFT: "Draft Transaksi"
  };

const FINANCIAL_INTENT_REPLIES: Record<
  Exclude<AiIntent, "OUT_OF_SCOPE">,
  string
> = {
  FINANCIAL_SUMMARY:
    "Saya bisa membantu merangkum kondisi keuanganmu. Pada fase berikutnya, saya akan membaca data pemasukan, pengeluaran, saldo, dan batas aman dari akun Sakuin kamu.",
  SPENDING_ANALYSIS:
    "Saya bisa membantu menganalisis pengeluaranmu. Pada fase berikutnya, saya akan membaca kategori pengeluaran terbesar, total expense, dan pola transaksi dari data Sakuin kamu.",
  INCOME_ANALYSIS:
    "Saya bisa membantu membaca pemasukanmu. Pada fase berikutnya, saya akan membandingkan pemasukan antarperiode dan melihat sumber pemasukan yang tercatat.",
  PERIOD_COMPARISON:
    "Saya bisa membantu membandingkan periode keuangan. Pada fase berikutnya, saya akan membandingkan bulan ini dengan bulan lalu atau minggu ini dengan minggu lalu.",
  SAVING_ADVICE:
    "Saya bisa membantu memberi saran hemat yang ringan dan aman. Pada fase berikutnya, saran akan dibuat berdasarkan proporsi pengeluaran, pemasukan, kategori terbesar, dan batas saldo aman.",
  GOAL_ANALYSIS:
    "Saya bisa membantu membaca progres goals kamu. Pada fase berikutnya, saya akan melihat target, progress, deadline, dan sisa nominal dari goals Sakuin kamu.",
  TRANSACTION_DRAFT:
    "Saya bisa membantu membuat draft transaksi dari chat natural. Nantinya transaksi tetap harus kamu review dulu sebelum disimpan."
};

const DEFAULT_SUGGESTIONS = [
  "Pengeluaran saya bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan bulan ini dengan bulan lalu",
  "Kasih saran hemat"
];

const TRANSACTION_DRAFT_SUGGESTIONS = [
  "Catat makan ayam geprek 15000",
  "Catat bensin 30000 kemarin",
  "Catat dikasih kakak 100000",
  "Lihat pengeluaran bulan ini"
];

function buildFinancialPlaceholderResponse(
  intent: Exclude<AiIntent, "OUT_OF_SCOPE">
): AiChatResponse {
  return {
    intent,
    reply: FINANCIAL_INTENT_REPLIES[intent],
    cards: [
      {
        label: "Topik",
        value: FINANCIAL_INTENT_LABELS[intent]
      },
      {
        label: "Status",
        value: "Siap dihubungkan ke data Sakuin"
      }
    ],
    suggestions:
      intent === "TRANSACTION_DRAFT"
        ? TRANSACTION_DRAFT_SUGGESTIONS
        : DEFAULT_SUGGESTIONS
  };
}

function buildOutOfScopeResponse(): AiChatResponse {
  return {
    intent: "OUT_OF_SCOPE",
    reply: OUT_OF_SCOPE_REPLY,
    cards: [],
    suggestions: DEFAULT_SUGGESTIONS
  };
}

export async function getAiChatResponse(
  input: AiChatServiceInput
): Promise<AiChatResponse> {
  const normalizedMessage = input.message.trim();

  const classification = classifyAiIntent(normalizedMessage);

  if (classification.intent === "OUT_OF_SCOPE") {
    return buildOutOfScopeResponse();
  }

  return buildFinancialPlaceholderResponse(classification.intent);
}