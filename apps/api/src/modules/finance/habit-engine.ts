import { Prisma, TransactionType } from "@prisma/client";

const HABIT_TIME_ZONE = "Asia/Jakarta";
const JAKARTA_UTC_OFFSET_HOURS = 7;

type HabitDateParts = {
  year: number;
  month: number;
  day: number;
};

type HabitCategory = {
  name: string;
};

export type HabitTransactionInput = {
  type: TransactionType;
  amount: Prisma.Decimal.Value;
  date: Date;
  createdAt: Date;
  category: HabitCategory;
};

export type HabitCompletionStatus =
  | "NOT_STARTED"
  | "STARTED"
  | "REVIEW_READY"
  | "STRONG_DAY";

export type HabitRecommendedAction =
  | "ADD_TRANSACTION"
  | "REVIEW_TODAY"
  | "ASK_ASSISTANT"
  | "CONTINUE_TRACKING";

export type HabitMessageTone = "NEUTRAL" | "NUDGE" | "GOOD" | "READY";

export type HabitMessageDetail = {
  title: string;
  description: string;
  tone: HabitMessageTone;
};

export type HabitSummaryResult = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  monthActiveDays: number;
  weeklyActiveDays: number;
  currentStreakDays: number;
  hasTransactionToday: boolean;
  transactionsToday: number;
  todayTransactionCount: number;
  expenseTransactionsToday: number;
  todayExpenseCount: number;
  todayIncomeCount: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  last7DaysTransactionCount: number;
  last7DaysExpense: string;
  last7DaysTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  completionStatus: HabitCompletionStatus;
  recommendedAction: HabitRecommendedAction;
  habitStatus: "NO_DATA" | "LIGHT" | "ACTIVE" | "STALE";
  habitMessage: string;
  habitMessageDetail: HabitMessageDetail;
};

type CategoryBucket = {
  name: string;
  amount: Prisma.Decimal;
  transactionCount: number;
};

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(parts: HabitDateParts) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
}

function getZonedDateParts(date: Date): HabitDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: HABIT_TIME_ZONE,
    year: "numeric"
  }).formatToParts(date);

  const valueByType = new Map(
    parts.map((part) => [part.type, Number(part.value)])
  );

  return {
    year: valueByType.get("year") ?? date.getUTCFullYear(),
    month: valueByType.get("month") ?? date.getUTCMonth() + 1,
    day: valueByType.get("day") ?? date.getUTCDate()
  };
}

function getZonedDateKey(date: Date) {
  return toDateKey(getZonedDateParts(date));
}

function getMonthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function dateKeyToUtcDayIndex(dateKey: string) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");

  return Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) /
      (1000 * 60 * 60 * 24)
  );
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + dayOffset)
  );

  return `${date.getUTCFullYear()}-${padDatePart(
    date.getUTCMonth() + 1
  )}-${padDatePart(date.getUTCDate())}`;
}

function getDaysBetweenDateKeys(startDateKey: string, endDateKey: string) {
  return dateKeyToUtcDayIndex(endDateKey) - dateKeyToUtcDayIndex(startDateKey);
}

function getNextMonthStartKey(monthStartKey: string) {
  const [year = "0", month = "1"] = monthStartKey.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month), 1));

  return `${date.getUTCFullYear()}-${padDatePart(
    date.getUTCMonth() + 1
  )}-01`;
}

function dateKeyToJakartaStartUtc(dateKey: string) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      -JAKARTA_UTC_OFFSET_HOURS,
      0,
      0,
      0
    )
  );
}

export function getHabitTransactionRange(referenceDate = new Date()) {
  const referenceParts = getZonedDateParts(referenceDate);
  const todayKey = toDateKey(referenceParts);
  const monthStartKey = `${referenceParts.year}-${padDatePart(
    referenceParts.month
  )}-01`;
  const last7DaysStartKey = shiftDateKey(todayKey, -6);
  const startKey =
    last7DaysStartKey < monthStartKey ? last7DaysStartKey : monthStartKey;

  return {
    startDate: dateKeyToJakartaStartUtc(startKey),
    endDate: dateKeyToJakartaStartUtc(getNextMonthStartKey(monthStartKey))
  };
}

function summarizeLast7DaysTopCategory(transactions: HabitTransactionInput[]) {
  const buckets = new Map<string, CategoryBucket>();

  for (const transaction of transactions) {
    if (transaction.type !== TransactionType.EXPENSE) {
      continue;
    }

    const categoryName = transaction.category.name;
    const existingBucket = buckets.get(categoryName);

    if (existingBucket) {
      existingBucket.amount = existingBucket.amount.plus(transaction.amount);
      existingBucket.transactionCount += 1;
      continue;
    }

    buckets.set(categoryName, {
      name: categoryName,
      amount: toDecimal(transaction.amount),
      transactionCount: 1
    });
  }

  return (
    [...buckets.values()]
      .sort((firstCategory, secondCategory) =>
        secondCategory.amount.comparedTo(firstCategory.amount)
      )
      .map((category) => ({
        name: category.name,
        amount: decimalToString(category.amount),
        transactionCount: category.transactionCount
      }))[0] ?? null
  );
}

