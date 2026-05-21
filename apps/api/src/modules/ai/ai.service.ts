import { env } from "../../config/env.js";
import {
  createGeminiTextProvider,
  type AiTextProvider
} from "./ai.provider.js";
import { classifyAiIntent } from "./ai.intent.js";
import { selectAiModelPlan } from "./ai-model-router.js";
import { buildRuleBasedTransactionDraft } from "./ai-transaction-draft.js";
import {
  analyzeFinancialScenario,
  buildFinancialScenarioPromptContext,
  type FinancialScenarioAnalysis
} from "./ai-financial-scenario.js";
import {
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
import type {
  AiChatCard,
  AiChatHistoryMessage,
  AiChatResponse,
  AiChatServiceInput,
  AiIntent,
  AiTransactionDraft
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

const CONTEXTUAL_FOLLOW_UP_KEYWORDS = [
  "kalau",
  "kalo",
  "bagaimana jika",
  "gimana jika",
  "jika",
  "berarti",
  "itu",
  "tersebut",
  "opsi",
  "alternatif",
  "lebih realistis",
  "lebih aman",
  "low risk",
  "risiko",
  "risk",
  "bulan",
  "tahun",
  "deadline",
  "target",
  "harga",
  "seharga",
  "beli",
  "membeli",
  "android",
  "iphone",
  "handphone",
  "hp",
  "motor",
  "mobil",
  "laptop"
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

function looksLikeContextualFinancialFollowUp(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    CONTEXTUAL_FOLLOW_UP_KEYWORDS.some((keyword) =>
      normalizedMessage.includes(keyword)
    ) || /\d/.test(normalizedMessage)
  );
}

function classifyAiChatMessage(
  message: string,
  history: AiChatHistoryMessage[] = []
) {
  const directClassification = classifyAiIntent(message);

  if (directClassification.intent !== "OUT_OF_SCOPE") {
    return directClassification;
  }

  if (!looksLikeContextualFinancialFollowUp(message) || history.length === 0) {
    return directClassification;
  }

  const recentContext = buildConversationHistoryText(history);

  const contextualClassification = classifyAiIntent(
    `${recentContext}\nFOLLOW UP USER MESSAGE:\n${message}`
  );

  if (contextualClassification.intent === "OUT_OF_SCOPE") {
    return directClassification;
  }

  return {
    ...contextualClassification,
    reason: `contextual_${contextualClassification.reason}`
  };
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

function buildScenarioCards(
  scenario: FinancialScenarioAnalysis
): AiChatCard[] {
  if (!scenario.detected) {
    return [];
  }

  const cards: AiChatCard[] = [];

  if (scenario.targetAmount) {
    cards.push({
      label: "Target",
      value: formatRupiah(scenario.targetAmount)
    });
  }

  if (scenario.monthlyIncome) {
    cards.push({
      label: "Pendapatan",
      value: formatRupiah(scenario.monthlyIncome)
    });
  }

  if (scenario.options.length > 0) {
    const lowestRiskOption = [...scenario.options].sort(
      (a, b) => a.monthlyRequired - b.monthlyRequired
    )[0];

    const highestRiskOption = [...scenario.options].sort(
      (a, b) => b.monthlyRequired - a.monthlyRequired
    )[0];

    if (scenario.options.length === 1) {
      cards.push({
        label: "Butuh / Bulan",
        value: formatRupiah(lowestRiskOption.monthlyRequired)
      });

      cards.push({
        label: "Verdict",
        value: lowestRiskOption.verdict
      });
    } else {
      cards.push({
        label: "Termurah / Bulan",
        value: formatRupiah(lowestRiskOption.monthlyRequired)
      });

      cards.push({
        label: "Terberat / Bulan",
        value: formatRupiah(highestRiskOption.monthlyRequired)
      });
    }
  } else if (scenario.missingFields.length > 0) {
    cards.push({
      label: "Data Kurang",
      value: scenario.missingFields.join(", ")
    });
  }

  return cards;
}

function mergeUniqueCards(cards: AiChatCard[], extraCards: AiChatCard[]) {
  const existingLabels = new Set(cards.map((card) => card.label));

  return [
    ...cards,
    ...extraCards.filter((card) => !existingLabels.has(card.label))
  ];
}

function enrichResponseWithScenario(
  response: AiChatResponse,
  scenario: FinancialScenarioAnalysis
): AiChatResponse {
  if (!scenario.detected) {
    return response;
  }

  return {
    ...response,
    cards: mergeUniqueCards(response.cards, buildScenarioCards(scenario))
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

function buildTransactionDraftResponse(
  draft: AiTransactionDraft
): AiChatResponse {
  const isReadyToSave = draft.missingFields.length === 0;

  return {
    intent: "TRANSACTION_DRAFT",
    reply: isReadyToSave
      ? "Saya sudah membuat draft transaksi. Silakan review dulu sebelum disimpan."
      : "Saya sudah mencoba membuat draft transaksi, tetapi masih ada data yang perlu dilengkapi sebelum bisa disimpan.",
    cards: buildCards([
      {
        label: "Tipe",
        value: draft.type === "INCOME" ? "Pemasukan" : "Pengeluaran"
      },
      {
        label: "Nominal",
        value: draft.amount ? formatRupiah(draft.amount) : "Belum terdeteksi"
      },
      {
        label: "Kategori",
        value: draft.categoryName ?? "Perlu dipilih"
      },
      {
        label: "Tanggal",
        value: draft.date
      },
      {
        label: "Status",
        value: isReadyToSave ? "Siap direview" : "Perlu dilengkapi"
      }
    ]),
    suggestions: isReadyToSave
      ? ["Simpan draft ini", "Edit draft", "Batalkan draft", "Catat transaksi lain"]
      : ["Lengkapi nominal", "Pilih kategori", "Batalkan draft"],
    transactionDraft: draft
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
    "Jika FINANCIAL SCENARIO ANALYSIS tersedia, gunakan analisis itu sebagai sumber utama untuk hitungan target, tenor, kebutuhan bulanan, rasio pendapatan, dan verdict risiko.",
    "Jika user memberi angka skenario seperti gaji, target harga, tenor, atau deadline, angka user mengalahkan data historis Sakuin untuk analisis skenario tersebut.",
    "Jangan menyimpulkan realistis hanya dari cashflow historis Sakuin. Untuk skenario pembelian/kredit, selalu cek rasio kebutuhan bulanan terhadap pendapatan skenario.",
    "Untuk tenor atau deadline range, bandingkan opsi yang paling berat dan paling ringan.",
    "Jika bunga kredit tidak diketahui, jelaskan bahwa hitungan masih pokok/estimasi kasar dan total biaya bisa lebih tinggi.",
    "Untuk skenario pembelian/kredit, jangan langsung menyuruh user membeli. Beri analisis risiko dan syarat aman.",
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
    "Jangan gunakan format markdown seperti **bold**, heading markdown, atau tabel markdown. Gunakan teks biasa yang rapi.",
    "Jangan membuat tabel markdown."
  ].join("\n");
}

function buildFinancialPrompt(input: {
  userMessage: string;
  intent: AiIntent;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
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
    "FINANCIAL SCENARIO ANALYSIS:",
    input.scenario
      ? buildFinancialScenarioPromptContext(input.scenario)
      : "Tidak ada skenario finansial terstruktur terdeteksi.",
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
    "- Angka penting harus konsisten dengan context, financial scenario analysis, atau angka yang user berikan.",
    "- Jika financial scenario analysis tersedia, jangan melawan verdict dan hitungan deterministik dari backend.",
    "- Cards di frontend sudah menampilkan angka utama, jadi reply fokus pada interpretasi dan saran.",
    "",
    "TASK:",
    "Buat jawaban final yang lebih natural, jelas, dan bernilai dari financial context, financial scenario analysis, dan deterministic backend summary.",
    "Gunakan angka yang sama seperti context/backend summary/scenario analysis atau angka yang disebut user.",
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
  scenario?: FinancialScenarioAnalysis;
}) {
  if (env.NODE_ENV === "test" && !input.provider) {
    return input.baseResponse;
  }

  const modelPlan = selectAiModelPlan({
    intent: input.intent,
    userMessage: input.userMessage,
    history: input.history
  });

  const provider = input.provider ?? createGeminiTextProvider();

  async function generateWithModel(model: string) {
    const result = await provider.generateText({
      systemInstruction: buildFinancialSystemInstruction(),
      prompt: buildFinancialPrompt({
        userMessage: input.userMessage,
        intent: input.intent,
        context: input.context,
        baseResponse: input.baseResponse,
        history: input.history,
        scenario: input.scenario
      }),
      model,
      maxOutputTokens: modelPlan.maxOutputTokens,
      temperature: modelPlan.temperature
    });

    const aiReply = normalizeAiReply(result.text);

    if (!aiReply) {
      throw new Error("EmptyAiReply");
    }

    return {
      reply: aiReply,
      model: result.model
    };
  }

  try {
    const result = await generateWithModel(modelPlan.primaryModel);

    logAiProviderEvent("ai.provider_used", {
      intent: input.intent,
      route: modelPlan.route,
      reason: modelPlan.reason,
      model: result.model,
      fallback: false
    });

    return {
      ...input.baseResponse,
      reply: result.reply
    };
  } catch (primaryError) {
    const shouldTryFallback =
      modelPlan.fallbackModel &&
      modelPlan.fallbackModel !== modelPlan.primaryModel;

    logAiProviderEvent("ai.provider_fallback", {
      intent: input.intent,
      route: modelPlan.route,
      reason:
        primaryError instanceof Error
          ? primaryError.name
          : "UnknownAiProviderError",
      model: modelPlan.primaryModel,
      fallbackModel: shouldTryFallback ? modelPlan.fallbackModel : null
    });

    if (!shouldTryFallback) {
      return input.baseResponse;
    }

    try {
      const fallbackResult = await generateWithModel(modelPlan.fallbackModel);

      logAiProviderEvent("ai.provider_used", {
        intent: input.intent,
        route: "default",
        reason: "fallback_model_used",
        model: fallbackResult.model,
        fallback: true
      });

      return {
        ...input.baseResponse,
        reply: fallbackResult.reply
      };
    } catch (fallbackError) {
      logAiProviderEvent("ai.provider_fallback", {
        intent: input.intent,
        route: "default",
        reason:
          fallbackError instanceof Error
            ? fallbackError.name
            : "UnknownAiProviderFallbackError",
        model: modelPlan.fallbackModel,
        fallbackModel: null
      });

      return input.baseResponse;
    }
  }
}

export async function getAiChatResponse(
  input: AiChatServiceInput,
  options: AiChatServiceOptions = {}
): Promise<AiChatResponse> {
  const normalizedMessage = input.message.trim();

  const classification = classifyAiChatMessage(
    normalizedMessage,
    input.history ?? []
  );

  if (classification.intent === "OUT_OF_SCOPE") {
    return buildOutOfScopeResponse();
  }

  if (classification.intent === "TRANSACTION_DRAFT") {
    const draft = await buildRuleBasedTransactionDraft({
      userId: input.userId,
      message: normalizedMessage
    });

    return buildTransactionDraftResponse(draft);
  }

  const financialContext = await getAiFinancialContext(input.userId);
  const scenario = analyzeFinancialScenario(
    normalizedMessage,
    input.history ?? []
  );

  const baseResponse = enrichResponseWithScenario(
    buildFinancialResponse(classification.intent, financialContext),
    scenario
  );

  return enhanceFinancialResponseWithAi({
    provider: options.provider,
    userMessage: normalizedMessage,
    intent: classification.intent,
    context: financialContext,
    baseResponse,
    history: input.history,
    scenario
  });
}