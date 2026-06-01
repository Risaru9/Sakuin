import { buildConversationHistoryText } from "./ai-chat-history.js";
import {
  buildFinancialScenarioPromptContext,
  type FinancialScenarioAnalysis
} from "./ai-financial-scenario.js";
import {
  buildPurchaseDecisionPromptContext,
  type PurchaseDecisionAnalysis
} from "./ai-purchase-decision.js";
import {
  buildFinancialHealthSnapshot,
  buildSpendingPatternInsight,
  buildConsultantActionPlan,
  formatSafeToSpendStatus,
  formatSpendingPaceStatus,
  formatRatio,
  formatRupiah,
  formatHabitStatus,
  formatFinancialCheckupStatus,
  formatFinancialCheckupPriority,
  formatChangePercent,
  type FinancialHealthSnapshot,
  type SpendingPatternInsight,
  type ConsultantActionPlan
} from "./ai-response-builder.js";
import {
  buildFinancialCheckup
} from "../finance/financial-checkup.js";
import type { AiFinancialContext } from "./ai-financial-context.js";
import type {
  AiChatHistoryMessage,
  AiChatResponse,
  AiIntent
} from "./ai.types.js";

export function buildSafeToSpendPromptContext(context: AiFinancialContext) {
  const safeToSpend = context.safeToSpend;

  return [
    `Status safe-to-spend: ${formatSafeToSpendStatus(safeToSpend.status)}`,
    `Status ritme pengeluaran: ${formatSpendingPaceStatus(
      safeToSpend.spendingPaceStatus
    )}`,
    `Sisa aman untuk dipakai bulan ini: ${formatRupiah(
      safeToSpend.availableToSpend
    )}`,
    `Batas harian aman: ${
      safeToSpend.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(safeToSpend.suggestedDailyLimit)
    }`,
    `Sisa hari periode berjalan: ${safeToSpend.remainingDays}`,
    `Rasio pengeluaran terhadap pemasukan: ${formatRatio(
      safeToSpend.expenseToIncomeRatio
    )}`,
    `Progress bulan berjalan: ${safeToSpend.monthProgressPercent}%`,
    `Pace pengeluaran terhadap pemasukan: ${
      safeToSpend.expensePacePercent === null
        ? "Belum bisa dinilai"
        : `${safeToSpend.expensePacePercent}%`
    }`,
    `Proyeksi pengeluaran akhir bulan: ${formatRupiah(
      safeToSpend.projectedMonthEndExpense
    )}`,
    `Proyeksi cashflow akhir bulan: ${formatRupiah(
      safeToSpend.projectedNetCashflow
    )}`,
    `Kategori risiko utama: ${
      safeToSpend.topRiskCategoryName ?? "Belum ada"
    }`,
    `Nominal kategori risiko utama: ${formatRupiah(
      safeToSpend.topRiskCategoryAmount
    )}`,
    `Alasan safe-to-spend: ${safeToSpend.reason}`,
    `Aksi safe-to-spend: ${safeToSpend.action}`,
    `Warning safe-to-spend: ${
      safeToSpend.warnings.length > 0
        ? safeToSpend.warnings.join("; ")
        : "Tidak ada warning besar"
    }`
  ].join("\n");
}

