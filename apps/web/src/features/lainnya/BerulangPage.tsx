import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Zap } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import {
  CategoryBadge,
  SakuMascot,
  showSnack,
  StickerButton,
  StickerCard,
  StickerSwitch
} from "../../components/saku";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { formatPlainAmount } from "../beranda/beranda-data";
import {
  describeNextRun,
  describeSchedule,
  dueThisWeek,
  monthlyEstimate,
  ruleTitle,
  weekdayOf
} from "../recurring/recurring-data";
import { RecurringRuleSheet } from "../recurring/RecurringRuleSheet";
import { getRecurringRules, updateRecurringRule } from "../recurring/recurring.service";
import type { RecurringRule } from "../recurring/recurring.types";
import { useReferenceData } from "../transactions/use-reference-data";
import { FloatingSnackHost, SubPageHeader } from "./SubPageParts";

/** Transaksi berulang: bills and income that repeat, with a monthly estimate and pause switches. */
export function BerulangPage() {
  const queryClient = useQueryClient();
  const { categories } = useReferenceData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const rulesQuery = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: getRecurringRules,
    staleTime: 60_000
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: RecurringRule) => updateRecurringRule(rule.id, { isActive: !rule.isActive }),
    onMutate: async (rule) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurring });
      const previous = queryClient.getQueryData<RecurringRule[]>(queryKeys.recurring);
      queryClient.setQueryData<RecurringRule[]>(queryKeys.recurring, (current) =>
        current?.map((item) => (item.id === rule.id ? { ...item, isActive: !rule.isActive } : item))
      );
      return { previous };
    },
    onError: (_error, _rule, context) => {
      queryClient.setQueryData(queryKeys.recurring, context?.previous);
      showSnack({ title: "Belum bisa diubah", detail: "Periksa koneksi, lalu coba lagi.", mood: "worried" });
    },
    onSuccess: (_saved, rule) =>
      showSnack({ title: rule.isActive ? `${ruleTitle(rule)} dijeda` : `${ruleTitle(rule)} aktif lagi`, mood: "happy" }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.recurring })
  });

  const rules = rulesQuery.data ?? [];
  const estimate = monthlyEstimate(rules);
  const soon = dueThisWeek(rules);
  const ordered = [...rules].sort(
    (first, second) => Number(second.isActive) - Number(first.isActive) || first.nextRunAt.localeCompare(second.nextRunAt)
  );

  function openSheet(rule: RecurringRule | null) {
    setEditing(rule);
    setSheetOpen(true);
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader addLabel="Tambah transaksi berulang" onAdd={() => openSheet(null)} title="Transaksi berulang" />

        {rulesQuery.isPending ? (
          <div aria-hidden="true" className="mt-4 space-y-3">
            <div className="h-[84px] animate-pulse rounded-saku-card bg-saku-dash/60" />
            <div className="h-[260px] animate-pulse rounded-saku-card bg-saku-dash/40" />
          </div>
        ) : null}

        {rulesQuery.isError ? (
          <StickerCard className="mt-4 flex items-center gap-3 p-4">
            <SakuMascot mood="worried" size={56} />
            <p className="min-w-0 flex-1 font-black">Jadwal belum termuat</p>
            <StickerButton onClick={() => void rulesQuery.refetch()} size="md" variant="plain">
              Coba lagi
            </StickerButton>
          </StickerCard>
        ) : null}

        {rulesQuery.data && rules.length === 0 ? (
          <StickerCard className="mt-4 flex flex-col items-center gap-2 px-5 py-6 text-center" tone="coin-soft">
            <SakuMascot animated size={72} />
            <p className="font-saku-head text-xl font-semibold">Ada tagihan rutin?</p>
            <p className="text-sm font-bold text-saku-muted">
              Internet, kos, atau gaji bulanan. Buat sekali, Saku mencatatnya otomatis saat tanggalnya tiba.
            </p>
            <StickerButton className="mt-2" onClick={() => openSheet(null)} size="md">
              Buat jadwal pertama
            </StickerButton>
          </StickerCard>
        ) : null}

        {rules.length > 0 ? (
          <>
            <div className="saku-line mt-3.5 rounded-saku-card bg-saku-accent px-3.5 py-3 text-white shadow-saku">
              <p className="text-xs font-extrabold text-white/90">Perkiraan tiap bulan</p>
              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <div>
                  <p className="text-xs font-extrabold">Keluar</p>
                  <p className="font-saku-head text-xl font-semibold">{formatPlainAmount(estimate.expense)}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold">Masuk</p>
                  <p className="font-saku-head text-xl font-semibold">{formatPlainAmount(estimate.income)}</p>
                </div>
              </div>
            </div>

            {soon.length > 0 ? (
              <p className="mt-3 flex items-center gap-2 px-1 text-[13px] font-extrabold">
                <CalendarDays aria-hidden="true" className="size-[15px] shrink-0" strokeWidth={2.4} />
                <span className="truncate">
                  Minggu ini: {soon.map((rule) => `${ruleTitle(rule)} (${weekdayOf(rule.nextRunAt)})`).join(", ")}
                </span>
              </p>
            ) : null}

            <StickerCard className="mt-2.5 overflow-hidden">
              <ul>
                {ordered.map((rule, index) => {
                  const isIncome = rule.type === "INCOME";
                  const title = ruleTitle(rule);

                  return (
                    <li className={cn("flex items-center gap-3 px-3", !rule.isActive && "opacity-60")} key={rule.id}>
                      <button
                        aria-label={`Ubah ${title}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                        onClick={() => openSheet(rule)}
                        type="button"
                      >
                        <CategoryBadge icon={rule.category.icon} size={40} />
                        <span className={cn("min-w-0 flex-1 py-2.5", index < ordered.length - 1 && "saku-dash-bottom")}>
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[15px] font-black">{title}</span>
                            <span className={cn("shrink-0 font-saku-head text-base font-semibold", isIncome && "text-saku-income")}>
                              {isIncome ? "+" : "−"}
                              {formatPlainAmount(Number(rule.amount))}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-bold text-saku-muted">
                            {describeSchedule(rule)} · {rule.isActive ? `berikutnya ${describeNextRun(rule)}` : "dijeda"}
                          </span>
                          {rule.autoPost ? (
                            <span className="saku-line-hair mt-1 inline-flex items-center gap-1 rounded-full bg-saku-income-soft px-2 text-[11px] font-black">
                              <Zap aria-hidden="true" className="size-[11px]" strokeWidth={2.6} />
                              dicatat otomatis
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <StickerSwitch
                        checked={rule.isActive}
                        disabled={toggleMutation.isPending}
                        label={rule.isActive ? `Jeda ${title}` : `Aktifkan ${title}`}
                        onCheckedChange={() => toggleMutation.mutate(rule)}
                      />
                    </li>
                  );
                })}
              </ul>
            </StickerCard>
          </>
        ) : null}
      </div>

      <FloatingSnackHost />

      <RecurringRuleSheet categories={categories} onClose={() => setSheetOpen(false)} open={sheetOpen} rule={editing} />
    </AppShell>
  );
}
