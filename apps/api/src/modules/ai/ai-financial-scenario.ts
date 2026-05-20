import type { AiChatHistoryMessage } from "./ai.types.js";

type MoneyExpression = {
  raw: string;
  value: number;
  index: number;
};

export type FinancialScenarioOption = {
  months: number;
  monthlyRequired: number;
  incomeRatioPercent: number | null;
  verdict: string;
};

export type FinancialScenarioAnalysis = {
  detected: boolean;
  itemName: string | null;
  monthlyIncome: number | null;
  targetAmount: number | null;
  durationsMonths: number[];
  options: FinancialScenarioOption[];
  verdictSummary: string;
  missingFields: string[];
  riskNotes: string[];
};

const PURCHASE_OR_GOAL_KEYWORDS = [
  "beli",
  "membeli",
  "pembelian",
  "harga",
  "seharga",
  "target",
  "goal",
  "goals",
  "tabungan",
  "menabung",
  "deadline",
  "jangka waktu",
  "tenor",
  "cicilan",
  "angsuran",
  "kredit",
  "realistis",
  "masuk akal",
  "low risk",
  "risiko",
  "risk",
  "motor",
  "mobil",
  "iphone",
  "android",
  "handphone",
  "hp",
  "ponsel",
  "laptop"
];

const INCOME_KEYWORDS = [
  "gaji",
  "pendapatan",
  "pemasukan",
  "penghasilan",
  "income",
  "uang masuk"
];

const TARGET_KEYWORDS = [
  "harga",
  "seharga",
  "target",
  "goal",
  "goals",
  "beli",
  "membeli",
  "pembelian",
  "motor",
  "mobil",
  "iphone",
  "android",
  "handphone",
  "hp",
  "ponsel",
  "laptop",
  "barang"
];

const ITEM_KEYWORDS = [
  "motor",
  "mobil",
  "iphone",
  "android",
  "handphone",
  "hp",
  "ponsel",
  "laptop"
];

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function parseMoneyValue(rawNumber: string, unit: string | undefined) {
  const normalizedNumber = Number(rawNumber.replace(",", "."));

  if (Number.isNaN(normalizedNumber)) {
    return null;
  }

  const normalizedUnit = unit?.toLowerCase();

  if (normalizedUnit === "miliar") {
    return normalizedNumber * 1_000_000_000;
  }

  if (
    normalizedUnit === "juta" ||
    normalizedUnit === "jt" ||
    normalizedUnit === "m"
  ) {
    return normalizedNumber * 1_000_000;
  }

  if (
    normalizedUnit === "ribu" ||
    normalizedUnit === "rb" ||
    normalizedUnit === "k"
  ) {
    return normalizedNumber * 1_000;
  }

  return normalizedNumber;
}

function extractMoneyExpressions(text: string): MoneyExpression[] {
  const moneyPattern =
    /\b(rp\s*)?(\d+(?:[.,]\d+)?)\s*(miliar|juta|jt|ribu|rb|k|m)?\b/gi;

  const results: MoneyExpression[] = [];

  for (const match of text.matchAll(moneyPattern)) {
    const hasRp = Boolean(match[1]);
    const rawNumber = match[2];
    const unit = match[3];
    const raw = match[0];
    const index = match.index ?? 0;

    const value = parseMoneyValue(rawNumber, unit);

    if (value === null) {
      continue;
    }

    const after = text.slice(index + raw.length, index + raw.length + 12);

    if (!unit && !hasRp && value < 10_000) {
      continue;
    }

    if (/^\s*(bulan|bln|tahun|thn)/i.test(after)) {
      continue;
    }

    results.push({
      raw,
      value,
      index
    });
  }

  return results;
}

function getWindowAround(text: string, expression: MoneyExpression) {
  const start = Math.max(0, expression.index - 55);
  const end = Math.min(text.length, expression.index + expression.raw.length + 55);

  return text.slice(start, end);
}

function findMoneyNearKeywords(
  text: string,
  expressions: MoneyExpression[],
  keywords: string[]
) {
  return (
    expressions.find((expression) =>
      includesAnyKeyword(getWindowAround(text, expression), keywords)
    ) ?? null
  );
}

function inferMonthlyIncome(text: string, expressions: MoneyExpression[]) {
  const directIncome = findMoneyNearKeywords(text, expressions, INCOME_KEYWORDS);

  if (directIncome) {
    return directIncome.value;
  }

  if (!includesAnyKeyword(text, INCOME_KEYWORDS)) {
    return null;
  }

  const sortedByValue = [...expressions].sort((a, b) => a.value - b.value);

  return sortedByValue[0]?.value ?? null;
}