export function buildHabitPromptContext(context: AiFinancialContext) {
  const habit = context.habit;

  if (!habit) {
    return "Habit snapshot belum tersedia.";
  }

  return [
    `Status habit pencatatan: ${formatHabitStatus(habit.habitStatus)}`,
    `Hari dengan transaksi bulan ini: ${habit.currentMonthTransactionDays} dari ${habit.currentMonthDaysElapsed} hari berjalan`,
    `Kelengkapan hari pencatatan bulan ini: ${habit.currentMonthCompletenessPercent}%`,
    `Status review harian: ${habit.completionStatus}`,
    `Aksi habit yang disarankan: ${habit.recommendedAction}`,
    `Transaksi hari ini: ${habit.transactionsToday}`,
    `Transaksi expense hari ini: ${habit.expenseTransactionsToday}`,
    `Transaksi income hari ini: ${habit.todayIncomeCount}`,
    `Streak pencatatan saat ini: ${habit.currentStreakDays} hari`,
    `Hari aktif minggu ini: ${habit.weeklyActiveDays}`,
    `Tanggal transaksi terakhir: ${
      habit.lastTransactionDate ?? "Belum ada"
    }`,
    `Jarak dari transaksi terakhir: ${
      habit.daysSinceLastTransaction === null
        ? "Belum ada transaksi"
        : `${habit.daysSinceLastTransaction} hari`
    }`,
    `Transaksi 7 hari terakhir: ${habit.last7DaysTransactionCount}`,
    `Expense 7 hari terakhir: ${formatRupiah(habit.last7DaysExpense)}`,
    `Kategori expense terbesar 7 hari terakhir: ${
      habit.last7DaysTopExpenseCategory
        ? `${habit.last7DaysTopExpenseCategory.name} (${formatRupiah(
            habit.last7DaysTopExpenseCategory.amount
          )}, ${habit.last7DaysTopExpenseCategory.transactionCount} transaksi)`
        : "Belum ada"
    }`,
    `Pesan habit: ${habit.habitMessage}`,
    `Pesan habit harian: ${habit.habitMessageDetail.title} ${habit.habitMessageDetail.description}`
  ].join("\n");
}

export function buildFinancialCheckupPromptContext(context: AiFinancialContext) {
  const checkup = buildFinancialCheckup(context);

  return [
    `Status checkup: ${formatFinancialCheckupStatus(checkup.status)}`,
    `Prioritas checkup: ${formatFinancialCheckupPriority(checkup.priority)}`,
    `Judul checkup: ${checkup.title}`,
    `Headline checkup: ${checkup.headline}`,
    `Fokus kategori: ${checkup.focusCategoryName ?? "Belum ada"}`,
    `Nominal fokus kategori: ${formatRupiah(checkup.focusCategoryAmount)}`,
    `Alasan checkup: ${checkup.reason}`,
    `Aksi checkup: ${checkup.action}`,
    `Total pemasukan bulan ini: ${formatRupiah(checkup.metrics.totalIncome)}`,
    `Total pengeluaran bulan ini: ${formatRupiah(checkup.metrics.totalExpense)}`,
    `Cashflow bulan ini: ${formatRupiah(checkup.metrics.netCashflow)}`,
    `Rasio expense terhadap income: ${formatRatio(
      checkup.metrics.expenseToIncomeRatio
    )}`,
    `Perubahan expense dibanding bulan lalu: ${formatChangePercent(
      checkup.metrics.expenseChangePercent
    )}`,
    `Status safe-to-spend: ${formatSafeToSpendStatus(
      checkup.metrics.safeToSpendStatus
    )}`,
    `Ritme pengeluaran: ${formatSpendingPaceStatus(
      checkup.metrics.spendingPaceStatus
    )}`,
    `Sisa aman bulan ini: ${formatRupiah(checkup.metrics.availableToSpend)}`,
    `Limit harian aman: ${
      checkup.metrics.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(checkup.metrics.suggestedDailyLimit)
    }`,
    `Proyeksi cashflow akhir bulan: ${formatRupiah(
      checkup.metrics.projectedNetCashflow
    )}`,
    `Warning checkup: ${
      checkup.warnings.length > 0
        ? checkup.warnings.join("; ")
        : "Tidak ada warning besar"
    }`
  ].join("\n");
}