function calculateCurrentStreak(input: {
  activeDateKeys: Set<string>;
  todayKey: string;
}) {
  if (!input.activeDateKeys.has(input.todayKey)) {
    return 0;
  }

  let streak = 0;
  let cursorKey = input.todayKey;

  while (input.activeDateKeys.has(cursorKey)) {
    streak += 1;
    cursorKey = shiftDateKey(cursorKey, -1);
  }

  return streak;
}

function buildCompletionStatus(input: {
  transactionsToday: number;
  weeklyActiveDays: number;
}): HabitCompletionStatus {
  if (input.transactionsToday <= 0) {
    return "NOT_STARTED";
  }

  if (input.transactionsToday >= 5) {
    return "STRONG_DAY";
  }

  if (input.transactionsToday >= 2 || input.weeklyActiveDays >= 3) {
    return "REVIEW_READY";
  }

  return "STARTED";
}

function buildRecommendedAction(
  completionStatus: HabitCompletionStatus
): HabitRecommendedAction {
  if (completionStatus === "NOT_STARTED") {
    return "ADD_TRANSACTION";
  }

  if (completionStatus === "STARTED") {
    return "CONTINUE_TRACKING";
  }

  if (completionStatus === "REVIEW_READY") {
    return "REVIEW_TODAY";
  }

  return "ASK_ASSISTANT";
}

function buildHabitStatus(input: {
  monthlyTransactionCount: number;
  monthActiveDays: number;
  currentMonthDaysElapsed: number;
  daysSinceLastTransaction: number | null;
}): HabitSummaryResult["habitStatus"] {
  if (input.monthlyTransactionCount === 0) {
    return "NO_DATA";
  }

  if (
    input.daysSinceLastTransaction !== null &&
    input.daysSinceLastTransaction >= 3
  ) {
    return "STALE";
  }

  if (
    input.monthActiveDays <=
    Math.max(2, Math.floor(input.currentMonthDaysElapsed * 0.25))
  ) {
    return "LIGHT";
  }

  return "ACTIVE";
}

function buildHabitMessageDetail(input: {
  completionStatus: HabitCompletionStatus;
  transactionsToday: number;
  todayExpenseCount: number;
  currentStreakDays: number;
  weeklyActiveDays: number;
  daysSinceLastTransaction: number | null;
  habitStatus: HabitSummaryResult["habitStatus"];
}): HabitMessageDetail {
  if (input.completionStatus === "NOT_STARTED") {
    if (
      input.daysSinceLastTransaction !== null &&
      input.daysSinceLastTransaction > 1
    ) {
      return {
        title: "Belum ada catatan hari ini.",
        description:
          "Tidak apa-apa kalau sempat terlewat. Catat 1 transaksi kecil dulu agar insight hari ini mulai terbentuk.",
        tone: "NUDGE"
      };
    }

    return {
      title: "Belum ada catatan hari ini.",
      description:
        "Catat 1 transaksi kecil dulu agar insight hari ini mulai terbentuk.",
      tone: "NUDGE"
    };
  }

  if (input.completionStatus === "STARTED") {
    return {
      title: `Hari ini kamu sudah mencatat ${input.transactionsToday} transaksi.`,
      description:
        "Data hari ini mulai terbentuk. Lanjutkan kalau ada transaksi lain.",
      tone: "GOOD"
    };
  }

  if (input.completionStatus === "STRONG_DAY") {
    return {
      title: "Catatan hari ini sudah kuat.",
      description:
        "Data hari ini sudah cukup bagus untuk dibahas dengan Asisten Sakuin.",
      tone: "READY"
    };
  }

  if (input.currentStreakDays >= 2) {
    return {
      title: `Kamu sudah mencatat ${input.currentStreakDays} hari berturut-turut.`,
      description:
        "Data hari ini mulai cukup untuk review singkat. Tandai lengkap kalau tidak ada transaksi yang terlewat.",
      tone: "READY"
    };
  }

  if (input.weeklyActiveDays >= 3) {
    return {
      title: "Data minggu ini mulai cukup untuk dianalisis.",
      description:
        "Review 30 detik dulu agar dashboard tetap akurat.",
      tone: "READY"
    };
  }

  return {
    title: `Hari ini kamu sudah mencatat ${input.transactionsToday} transaksi.`,
    description:
      input.todayExpenseCount > 0
        ? `${input.todayExpenseCount} pengeluaran hari ini sudah tercatat. Review singkat dulu kalau tidak ada yang terlewat.`
        : "Data hari ini mulai cukup untuk review singkat.",
    tone: "READY"
  };
}

function buildLegacyHabitMessage(input: {
  habitStatus: HabitSummaryResult["habitStatus"];
  habitMessageDetail: HabitMessageDetail;
  daysSinceLastTransaction: number | null;
}) {
  if (input.habitStatus === "NO_DATA") {
    return "Belum ada transaksi bulan ini. Catat beberapa transaksi pertama agar insight Sakuin mulai terasa berguna.";
  }

  if (
    input.habitStatus === "STALE" &&
    input.daysSinceLastTransaction !== null
  ) {
    return `Transaksi terakhir tercatat ${input.daysSinceLastTransaction} hari lalu. Catat transaksi terbaru agar insight bulan ini tetap akurat.`;
  }

  if (input.habitStatus === "LIGHT") {
    return "Data bulan ini masih ringan. Catat transaksi kecil yang sering terlewat supaya pola bocor uang lebih mudah terlihat.";
  }

  return input.habitMessageDetail.description;
}

