import { env } from "../../config/env.js";
import {
  createGeminiTextProvider,
  type AiTextProvider
} from "./ai.provider.js";
import { classifyAiIntent } from "./ai.intent.js";
import {
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
import type {
  AiChatCard,
  AiChatHistoryMessage,
  AiChatResponse,
  AiChatServiceInput,
  AiIntent
} from "./ai.types.js";

const OUT_OF_SCOPE_REPLY =
  "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.";

const DEFAULT_SUGGESTIONS = [
  "Pengeluaran saya bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan pengeluaran bulan ini dengan bulan lalu",
  "Target tabungan saya realistis?"
];

const TRANSACTION_DRAFT_SUGGESTIONS = [
  "Catat makan ayam geprek 15000",
  "Catat bensin 30000 kemarin",
  "Catat dikasih kakak 100000",
  "Lihat pengeluaran bulan ini"
];

type AiChatServiceOptions = {
  provider?: AiTextProvider;
};

function logAiProviderEvent(
  event: "ai.provider_used" | "ai.provider_fallback",
  metadata: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    })
  );
}

function sanitizeChatHistory(history: AiChatHistoryMessage[] = []) {
  return history
    .filter((message) => {
      const content = message.content.trim();

      return (
        content.length > 0 &&
        (message.role === "user" || message.role === "assistant")
      );
    })
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1500)
    }));
}

function buildConversationHistoryText(history: AiChatHistoryMessage[] = []) {
  const sanitizedHistory = sanitizeChatHistory(history);

  if (sanitizedHistory.length === 0) {
    return "Tidak ada konteks percakapan sebelumnya.";
  }

  return sanitizedHistory
    .map((message, index) => {
      const speaker = message.role === "user" ? "USER" : "ASSISTANT";

      return `${index + 1}. ${speaker}: ${message.content}`;
    })
    .join("\n");
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "Belum bisa dibandingkan";
  }

  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function getTopExpenseCategory(context: AiFinancialContext) {
  return context.currentMonth.topExpenseCategories[0] ?? null;
}

function hasCurrentMonthTransactions(context: AiFinancialContext) {
  return context.currentMonth.transactionCount > 0;
}

function buildCards(items: AiChatCard[]) {
  return items;
}