export function buildFinancialHealthPromptContext(snapshot: FinancialHealthSnapshot) {
  return [
    `Status kesehatan finansial: ${snapshot.status}`,
    `Rasio pengeluaran terhadap pemasukan: ${formatRatio(
      snapshot.expenseToIncomeRatio
    )}`,
    `Arus kas bersih bulan ini: ${formatRupiah(snapshot.netCashflow)}`,
    `Safe balance limit: ${formatRupiah(snapshot.safeBalanceLimit)}`,
    `Sisa ruang aman terhadap safe balance: ${formatRupiah(
      snapshot.availableUntilSafeLimit
    )}`,
    `Batas pengeluaran harian aman: ${
      snapshot.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(snapshot.suggestedDailyLimit)
    }`,
    `Alasan status: ${snapshot.reason}`,
    `Saran utama: ${snapshot.advice}`,
    `Sinyal risiko: ${
      snapshot.riskSignals.length > 0
        ? snapshot.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

export function buildSpendingPatternPromptContext(insight: SpendingPatternInsight) {
  return [
    `Status pola pengeluaran: ${insight.status}`,
    `Kategori prioritas kontrol: ${insight.topCategoryName ?? "Belum ada"}`,
    `Nominal kategori prioritas: ${formatRupiah(insight.topCategoryAmount)}`,
    `Frekuensi kategori prioritas: ${insight.topCategoryTransactionCount} transaksi`,
    `Porsi kategori terhadap total pengeluaran: ${insight.topCategoryExpenseShare}%`,
    `Porsi kategori terhadap pemasukan: ${insight.topCategoryIncomeShare}%`,
    `Nominal kategori yang sama bulan lalu: ${formatRupiah(
      insight.topCategoryPreviousAmount
    )}`,
    `Perubahan kategori prioritas dari bulan lalu: ${formatChangePercent(
      insight.topCategoryChangePercent
    )}`,
    `Perubahan total pengeluaran dari bulan lalu: ${formatChangePercent(
      insight.expenseChangePercent
    )}`,
    `Penyebab utama: ${insight.mainDriver}`,
    `Saran utama: ${insight.advice}`,
    `Sinyal risiko: ${
      insight.riskSignals.length > 0
        ? insight.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

export function buildConsultantActionPromptContext(plan: ConsultantActionPlan) {
  return [
    `Prioritas aksi: ${plan.priority}`,
    `Langkah utama: ${plan.mainAction}`,
    `Alasan: ${plan.reason}`,
    `Langkah berikutnya: ${plan.nextStep}`,
    `Fokus kategori: ${plan.focusCategoryName ?? "Tidak ada kategori spesifik"}`,
    `Guardrail: ${plan.guardrail}`,
    `Sinyal risiko pendukung: ${
      plan.riskSignals.length > 0
        ? plan.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

export function buildFinancialSystemInstruction() {
  return [
    "Kamu adalah Asisten Sakuin, financial helper untuk aplikasi pencatatan keuangan pribadi Sakuin.",
    "Jawab hanya topik keuangan pribadi di Sakuin: transaksi, pemasukan, pengeluaran, goals, budget, safe balance, cashflow, kesehatan finansial, pola pengeluaran, dan saran hemat ringan.",
    "Jawab pertanyaan user secara langsung. Jangan mengalihkan jawaban ke topik lain.",
    "Gunakan recent conversation context untuk memahami follow-up user seperti 'kalau 8 bulan gimana', 'kalau targetnya naik', 'lanjutannya apa', 'lanjutkan', atau 'terus apa'.",
    "Jika follow-up user merujuk pada konteks sebelumnya, pakai konteks sebelumnya selama masih relevan dengan keuangan pribadi.",
    "Jika user meminta lanjutan seperti 'lanjutannya apa' atau 'lanjutkan', lanjutkan pembahasan finansial dari konteks terakhir tanpa menganggapnya out-of-scope.",
    "Jika konteks sebelumnya tidak cukup untuk menjawab, minta data yang kurang secara singkat.",
    "Jika FINANCIAL HEALTH SNAPSHOT tersedia, gunakan itu untuk menjawab apakah kondisi user aman, waspada, atau berisiko.",
    "Jika SAFE-TO-SPEND SNAPSHOT tersedia, gunakan itu untuk menjawab apakah user masih aman belanja, sisa aman bulan ini, batas harian aman, apakah harus tahan pengeluaran, dan ritme pengeluaran.",
    "Jika FINANCIAL CHECKUP SNAPSHOT tersedia, gunakan itu untuk menjawab checkup keuangan, kesehatan keuangan, kondisi bulan ini sehat atau berisiko, fokus kategori, alasan, dan aksi utama.",
    "Jika SPENDING PATTERN INSIGHT tersedia, gunakan itu untuk menjawab user boros di mana, kategori mana yang perlu dikontrol, dan apa penyebab pengeluaran terasa naik.",
    "Jika HABIT SNAPSHOT tersedia, gunakan itu untuk menilai apakah data user sudah cukup lengkap atau perlu pencatatan rutin tambahan.",
    "Jika FINANCIAL SCENARIO ANALYSIS tersedia, gunakan analisis itu sebagai sumber utama untuk hitungan target, tenor, kebutuhan bulanan, rasio pendapatan, dan verdict risiko.",
    "Jika PURCHASE DECISION IMPACT tersedia, gunakan itu untuk menjawab apakah pembelian langsung seperti beli barang, jajan, atau belanja hari ini aman dilakukan.",
    "Untuk purchase decision, mulai dari keputusan deterministik: relatif aman, boleh terbatas, tahan dulu, atau belum bisa dinilai.",
    "Jika user memberi angka skenario seperti gaji, target harga, tenor, atau deadline, angka user mengalahkan data historis Sakuin untuk analisis skenario tersebut.",
    "Jangan menyimpulkan realistis hanya dari cashflow historis Sakuin. Untuk skenario pembelian/kredit, selalu cek rasio kebutuhan bulanan terhadap pendapatan skenario.",
    "Untuk tenor atau deadline range, bandingkan opsi yang paling berat dan paling ringan.",
    "Jika bunga kredit tidak diketahui, jelaskan bahwa hitungan masih pokok/estimasi kasar dan total biaya bisa lebih tinggi.",
    "Untuk skenario pembelian/kredit, jangan langsung menyuruh user membeli. Beri analisis risiko dan syarat aman.",
    "Jangan mengarang nominal, kategori, transaksi, tanggal, pemasukan, pengeluaran, atau goals yang tidak ada di context atau tidak disebut user.",
    "Boleh melakukan perhitungan sederhana dari angka yang ada di context atau angka yang user berikan.",
    "Jika user bertanya apakah target/goal/kondisi finansial realistis atau aman, wajib beri verdict eksplisit.",
    "Jika user bertanya boros di mana, jawab kategori prioritas kontrol terlebih dahulu.",
    "Jika user bertanya masih aman belanja berapa, boleh jajan berapa, atau batas harian aman, jawab dari SAFE-TO-SPEND SNAPSHOT terlebih dahulu.",
    "Jika user bertanya checkup keuangan, kesehatan keuangan, status keuangan, atau aman/berisiko, jawab dari FINANCIAL CHECKUP SNAPSHOT terlebih dahulu.",
    "Jika user bertanya pengeluaran naik karena apa, jelaskan kategori terbesar, porsinya, frekuensinya, dan tren dibanding bulan lalu jika tersedia.",
    "Untuk analisis kesehatan finansial, gunakan struktur: status, alasan singkat, angka utama, saran aksi.",
    "Untuk analisis pola pengeluaran, gunakan struktur: kategori prioritas, nominal/porsi, tren/frekuensi, saran aksi.",
    "Untuk analisis target/goal, gunakan struktur: verdict, hitungan singkat, risiko utama, saran aksi.",
    "Jika user memberi gaji, target nominal, dan jangka waktu, hitung kebutuhan menabung per bulan.",
    "Jika user tidak memberi target nominal atau deadline, jangan mengarang. Minta data yang kurang secara singkat.",
    "Jika context punya income, expense, dan net cashflow, pakai itu untuk menilai kemampuan menabung.",
    "Jika user memberi angka hipotetis, analisis angka tersebut sebagai skenario, tetapi jelaskan bahwa hasil bergantung pada konsistensi pencatatan dan pengeluaran aktual.",
    "Untuk habit pencatatan, dorong user dengan kalimat ringan dan praktis. Jangan membuat user merasa disalahkan karena belum mencatat.",
    "Jangan menyebut database, backend, JSON, model, API, prompt, atau detail teknis internal.",
    "Jangan memberi nasihat investasi, pinjaman, pajak, hukum, atau keputusan finansial profesional.",
    "Jangan menghakimi user. Hindari kalimat seperti gaji kamu kecil.",
    "Jika data belum cukup, katakan data belum cukup dan sebutkan data apa yang perlu ditambahkan.",
    "Jawaban harus dalam Bahasa Indonesia yang natural, jelas, dan praktis.",
    "Panjang jawaban harus adaptif: pertanyaan sederhana dijawab singkat, evaluasi dijawab medium, analisis lengkap/perbandingan/goal boleh lebih panjang dan detail.",
    "Gaya jawaban default mengikuti pola: PRIORITAS - ALASAN - AKSI, tetapi jangan dipaksakan kaku jika user hanya bertanya singkat atau sedang follow-up.",
    "Mulai jawaban dengan keputusan utama atau prioritas tindakan, bukan pembukaan panjang.",
    "Setelah prioritas, jelaskan alasan berdasarkan data yang tersedia dengan panjang yang sesuai pertanyaan user.",
    "Akhiri dengan 1 sampai 3 aksi konkret yang bisa dilakukan user hari ini.",
    "Hindari jawaban generik seperti 'kurangi pengeluaran' tanpa menyebut kategori, batas, atau langkah praktis jika data tersedia.",
    "Jangan memberi terlalu banyak opsi sekaligus. Pilih tindakan paling berdampak dan paling realistis.",
    "Jangan selalu memaksa jawaban pendek. Untuk pertanyaan kompleks, boleh memakai 4 sampai 7 paragraf pendek atau bullet ringkas jika itu membuat jawaban lebih jelas.",
    "Pastikan jawaban selesai dengan utuh dan tidak menggantung di tengah kalimat.",
    "Untuk pertanyaan analisis kompleks, boleh memakai bullet pendek jika membantu, tetapi tetap pilih poin yang paling relevan.",
    "Jangan gunakan format markdown seperti **bold**, heading markdown, atau tabel markdown. Gunakan teks biasa yang rapi.",
    "Jangan membuat tabel markdown."
  ].join("\n");
}

export function buildFinancialPrompt(input: {
  userMessage: string;
  intent: AiIntent;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
  purchaseDecision?: PurchaseDecisionAnalysis;
}) {
  const healthSnapshot = buildFinancialHealthSnapshot(input.context);
  const spendingInsight = buildSpendingPatternInsight(input.context);
  const actionPlan = buildConsultantActionPlan({
    healthSnapshot,
    spendingInsight
  });

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
    "FINANCIAL HEALTH SNAPSHOT:",
    buildFinancialHealthPromptContext(healthSnapshot),
    "",
    "FINANCIAL CHECKUP SNAPSHOT:",
    buildFinancialCheckupPromptContext(input.context),
    "",
    "SAFE-TO-SPEND SNAPSHOT:",
    buildSafeToSpendPromptContext(input.context),
    "",
    "SPENDING PATTERN INSIGHT:",
    buildSpendingPatternPromptContext(spendingInsight),
    "",
    "HABIT SNAPSHOT:",
    buildHabitPromptContext(input.context),
    "",
    "CONSULTANT ACTION PLAN:",
    buildConsultantActionPromptContext(actionPlan),
    "",
    "FINANCIAL SCENARIO ANALYSIS:",
    input.scenario
      ? buildFinancialScenarioPromptContext(input.scenario)
      : "Tidak ada skenario finansial terstruktur terdeteksi.",
    "",
    "PURCHASE DECISION IMPACT:",
    input.purchaseDecision
      ? buildPurchaseDecisionPromptContext(input.purchaseDecision)
      : "Tidak ada keputusan pembelian langsung yang perlu dianalisis.",
    "",
    "COMPACT FINANCIAL CONTEXT:",
    JSON.stringify({
      currentMonthTopCategories: input.context.currentMonth.topExpenseCategories.map(c => ({
        category: c.name,
        amount: formatRupiah(c.amount),
        percentage: `${c.percentageOfExpense}%`
      })),
      previousMonthTopCategories: input.context.previousMonth.topExpenseCategories.map(c => ({
        category: c.name,
        amount: formatRupiah(c.amount),
        percentage: `${c.percentageOfExpense}%`
      }))
    }, null, 2),
    "",
    "DETERMINISTIC BACKEND SUMMARY:",
    input.baseResponse.reply,
    "",
    "ANSWER QUALITY RULES:",
    "- Jawab pertanyaan user secara langsung, natural, dan sesuai konteks pertanyaannya.",
    "- Sesuaikan panjang jawaban dengan pertanyaan user: singkat untuk pertanyaan cepat, medium untuk evaluasi, dan lebih detail untuk analisis lengkap/perbandingan/goal.",
    "- Hindari saran generik; jika data tersedia, sebutkan kategori, batas, nominal, status, atau langkah praktis yang relevan.",
    "- Gunakan struktur jawaban: PRIORITAS - ALASAN - AKSI sebagai default, tetapi jangan terlalu kaku jika user hanya bertanya singkat, meminta klarifikasi, atau sedang follow-up.",
    "- Untuk pertanyaan 'boros di mana', sebutkan kategori prioritas jika memang material. Jika kategori terbesar belum material, jelaskan bahwa kategori itu terbesar sementara tetapi belum menjadi risiko besar.",
    "- Untuk pertanyaan 'apa yang harus saya kurangi', beri satu prioritas utama jika ada sinyal material. Jika belum ada sinyal besar, sarankan tetap pantau dan catat transaksi rutin.",
    "- Untuk pertanyaan realistis/tidak, mulai dengan verdict, lalu jelaskan hitungan dan risiko.",
    "- Untuk follow-up seperti 'lanjutannya apa', 'terus?', 'kalau begitu?', gunakan recent conversation context dan lanjutkan pembahasan terakhir selama masih relevan dengan keuangan pribadi.",
    "- Jangan menakut-nakuti user saat status financial health aman, safe-to-spend aman, and warning besar tidak ada.",
    "- Jangan menyebut kategori dominan sebagai risiko besar jika nominalnya kecil, rasio pengeluaran rendah, dan backend summary menyatakan tidak ada warning besar.",
    "- Tetap tegas jika status HOLD/RISK, cashflow negatif, pengeluaran mendekati pemasukan, atau ada warning material dari backend.",
    "- Jangan membahas hal yang tidak ditanya kecuali benar-benar membantu keputusan user.",
    "- Jika data kurang, jangan mengarang. Sebutkan data yang kurang secara singkat dan beri langkah berikutnya.",
    "- Jika habit snapshot menunjukkan data masih sedikit atau sudah lama tidak dicatat, beri dorongan ringan untuk mencatat transaksi terbaru tanpa nada menekan.",
    "- Angka penting harus konsisten dengan context, financial health snapshot, safe-to-spend snapshot, spending pattern insight, financial scenario analysis, atau angka yang user berikan.",
    "- Jika financial scenario analysis tersedia, jangan melawan verdict dan hitungan deterministik dari backend.",
    "- Jika financial health snapshot tersedia, jangan melawan status dan alasan deterministik dari backend.",
    "- Jika safe-to-spend snapshot tersedia, jangan melawan status, reason, action, dan warnings dari backend.",
    "- Jangan membocorkan userId, email, token, requestId, catatan transaksi mentah, atau data internal.",
    "- Jangan mengklaim bisa menyimpan transaksi kecuali response memang berupa draft transaksi yang perlu direview user.",
    "",
    "TASK:",
    "Buat jawaban final yang lebih natural, jelas, and bernilai dari financial context, financial health snapshot, financial checkup snapshot, safe-to-spend snapshot, spending pattern insight, consultant action plan, financial scenario analysis, purchase decision impact, dan deterministic backend summary.",
    "Gunakan angka yang sama seperti context/backend summary/health snapshot/spending insight/scenario analysis atau angka yang disebut user.",
    "Jangan tambahkan angka baru tanpa dasar.",
    "Jangan terlalu panjang untuk pertanyaan sederhana, tetapi jangan memotong analisis yang memang perlu penjelasan.",
    "Berikan insight dan saran yang langsung bisa dilakukan user.",
    "Pastikan jawaban akhir terasa seperti konsultan keuangan pribadi yang praktis: mulai dari prioritas, jelaskan alasan, lalu beri aksi."
  ].join("\n");
}
