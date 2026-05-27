import { TransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildHabitSummary,
  getHabitTransactionRange,
  type HabitTransactionInput
} from "../src/modules/finance/habit-engine.js";

function createHabitTransaction(input: {
  type?: TransactionType;
  amount?: string;
  date: string;
  categoryName?: string;
}): HabitTransactionInput {
  const date = new Date(input.date);

  return {
    type: input.type ?? TransactionType.EXPENSE,
    amount: input.amount ?? "10000",
    date,
    createdAt: date,
    category: {
      name: input.categoryName ?? "Makanan"
    }
  };
}

describe("habit engine", () => {
  it("menghasilkan status ringan ketika user belum mencatat transaksi", () => {
    const summary = buildHabitSummary({
      transactions: [],
      referenceDate: new Date("2026-05-20T12:00:00.000Z")
    });

    expect(summary.currentMonthTransactionDays).toBe(0);
    expect(summary.monthActiveDays).toBe(0);
    expect(summary.weeklyActiveDays).toBe(0);
    expect(summary.currentStreakDays).toBe(0);
    expect(summary.hasTransactionToday).toBe(false);
    expect(summary.todayTransactionCount).toBe(0);
    expect(summary.completionStatus).toBe("NOT_STARTED");
    expect(summary.recommendedAction).toBe("ADD_TRANSACTION");
    expect(summary.habitStatus).toBe("NO_DATA");
    expect(summary.habitMessageDetail.title).toBe(
      "Belum ada catatan hari ini."
    );
    expect(summary.habitMessageDetail.description).toContain(
      "Catat 1 transaksi kecil"
    );
  });

  it("menghitung transaksi hari ini, streak, dan active days berbasis kalender Indonesia", () => {
    const summary = buildHabitSummary({
      transactions: [
        createHabitTransaction({
          date: "2026-05-18T03:00:00.000Z",
          amount: "15000"
        }),
        createHabitTransaction({
          date: "2026-05-19T03:00:00.000Z",
          amount: "20000"
        }),
        createHabitTransaction({
          date: "2026-05-20T01:00:00.000Z",
          amount: "25000"
        }),
        createHabitTransaction({
          type: TransactionType.INCOME,
          date: "2026-05-20T02:00:00.000Z",
          amount: "100000",
          categoryName: "Bonus"
        })
      ],
      referenceDate: new Date("2026-05-20T12:00:00.000Z")
    });

    expect(summary.currentMonthTransactionDays).toBe(3);
    expect(summary.monthActiveDays).toBe(3);
    expect(summary.weeklyActiveDays).toBe(3);
    expect(summary.currentStreakDays).toBe(3);
    expect(summary.hasTransactionToday).toBe(true);
    expect(summary.transactionsToday).toBe(2);
    expect(summary.todayTransactionCount).toBe(2);
    expect(summary.expenseTransactionsToday).toBe(1);
    expect(summary.todayExpenseCount).toBe(1);
    expect(summary.todayIncomeCount).toBe(1);
    expect(summary.last7DaysExpense).toBe("60000.00");
    expect(summary.last7DaysTopExpenseCategory).toMatchObject({
      name: "Makanan",
      amount: "60000.00",
      transactionCount: 3
    });
    expect(summary.completionStatus).toBe("REVIEW_READY");
    expect(summary.recommendedAction).toBe("REVIEW_TODAY");
    expect(summary.habitMessageDetail.title).toContain(
      "3 hari berturut-turut"
    );
  });

  it("menganggap transaksi setelah jam 17 UTC sebagai hari berikutnya di Indonesia", () => {
    const summary = buildHabitSummary({
      transactions: [
        createHabitTransaction({
          date: "2026-05-19T18:30:00.000Z",
          amount: "12000"
        })
      ],
      referenceDate: new Date("2026-05-20T01:00:00.000Z")
    });

    expect(summary.hasTransactionToday).toBe(true);
    expect(summary.todayTransactionCount).toBe(1);
    expect(summary.currentStreakDays).toBe(1);
    expect(summary.daysSinceLastTransaction).toBe(0);
    expect(summary.completionStatus).toBe("STARTED");
  });

  it("memberi status strong day tanpa gamification berlebihan", () => {
    const summary = buildHabitSummary({
      transactions: Array.from({ length: 5 }, (_, index) =>
        createHabitTransaction({
          date: `2026-05-20T0${index}:00:00.000Z`,
          amount: "10000"
        })
      ),
      referenceDate: new Date("2026-05-20T12:00:00.000Z")
    });

    expect(summary.completionStatus).toBe("STRONG_DAY");
    expect(summary.recommendedAction).toBe("ASK_ASSISTANT");
    expect(summary.habitMessageDetail.title).toBe(
      "Catatan hari ini sudah kuat."
    );
  });

  it("menghasilkan range query yang aman untuk habit snapshot Indonesia", () => {
    const range = getHabitTransactionRange(
      new Date("2026-05-20T01:00:00.000Z")
    );

    expect(range.startDate.toISOString()).toBe("2026-04-30T17:00:00.000Z");
    expect(range.endDate.toISOString()).toBe("2026-05-31T17:00:00.000Z");
  });
});