function inferTargetAmount(
  text: string,
  expressions: MoneyExpression[],
  monthlyIncome: number | null
) {
  const directTarget = findMoneyNearKeywords(text, expressions, TARGET_KEYWORDS);

  if (directTarget && directTarget.value !== monthlyIncome) {
    return directTarget.value;
  }

  const candidates = expressions.filter(
    (expression) => expression.value !== monthlyIncome
  );

  const sortedByValue = [...candidates].sort((a, b) => b.value - a.value);

  return sortedByValue[0]?.value ?? null;
}

function extractDurationMonths(text: string) {
  const durations = new Set<number>();

  const rangePattern =
    /\b(\d{1,3})\s*(?:-|sampai|hingga|sd|s\/d)\s*(\d{1,3})\s*(bulan|bln|tahun|thn)\b/gi;

  for (const match of text.matchAll(rangePattern)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    const unit = match[3].toLowerCase();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      continue;
    }

    const multiplier = unit === "tahun" || unit === "thn" ? 12 : 1;

    durations.add(start * multiplier);
    durations.add(end * multiplier);
  }

  const singlePattern = /\b(\d{1,3})\s*(bulan|bln|tahun|thn)\b/gi;

  for (const match of text.matchAll(singlePattern)) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (Number.isNaN(value)) {
      continue;
    }

    const multiplier = unit === "tahun" || unit === "thn" ? 12 : 1;

    durations.add(value * multiplier);
  }

  return [...durations].filter((value) => value > 0).sort((a, b) => a - b);
}

function detectItemName(text: string) {
  const matchedItem = ITEM_KEYWORDS.find((keyword) => text.includes(keyword));

  if (!matchedItem) {
    return null;
  }

  if (matchedItem === "hp" || matchedItem === "ponsel") {
    return "handphone";
  }

  return matchedItem;
}

function getVerdictByRatio(ratio: number | null) {
  if (ratio === null) {
    return "Butuh data tambahan";
  }

  if (ratio <= 10) {
    return "Relatif aman";
  }

  if (ratio <= 20) {
    return "Cukup realistis";
  }

  if (ratio <= 30) {
    return "Berat tapi masih mungkin";
  }

  if (ratio <= 40) {
    return "Berisiko tinggi";
  }

  return "Tidak disarankan";
}

function buildScenarioOptions(input: {
  monthlyIncome: number | null;
  targetAmount: number | null;
  durationsMonths: number[];
}) {
  if (!input.targetAmount || input.durationsMonths.length === 0) {
    return [];
  }

  return input.durationsMonths.map((months) => {
    const monthlyRequired = input.targetAmount
      ? Math.ceil(input.targetAmount / months)
      : 0;

    const incomeRatioPercent =
      input.monthlyIncome && input.monthlyIncome > 0
        ? Number(((monthlyRequired / input.monthlyIncome) * 100).toFixed(1))
        : null;

    return {
      months,
      monthlyRequired,
      incomeRatioPercent,
      verdict: getVerdictByRatio(incomeRatioPercent)
    };
  });
}

function buildVerdictSummary(options: FinancialScenarioOption[]) {
  if (options.length === 0) {
    return "Butuh data tambahan";
  }

  if (options.length === 1) {
    return `${options[0].months} bulan: ${options[0].verdict}`;
  }

  const highestRiskOption = [...options].sort(
    (a, b) => b.monthlyRequired - a.monthlyRequired
  )[0];

  const lowestRiskOption = [...options].sort(
    (a, b) => a.monthlyRequired - b.monthlyRequired
  )[0];

  return `${highestRiskOption.months} bulan: ${highestRiskOption.verdict}; ${lowestRiskOption.months} bulan: ${lowestRiskOption.verdict}`;
}

function buildMissingFields(input: {
  monthlyIncome: number | null;
  targetAmount: number | null;
  durationsMonths: number[];
}) {
  const missingFields: string[] = [];

  if (!input.monthlyIncome) {
    missingFields.push("pendapatan bulanan");
  }

  if (!input.targetAmount) {
    missingFields.push("target nominal/harga");
  }

  if (input.durationsMonths.length === 0) {
    missingFields.push("deadline/tenor");
  }

  return missingFields;
}