function buildOutOfScopeResponse(): AiChatResponse {
  return {
    intent: "OUT_OF_SCOPE",
    reply: OUT_OF_SCOPE_REPLY,
    cards: [],
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildTransactionDraftPlaceholderResponse(): AiChatResponse {
  return {
    intent: "TRANSACTION_DRAFT",
    reply:
      "Saya bisa membantu membuat draft transaksi dari chat natural. Nantinya transaksi tetap harus kamu review dulu sebelum disimpan.",
    cards: [
      {
        label: "Status",
        value: "Draft transaksi belum diaktifkan"
      }
    ],
    suggestions: TRANSACTION_DRAFT_SUGGESTIONS
  };
}

function buildFinancialSummaryResponse(
  context: AiFinancialContext
): AiChatResponse {
  if (!hasCurrentMonthTransactions(context)) {
    return {
      intent: "FINANCIAL_SUMMARY",
      reply:
        "Belum ada data transaksi bulan ini. Kalau kamu mulai mencatat pemasukan dan pengeluaran, saya bisa bantu merangkum kondisi keuanganmu dengan lebih jelas.",
      cards: buildCards([
        {
          label: "Pemasukan",
          value: formatRupiah(context.currentMonth.totalIncome)
        },
        {
          label: "Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Jumlah Transaksi",
          value: String(context.currentMonth.transactionCount)
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  const topCategory = getTopExpenseCategory(context);
  const topCategoryText = topCategory
    ? `Kategori pengeluaran terbesar adalah ${topCategory.name} sebesar ${formatRupiah(
        topCategory.amount
      )}.`
    : "Belum ada kategori pengeluaran yang dominan.";

  return {
    intent: "FINANCIAL_SUMMARY",
    reply: `Bulan ini pemasukanmu ${formatRupiah(
      context.currentMonth.totalIncome
    )} dan pengeluaranmu ${formatRupiah(
      context.currentMonth.totalExpense
    )}. Arus kas bersih periode ini ${formatRupiah(
      context.currentMonth.netCashflow
    )}. ${topCategoryText}`,
    cards: buildCards([
      {
        label: "Pemasukan",
        value: formatRupiah(context.currentMonth.totalIncome)
      },
      {
        label: "Pengeluaran",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Arus Kas Bersih",
        value: formatRupiah(context.currentMonth.netCashflow)
      },
      {
        label: "Jumlah Transaksi",
        value: String(context.currentMonth.transactionCount)
      }
    ]),
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildSpendingAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
  const topCategory = getTopExpenseCategory(context);

  if (toNumber(context.currentMonth.totalExpense) <= 0) {
    return {
      intent: "SPENDING_ANALYSIS",
      reply:
        "Belum ada data pengeluaran bulan ini. Setelah kamu mencatat beberapa pengeluaran, saya bisa bantu melihat kategori terbesar dan pola borosnya.",
      cards: buildCards([
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Kategori Terbesar",
          value: "Belum ada"
        },
        {
          label: "Jumlah Transaksi",
          value: String(context.currentMonth.transactionCount)
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  const categorySentence = topCategory
    ? `Kategori terbesar adalah ${topCategory.name} sebesar ${formatRupiah(
        topCategory.amount
      )}, sekitar ${topCategory.percentageOfExpense}% dari total pengeluaran.`
    : "Belum ada kategori pengeluaran yang bisa dianalisis.";

  return {
    intent: "SPENDING_ANALYSIS",
    reply: `Pengeluaranmu bulan ini ${formatRupiah(
      context.currentMonth.totalExpense
    )} dari ${
      context.currentMonth.transactionCount
    } transaksi. ${categorySentence}`,
    cards: buildCards([
      {
        label: "Total Pengeluaran",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Kategori Terbesar",
        value: topCategory ? topCategory.name : "Belum ada"
      },
      {
        label: "Nominal Kategori",
        value: topCategory ? formatRupiah(topCategory.amount) : formatRupiah(0)
      }
    ]),
    suggestions: [
      "Kasih saran hemat",
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Lihat ringkasan keuangan",
      "Target tabungan saya realistis?"
    ]
  };
}

function buildIncomeAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
  if (toNumber(context.currentMonth.totalIncome) <= 0) {
    return {
      intent: "INCOME_ANALYSIS",
      reply:
        "Belum ada data pemasukan bulan ini. Jika kamu mencatat gaji, bonus, atau pemasukan lain, saya bisa bantu membacanya sebagai ringkasan.",
      cards: buildCards([
        {
          label: "Total Pemasukan",
          value: formatRupiah(context.currentMonth.totalIncome)
        },
        {
          label: "Perubahan dari Bulan Lalu",
          value: formatPercent(context.monthComparison.incomeChangePercent)
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  return {
    intent: "INCOME_ANALYSIS",
    reply: `Pemasukanmu bulan ini ${formatRupiah(
      context.currentMonth.totalIncome
    )}. Dibanding bulan lalu, perubahan pemasukanmu adalah ${formatPercent(
      context.monthComparison.incomeChangePercent
    )}.`,
    cards: buildCards([
      {
        label: "Pemasukan Bulan Ini",
        value: formatRupiah(context.currentMonth.totalIncome)
      },
      {
        label: "Pemasukan Bulan Lalu",
        value: formatRupiah(context.previousMonth.totalIncome)
      },
      {
        label: "Perubahan",
        value: formatPercent(context.monthComparison.incomeChangePercent)
      }
    ]),
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildPeriodComparisonResponse(
  context: AiFinancialContext
): AiChatResponse {
  return {
    intent: "PERIOD_COMPARISON",
    reply: `Dibanding bulan lalu, pengeluaranmu berubah ${formatPercent(
      context.monthComparison.expenseChangePercent
    )}, sedangkan pemasukanmu berubah ${formatPercent(
      context.monthComparison.incomeChangePercent
    )}.`,
    cards: buildCards([
      {
        label: "Expense Bulan Ini",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Expense Bulan Lalu",
        value: formatRupiah(context.previousMonth.totalExpense)
      },
      {
        label: "Perubahan Expense",
        value: formatPercent(context.monthComparison.expenseChangePercent)
      },
      {
        label: "Perubahan Income",
        value: formatPercent(context.monthComparison.incomeChangePercent)
      }
    ]),
    suggestions: [
      "Saya boros di mana?",
      "Kasih saran hemat",
      "Lihat ringkasan keuangan",
      "Analisis pemasukan saya"
    ]
  };
}

function buildSavingAdviceResponse(context: AiFinancialContext): AiChatResponse {
  const topCategory = getTopExpenseCategory(context);

  if (!topCategory) {
    return {
      intent: "SAVING_ADVICE",
      reply:
        "Saya belum menemukan kategori pengeluaran yang cukup untuk diberi saran. Mulai catat transaksi beberapa hari dulu agar saran hematnya lebih relevan.",
      cards: buildCards([
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Kategori Prioritas",
          value: "Belum ada"
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  const advice =
    topCategory.percentageOfIncome >= 30
      ? `Kategori ${topCategory.name} cukup besar dibanding pemasukanmu bulan ini. Coba turunkan secara bertahap, misalnya mulai dari 10% lebih rendah minggu depan.`
      : `Kategori ${topCategory.name} adalah pengeluaran terbesar bulan ini. Coba pasang batas mingguan agar pengeluaran tetap lebih mudah dikontrol.`;

  return {
    intent: "SAVING_ADVICE",
    reply: `${advice} Fokus dulu pada satu kategori terbesar agar perubahan terasa lebih mudah dilakukan.`,
    cards: buildCards([
      {
        label: "Kategori Prioritas",
        value: topCategory.name
      },
      {
        label: "Nominal",
        value: formatRupiah(topCategory.amount)
      },
      {
        label: "Dari Pemasukan",
        value: `${topCategory.percentageOfIncome}%`
      }
    ]),
    suggestions: [
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Lihat pengeluaran bulan ini",
      "Analisis goals saya",
      "Lihat ringkasan keuangan"
    ]
  };
}

function buildGoalAnalysisResponse(context: AiFinancialContext): AiChatResponse {
  if (context.goals.totalGoals === 0) {
    return {
      intent: "GOAL_ANALYSIS",
      reply:
        "Kamu belum punya goals aktif. Kalau kamu membuat target tabungan, saya bisa bantu membaca progress dan memberi gambaran apakah targetnya masih aman.",
      cards: buildCards([
        {
          label: "Total Goals",
          value: "0"
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  return {
    intent: "GOAL_ANALYSIS",
    reply: `Kamu punya ${context.goals.totalGoals} goals. ${context.goals.completedGoals} sudah selesai, ${context.goals.activeGoals} masih aktif, dan ${context.goals.overdueGoals} melewati deadline.`,
    cards: buildCards([
      {
        label: "Total Goals",
        value: String(context.goals.totalGoals)
      },
      {
        label: "Selesai",
        value: String(context.goals.completedGoals)
      },
      {
        label: "Aktif",
        value: String(context.goals.activeGoals)
      },
      {
        label: "Overdue",
        value: String(context.goals.overdueGoals)
      }
    ]),
    suggestions: [
      "Kasih saran hemat",
      "Lihat ringkasan keuangan",
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Saya boros di mana?"
    ]
  };
}

function buildFinancialResponse(
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">,
  context: AiFinancialContext
): AiChatResponse {
  switch (intent) {
    case "FINANCIAL_SUMMARY":
      return buildFinancialSummaryResponse(context);
    case "SPENDING_ANALYSIS":
      return buildSpendingAnalysisResponse(context);
    case "INCOME_ANALYSIS":
      return buildIncomeAnalysisResponse(context);
    case "PERIOD_COMPARISON":
      return buildPeriodComparisonResponse(context);
    case "SAVING_ADVICE":
      return buildSavingAdviceResponse(context);
    case "GOAL_ANALYSIS":
      return buildGoalAnalysisResponse(context);
  }
}

function buildFinancialSystemInstruction() {
  return [
    "Kamu adalah Asisten Sakuin, financial helper untuk aplikasi pencatatan keuangan pribadi Sakuin.",
    "Jawab hanya topik keuangan pribadi di Sakuin: transaksi, pemasukan, pengeluaran, goals, budget, safe balance, cashflow, dan saran hemat ringan.",
    "Jawab pertanyaan user secara langsung. Jangan mengalihkan jawaban ke topik lain.",
    "Gunakan recent conversation context untuk memahami follow-up user seperti 'kalau 8 bulan gimana', 'kalau targetnya naik', atau 'kalau begitu apa saranmu'.",
    "Jika follow-up user merujuk pada konteks sebelumnya, pakai konteks sebelumnya selama masih relevan dengan keuangan pribadi.",
    "Jika konteks sebelumnya tidak cukup untuk menjawab, minta data yang kurang secara singkat.",
    "Jangan mengarang nominal, kategori, transaksi, tanggal, pemasukan, pengeluaran, atau goals yang tidak ada di context atau tidak disebut user.",
    "Boleh melakukan perhitungan sederhana dari angka yang ada di context atau angka yang user berikan.",
    "Jika user bertanya apakah target/goal realistis, wajib beri verdict eksplisit: Realistis, Berat, Tidak realistis, atau Butuh data tambahan.",
    "Untuk analisis target/goal, gunakan struktur: verdict, hitungan singkat, risiko utama, saran aksi.",
    "Jika user memberi gaji, target nominal, dan jangka waktu, hitung kebutuhan menabung per bulan.",
    "Jika user tidak memberi target nominal atau deadline, jangan mengarang. Minta data yang kurang secara singkat.",
    "Jika context punya income, expense, dan net cashflow, pakai itu untuk menilai kemampuan menabung.",
    "Jika user memberi angka hipotetis, analisis angka tersebut sebagai skenario, tetapi jelaskan bahwa hasil bergantung pada konsistensi pencatatan dan pengeluaran aktual.",
    "Jangan menyebut database, backend, JSON, model, API, prompt, atau detail teknis internal.",
    "Jangan memberi nasihat investasi, pinjaman, pajak, hukum, atau keputusan finansial profesional.",
    "Jangan menghakimi user. Hindari kalimat seperti gaji kamu kecil.",
    "Jika data belum cukup, katakan data belum cukup dan sebutkan data apa yang perlu ditambahkan.",
    "Jawaban harus dalam Bahasa Indonesia yang natural, jelas, ringkas, dan praktis.",
    "Format jawaban maksimal 4 paragraf pendek.",
    "Untuk pertanyaan analisis kompleks, boleh memakai bullet pendek maksimal 4 poin.",
    "Jangan membuat tabel markdown."
  ].join("\n");
}

function buildFinancialPrompt(input: {
  userMessage: string;
  intent: AiIntent;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
}) {
  return [
    "RECENT CONVERSATION CONTEXT:",
    buildConversationHistoryText(input.history),
    "",
    "USER QUESTION:",
    input.userMessage,
    "",
    "DETECTED INTENT:",
    input.intent,
    "",
    "SAFE FINANCIAL CONTEXT:",
    JSON.stringify(input.context, null, 2),
    "",
    "DETERMINISTIC BACKEND SUMMARY:",
    input.baseResponse.reply,
    "",
    "ANSWER QUALITY RULES:",
    "- Jawab pertanyaan user secara langsung dan on-point.",
    "- Jangan membahas hal yang tidak ditanya kecuali benar-benar relevan.",
    "- Jika user bertanya realistis/tidak, mulai jawaban dengan verdict.",
    "- Jika user bertanya target tabungan, hitung kebutuhan tabungan per bulan bila data tersedia.",
    "- Jika data kurang, jangan mengarang. Sebutkan data yang kurang.",
    "- Angka penting harus konsisten dengan context atau angka yang user berikan.",
    "- Cards di frontend sudah menampilkan angka utama, jadi reply fokus pada interpretasi dan saran.",
    "",
    "TASK:",
    "Buat jawaban final yang lebih natural, jelas, dan bernilai dari financial context dan deterministic backend summary.",
    "Gunakan angka yang sama seperti context/backend summary atau angka yang disebut user.",
    "Jangan tambahkan angka baru tanpa dasar.",
    "Jangan terlalu panjang.",
    "Berikan insight dan saran yang langsung bisa dilakukan user."
  ].join("\n");
}

function normalizeAiReply(text: string) {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1400);
}

async function enhanceFinancialResponseWithAi(input: {
  provider?: AiTextProvider;
  userMessage: string;
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
}) {
  if (env.NODE_ENV === "test" && !input.provider) {
    return input.baseResponse;
  }

  try {
    const provider = input.provider ?? createGeminiTextProvider();

    const result = await provider.generateText({
      systemInstruction: buildFinancialSystemInstruction(),
      prompt: buildFinancialPrompt({
        userMessage: input.userMessage,
        intent: input.intent,
        context: input.context,
        baseResponse: input.baseResponse,
        history: input.history
      })
    });

    const aiReply = normalizeAiReply(result.text);

    if (!aiReply) {
      logAiProviderEvent("ai.provider_fallback", {
        intent: input.intent,
        reason: "empty_ai_reply"
      });

      return input.baseResponse;
    }

    logAiProviderEvent("ai.provider_used", {
      intent: input.intent,
      model: result.model
    });

    return {
      ...input.baseResponse,
      reply: aiReply
    };
  } catch (error) {
    logAiProviderEvent("ai.provider_fallback", {
      intent: input.intent,
      reason: error instanceof Error ? error.name : "UnknownAiProviderError"
    });

    return input.baseResponse;
  }
}

export async function getAiChatResponse(
  input: AiChatServiceInput,
  options: AiChatServiceOptions = {}
): Promise<AiChatResponse> {
  const normalizedMessage = input.message.trim();

  const classification = classifyAiIntent(normalizedMessage);

  if (classification.intent === "OUT_OF_SCOPE") {
    return buildOutOfScopeResponse();
  }

  if (classification.intent === "TRANSACTION_DRAFT") {
    return buildTransactionDraftPlaceholderResponse();
  }

  const financialContext = await getAiFinancialContext(input.userId);
  const baseResponse = buildFinancialResponse(
    classification.intent,
    financialContext
  );

  return enhanceFinancialResponseWithAi({
    provider: options.provider,
    userMessage: normalizedMessage,
    intent: classification.intent,
    context: financialContext,
    baseResponse,
    history: input.history
  });
}