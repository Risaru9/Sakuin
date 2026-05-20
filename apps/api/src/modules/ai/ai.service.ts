import { classifyAiIntent } from "./ai.intent.js";
import {
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
import type {
  AiChatCard,
  AiChatResponse,
  AiChatServiceInput,
  AiIntent
} from "./ai.types.js";

const OUT_OF_SCOPE_REPLY =
  "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.";

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
      "Bandingkan bulan ini dengan bulan lalu",
      "Lihat ringkasan keuangan",
      "Analisis goals saya"
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
      "Bandingkan bulan ini dengan bulan lalu",
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
      "Bandingkan bulan ini dengan bulan lalu",
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

export async function getAiChatResponse(
  input: AiChatServiceInput
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

  return buildFinancialResponse(classification.intent, financialContext);
}