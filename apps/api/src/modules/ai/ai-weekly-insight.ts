import { prisma } from "../../db/prisma.js";
import { sendGenericPushNotification } from "../reminders/reminder.service.js";
import {
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
import { createGeminiTextProvider } from "./ai.provider.js";

const WEEKLY_AI_REPLY_MAX_CHARS = 6000;

function normalizeWeeklyAiReply(text: string) {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, WEEKLY_AI_REPLY_MAX_CHARS);
}

function buildWeeklyInsightPrompt(
  userName: string,
  transactions: any[],
  context: AiFinancialContext
) {
  const expenseSum = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const incomeSum = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const categoryExpenses = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((acc: Record<string, number>, transaction) => {
      const categoryName = transaction.category?.name || "Lainnya";
      acc[categoryName] =
        (acc[categoryName] || 0) + Number(transaction.amount);
      return acc;
    }, {});

  const sortedCategories = Object.entries(categoryExpenses)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `- ${name}: Rp ${amount.toLocaleString("id-ID")}`)
    .join("\n");

  return `
Halo Gemini,
Berikan saran keuangan mingguan (Weekly Financial Insight) untuk pengguna bernama ${userName}.
Berikut adalah rangkuman keuangannya dalam 7 hari terakhir:
- Total Pengeluaran: Rp ${expenseSum.toLocaleString("id-ID")}
- Total Pemasukan: Rp ${incomeSum.toLocaleString("id-ID")}
- Pengeluaran per Kategori:
${sortedCategories || "Tidak ada transaksi pengeluaran."}

Context Keuangan Saat Ini:
- Safe Balance Limit: Rp ${Number(context.safeBalanceLimit).toLocaleString("id-ID")}
- Sisa Safe-to-Spend: Rp ${Number(context.safeToSpend.availableToSpend).toLocaleString("id-ID")}
- Progress Budget Kategori Bulanan: ${JSON.stringify(context.currentMonth.topExpenseCategories)}

Tugasmu:
1. Berikan evaluasi singkat (maks 3-4 kalimat) mengenai pengeluaran minggu ini (misalnya jika ada kategori yang terlalu dominan atau jika pengeluaran melebihi pemasukan).
2. Berikan 2 tips/tindakan hemat yang konkrit, spesifik, dan praktis untuk minggu depan berdasarkan kategori pengeluaran terbesarnya.
3. Gunakan nada bicara yang bersahabat, mendukung (tidak menghakimi), dan profesional dalam Bahasa Indonesia.

Format respons kamu harus berupa string teks markdown yang rapi yang siap ditampilkan ke pengguna.
`;
}

export async function generateWeeklyProactiveInsight(): Promise<{
  processedUsers: number;
  insightsGenerated: number;
}> {
  const users = await prisma.user.findMany({
    include: {
      pushSubscriptions: true
    }
  });

  let processedUsers = 0;
  let insightsGenerated = 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const user of users) {
    processedUsers++;

    try {
      const weeklyTransactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: oneWeekAgo }
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              icon: true,
              color: true
            }
          }
        }
      });

      if (weeklyTransactions.length === 0) {
        continue;
      }

      const context = await getAiFinancialContext(user.id);
      const provider = createGeminiTextProvider();
      const prompt = buildWeeklyInsightPrompt(
        user.name,
        weeklyTransactions,
        context
      );

      const result = await provider.generateText({
        systemInstruction:
          "Kamu adalah Asisten Finansial Sakuin yang proaktif dan memberikan saran mingguan yang bersahabat dan praktis.",
        prompt,
        model: "gemini-1.5-flash",
        maxOutputTokens: 2000,
        temperature: 0.5
      });

      const aiReply =
        normalizeWeeklyAiReply(result.text) ||
        "Tetap pantau pengeluaranmu minggu depan agar selalu sesuai anggaran ya!";

      const totalExpense = weeklyTransactions
        .filter((transaction) => transaction.type === "EXPENSE")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      const topCategory =
        weeklyTransactions
          .filter((transaction) => transaction.type === "EXPENSE")
          .reduce((acc: { name: string; amount: number }[], transaction) => {
            const categoryName = transaction.category?.name || "Lainnya";
            const match = acc.find((item) => item.name === categoryName);

            if (match) {
              match.amount += Number(transaction.amount);
            } else {
              acc.push({
                name: categoryName,
                amount: Number(transaction.amount)
              });
            }

            return acc;
          }, [])
          .sort((a, b) => b.amount - a.amount)[0]?.name || "N/A";

      const cards = [
        {
          label: "Pengeluaran Minggu Ini",
          value: `Rp ${totalExpense.toLocaleString("id-ID")}`
        },
        { label: "Kategori Terbesar", value: topCategory },
        {
          label: "Safe-to-Spend",
          value: `Rp ${Number(context.safeToSpend.availableToSpend).toLocaleString("id-ID")}`
        }
      ];

      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: "assistant",
          content: aiReply,
          intent: "SPENDING_ANALYSIS",
          cards: cards as any,
          suggestions: [
            "Bagaimana cara menghemat minggu ini?",
            "Lihat pengeluaran bulan ini",
            "Target tabungan saya masih realistis?"
          ] as any
        }
      });

      insightsGenerated++;

      if (user.pushSubscriptions.length > 0) {
        await sendGenericPushNotification(user.id, {
          title: "Saran Finansial Mingguan",
          body: `Halo ${user.name}, saran keuangan barumu sudah siap! Intip tips hemat khusus untukmu minggu ini.`,
          url: "/asisten",
          tag: "sakuin-weekly-insight"
        });
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "ai.weekly_insight_failed",
          errorName: error instanceof Error ? error.name : "UnknownError",
          timestamp: new Date().toISOString()
        })
      );
    }
  }

  return {
    processedUsers,
    insightsGenerated
  };
}