export function buildHabitSummary(input: {
  transactions: HabitTransactionInput[];
  referenceDate: Date;
}): HabitSummaryResult {
  const { transactions, referenceDate } = input;
  const referenceParts = getZonedDateParts(referenceDate);
  const todayKey = toDateKey(referenceParts);
  const currentMonthKey = getMonthKeyFromDateKey(todayKey);
  const currentMonthDaysElapsed = Math.max(referenceParts.day, 1);
  const last7DaysStartKey = shiftDateKey(todayKey, -6);

  const observedTransactions = transactions.filter((transaction) => {
    return getZonedDateKey(transaction.date) <= todayKey;
  });

  const monthTransactions = observedTransactions.filter((transaction) => {
    const transactionDateKey = getZonedDateKey(transaction.date);

    return getMonthKeyFromDateKey(transactionDateKey) === currentMonthKey;
  });

  const activeDateKeys = new Set<string>();

  for (const transaction of monthTransactions) {
    activeDateKeys.add(getZonedDateKey(transaction.date));
  }

  const todayTransactions = monthTransactions.filter((transaction) => {
    return getZonedDateKey(transaction.date) === todayKey;
  });

  const last7DaysTransactions = observedTransactions.filter((transaction) => {
    const transactionDateKey = getZonedDateKey(transaction.date);

    return transactionDateKey >= last7DaysStartKey && transactionDateKey <= todayKey;
  });

  const last7DaysActiveKeys = new Set(
    last7DaysTransactions.map((transaction) => getZonedDateKey(transaction.date))
  );

  const latestTransaction = [...observedTransactions].sort((firstItem, secondItem) => {
    const dateDifference =
      secondItem.date.getTime() - firstItem.date.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return secondItem.createdAt.getTime() - firstItem.createdAt.getTime();
  })[0];

  const daysSinceLastTransaction = latestTransaction
    ? Math.max(
        getDaysBetweenDateKeys(getZonedDateKey(latestTransaction.date), todayKey),
        0
      )
    : null;

  const last7DaysExpense = last7DaysTransactions.reduce(
    (total, transaction) =>
      transaction.type === TransactionType.EXPENSE
        ? total.plus(transaction.amount)
        : total,
    toDecimal(0)
  );

  const monthActiveDays = activeDateKeys.size;
  const currentMonthCompletenessPercent = Number(
    ((monthActiveDays / currentMonthDaysElapsed) * 100).toFixed(1)
  );
  const todayExpenseCount = todayTransactions.filter(
    (transaction) => transaction.type === TransactionType.EXPENSE
  ).length;
  const todayIncomeCount = todayTransactions.filter(
    (transaction) => transaction.type === TransactionType.INCOME
  ).length;
  const currentStreakDays = calculateCurrentStreak({
    activeDateKeys,
    todayKey
  });
  const weeklyActiveDays = last7DaysActiveKeys.size;
  const completionStatus = buildCompletionStatus({
    transactionsToday: todayTransactions.length,
    weeklyActiveDays
  });
  const recommendedAction = buildRecommendedAction(completionStatus);
  const habitStatus = buildHabitStatus({
    monthlyTransactionCount: monthTransactions.length,
    monthActiveDays,
    currentMonthDaysElapsed,
    daysSinceLastTransaction
  });
  const habitMessageDetail = buildHabitMessageDetail({
    completionStatus,
    transactionsToday: todayTransactions.length,
    todayExpenseCount,
    currentStreakDays,
    weeklyActiveDays,
    daysSinceLastTransaction,
    habitStatus
  });

  return {
    currentMonthTransactionDays: monthActiveDays,
    currentMonthDaysElapsed,
    currentMonthCompletenessPercent,
    monthActiveDays,
    weeklyActiveDays,
    currentStreakDays,
    hasTransactionToday: todayTransactions.length > 0,
    transactionsToday: todayTransactions.length,
    todayTransactionCount: todayTransactions.length,
    expenseTransactionsToday: todayExpenseCount,
    todayExpenseCount,
    todayIncomeCount,
    lastTransactionDate: latestTransaction
      ? latestTransaction.date.toISOString()
      : null,
    daysSinceLastTransaction,
    last7DaysTransactionCount: last7DaysTransactions.length,
    last7DaysExpense: decimalToString(last7DaysExpense),
    last7DaysTopExpenseCategory:
      summarizeLast7DaysTopCategory(last7DaysTransactions),
    completionStatus,
    recommendedAction,
    habitStatus,
    habitMessage: buildLegacyHabitMessage({
      habitStatus,
      habitMessageDetail,
      daysSinceLastTransaction
    }),
    habitMessageDetail
  };
}
