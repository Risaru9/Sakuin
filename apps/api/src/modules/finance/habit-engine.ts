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

export type HabitExpenseTrend = "UP" | "DOWN" | "STABLE" | "NO_DATA";

export type HabitDayRhythmItem = {
  date: string;
  day: "Sen" | "Sel" | "Rab" | "Kam" | "Jum" | "Sab" | "Min";
  hasTransaction: boolean;
  transactionCount: number;
  income: string;
  expense: string;
  isToday: boolean;
  isFuture: boolean;
};

export type HabitSummaryResult = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  monthActiveDays: number;
  weeklyActiveDays: number;
  currentWeekActiveDays: number;
  currentWeekExpense: string;
  previousWeekExpense: string;
  currentWeekExpenseTrend: HabitExpenseTrend;
  currentWeekTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  dayRhythm: HabitDayRhythmItem[];
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

const DAY_LABELS_BY_UTC_DAY = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab"
] as const;

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

function getDayIndex(dateKey: string) {
  const [year = "0", month = "1", day = "1"] = dateKey.split("-");
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  ).getUTCDay();
}

function getMondayBasedDayOffset(dateKey: string) {
  return (getDayIndex(dateKey) + 6) % 7;
}

function getWeekStartKey(dateKey: string) {
  return shiftDateKey(dateKey, -getMondayBasedDayOffset(dateKey));
}

function getDayLabel(dateKey: string): HabitDayRhythmItem["day"] {
  return DAY_LABELS_BY_UTC_DAY[getDayIndex(dateKey)];
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
  const currentWeekStartKey = getWeekStartKey(todayKey);
  const previousWeekStartKey = shiftDateKey(currentWeekStartKey, -7);
  const startKey = [
    last7DaysStartKey,
    monthStartKey,
    previousWeekStartKey
  ].sort()[0];

  return {
    startDate: dateKeyToJakartaStartUtc(startKey),
    endDate: dateKeyToJakartaStartUtc(getNextMonthStartKey(monthStartKey))
  };
}

function summarizeTopExpenseCategory(transactions: HabitTransactionInput[]) {
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

function summarizeExpense(transactions: HabitTransactionInput[]) {
  return transactions.reduce(
    (total, transaction) =>
      transaction.type === TransactionType.EXPENSE
        ? total.plus(transaction.amount)
        : total,
    toDecimal(0)
  );
}

function buildExpenseTrend(input: {
  currentExpense: Prisma.Decimal;
  previousExpense: Prisma.Decimal;
}): HabitExpenseTrend {
  if (input.previousExpense.lessThanOrEqualTo(0)) {
    return "NO_DATA";
  }

  const deltaPercent = input.currentExpense
    .minus(input.previousExpense)
    .dividedBy(input.previousExpense)
    .times(100)
    .toNumber();

  if (deltaPercent >= 10) {
    return "UP";
  }

  if (deltaPercent <= -10) {
    return "DOWN";
  }

  return "STABLE";
}

function buildDayRhythm(input: {
  transactions: HabitTransactionInput[];
  weekStartKey: string;
  todayKey: string;
}): HabitDayRhythmItem[] {
  const buckets = new Map<
    string,
    {
      income: Prisma.Decimal;
      expense: Prisma.Decimal;
      transactionCount: number;
    }
  >();

  for (const transaction of input.transactions) {
    const transactionDateKey = getZonedDateKey(transaction.date);
    const current = buckets.get(transactionDateKey) ?? {
      income: toDecimal(0),
      expense: toDecimal(0),
      transactionCount: 0
    };

    if (transaction.type === TransactionType.INCOME) {
      current.income = current.income.plus(transaction.amount);
    }

    if (transaction.type === TransactionType.EXPENSE) {
      current.expense = current.expense.plus(transaction.amount);
    }

    current.transactionCount += 1;
    buckets.set(transactionDateKey, current);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = shiftDateKey(input.weekStartKey, index);
    const bucket = buckets.get(dateKey) ?? {
      income: toDecimal(0),
      expense: toDecimal(0),
      transactionCount: 0
    };

    return {
      date: dateKey,
      day: getDayLabel(dateKey),
      hasTransaction: bucket.transactionCount > 0,
      transactionCount: bucket.transactionCount,
      income: decimalToString(bucket.income),
      expense: decimalToString(bucket.expense),
      isToday: dateKey === input.todayKey,
      isFuture: dateKey > input.todayKey
    };
  });
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
  const currentWeekStartKey = getWeekStartKey(todayKey);
  const currentWeekEndKey = shiftDateKey(currentWeekStartKey, 6);
  const previousWeekStartKey = shiftDateKey(currentWeekStartKey, -7);
  const previousWeekEndKey = shiftDateKey(currentWeekStartKey, -1);

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

  const currentWeekTransactions = observedTransactions.filter((transaction) => {
    const transactionDateKey = getZonedDateKey(transaction.date);

    return (
      transactionDateKey >= currentWeekStartKey &&
      transactionDateKey <= currentWeekEndKey
    );
  });

  const previousWeekTransactions = observedTransactions.filter((transaction) => {
    const transactionDateKey = getZonedDateKey(transaction.date);

    return (
      transactionDateKey >= previousWeekStartKey &&
      transactionDateKey <= previousWeekEndKey
    );
  });

  const last7DaysActiveKeys = new Set(
    last7DaysTransactions.map((transaction) => getZonedDateKey(transaction.date))
  );

  const currentWeekActiveKeys = new Set(
    currentWeekTransactions.map((transaction) => getZonedDateKey(transaction.date))
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

  const last7DaysExpense = summarizeExpense(last7DaysTransactions);
  const currentWeekExpense = summarizeExpense(currentWeekTransactions);
  const previousWeekExpense = summarizeExpense(previousWeekTransactions);

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
  const currentWeekActiveDays = currentWeekActiveKeys.size;
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
    currentWeekActiveDays,
    currentWeekExpense: decimalToString(currentWeekExpense),
    previousWeekExpense: decimalToString(previousWeekExpense),
    currentWeekExpenseTrend: buildExpenseTrend({
      currentExpense: currentWeekExpense,
      previousExpense: previousWeekExpense
    }),
    currentWeekTopExpenseCategory:
      summarizeTopExpenseCategory(currentWeekTransactions),
    dayRhythm: buildDayRhythm({
      transactions: currentWeekTransactions,
      weekStartKey: currentWeekStartKey,
      todayKey
    }),
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
      summarizeTopExpenseCategory(last7DaysTransactions),
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