function buildRiskNotes(input: {
  options: FinancialScenarioOption[];
  missingFields: string[];
}) {
  const notes: string[] = [];

  if (input.missingFields.length > 0) {
    notes.push(
      `Data belum lengkap: ${input.missingFields.join(", ")}.`
    );
  }

  const hasHighRiskOption = input.options.some(
    (option) =>
      option.incomeRatioPercent !== null && option.incomeRatioPercent > 30
  );

  if (hasHighRiskOption) {
    notes.push(
      "Ada opsi yang memakan lebih dari 30% pendapatan bulanan, sehingga risiko cashflow meningkat."
    );
  }

  notes.push(
    "Hitungan ini belum memasukkan bunga kredit, biaya admin, servis, pajak, asuransi, atau pengeluaran mendadak."
  );

  return notes;
}

function getHistoryText(history: AiChatHistoryMessage[]) {
  return history
    .slice(-12)
    .map((message) => message.content)
    .join("\n");
}

export function analyzeFinancialScenario(
  userMessage: string,
  history: AiChatHistoryMessage[] = []
): FinancialScenarioAnalysis {
  const currentText = normalizeText(userMessage);
  const historyText = normalizeText(getHistoryText(history));
  const combinedText = `${historyText}\n${currentText}`.trim();

  const hasScenarioContext =
    includesAnyKeyword(currentText, PURCHASE_OR_GOAL_KEYWORDS) ||
    includesAnyKeyword(combinedText, PURCHASE_OR_GOAL_KEYWORDS);

  const currentMoneyExpressions = extractMoneyExpressions(currentText);
  const historyMoneyExpressions = extractMoneyExpressions(historyText);
  const combinedMoneyExpressions = extractMoneyExpressions(combinedText);

  const monthlyIncome =
    inferMonthlyIncome(currentText, currentMoneyExpressions) ??
    inferMonthlyIncome(historyText, historyMoneyExpressions) ??
    inferMonthlyIncome(combinedText, combinedMoneyExpressions);

  const targetAmount =
    inferTargetAmount(currentText, currentMoneyExpressions, monthlyIncome) ??
    inferTargetAmount(historyText, historyMoneyExpressions, monthlyIncome) ??
    inferTargetAmount(combinedText, combinedMoneyExpressions, monthlyIncome);

  const durationsMonths = [
    ...new Set([
      ...extractDurationMonths(currentText),
      ...extractDurationMonths(historyText)
    ])
  ].sort((a, b) => a - b);

  const itemName = detectItemName(currentText) ?? detectItemName(historyText);
  const detected =
    hasScenarioContext ||
    monthlyIncome !== null ||
    targetAmount !== null ||
    durationsMonths.length > 0;

  if (!detected) {
    return {
      detected: false,
      itemName: null,
      monthlyIncome: null,
      targetAmount: null,
      durationsMonths: [],
      options: [],
      verdictSummary: "Tidak ada skenario finansial terstruktur terdeteksi.",
      missingFields: [],
      riskNotes: []
    };
  }

  const options = buildScenarioOptions({
    monthlyIncome,
    targetAmount,
    durationsMonths
  });

  const missingFields = buildMissingFields({
    monthlyIncome,
    targetAmount,
    durationsMonths
  });

  return {
    detected: true,
    itemName,
    monthlyIncome,
    targetAmount,
    durationsMonths,
    options,
    verdictSummary: buildVerdictSummary(options),
    missingFields,
    riskNotes: buildRiskNotes({
      options,
      missingFields
    })
  };
}

export function buildFinancialScenarioPromptContext(
  scenario: FinancialScenarioAnalysis
) {
  if (!scenario.detected) {
    return "Tidak ada skenario finansial terstruktur terdeteksi.";
  }

  return [
    `Item/tujuan: ${scenario.itemName ?? "Tidak disebutkan"}`,
    `Pendapatan bulanan skenario user: ${formatRupiah(scenario.monthlyIncome)}`,
    `Target nominal/harga: ${formatRupiah(scenario.targetAmount)}`,
    `Tenor/deadline: ${
      scenario.durationsMonths.length > 0
        ? `${scenario.durationsMonths.join(", ")} bulan`
        : "Tidak disebutkan"
    }`,
    `Verdict deterministik: ${scenario.verdictSummary}`,
    "Opsi perhitungan:",
    scenario.options.length > 0
      ? scenario.options
          .map((option) => {
            const ratioText =
              option.incomeRatioPercent === null
                ? "rasio tidak bisa dihitung"
                : `${option.incomeRatioPercent}% dari pendapatan`;

            return `- ${option.months} bulan: perlu ${formatRupiah(
              option.monthlyRequired
            )}/bulan, ${ratioText}, verdict: ${option.verdict}`;
          })
          .join("\n")
      : "- Belum bisa dihitung karena data kurang.",
    "Catatan risiko:",
    scenario.riskNotes.map((note) => `- ${note}`).join("\n")
  ].join("\n");
}