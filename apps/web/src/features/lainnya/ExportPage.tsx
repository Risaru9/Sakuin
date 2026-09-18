import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, Tags, type LucideIcon } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { SakuMascot, SegmentedControl, showSnack, StickerButton, StickerChip } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { EXPORT_PERIODS, getExportRange, rangeToIsoBounds, type ExportPeriod } from "../export/export-data";
import { downloadTransactionsExport, type ExportFormat, type ExportTypeFilter } from "../export/export.service";
import { getTransactions } from "../transactions/transaction.service";
import { getTodayInputValue } from "../transactions/transaction-date";
import { useReferenceData } from "../transactions/use-reference-data";
import { FloatingSnackHost, SheetFieldLabel, SubPageHeader } from "./SubPageParts";

const FORMATS: Array<{ value: ExportFormat; label: string; hint: string; Icon: LucideIcon }> = [
  { value: "xlsx", label: "Excel", hint: "Rapi untuk dibaca", Icon: FileSpreadsheet },
  { value: "csv", label: "CSV", hint: "Untuk aplikasi lain", Icon: FileText },
  { value: "json", label: "JSON", hint: "Cadangan teknis", Icon: FileJson }
];

const TYPES: Array<{ value: ExportTypeFilter; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "EXPENSE", label: "Keluar" },
  { value: "INCOME", label: "Masuk" }
];

const DATE_INPUT_CLASS =
  "saku-line-thin min-h-11 w-full rounded-saku-control bg-saku-paper px-3 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30";

/** Export data: pick a format, period and kind, see how many entries go in, download. */
export function ExportPage() {
  const todayKey = getTodayInputValue();
  const { categories } = useReferenceData();
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [type, setType] = useState<ExportTypeFilter>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [custom, setCustom] = useState({ startKey: "", endKey: todayKey });

  const range = getExportRange(period, todayKey, custom);
  const visibleCategories = categories.filter((category) => type === "ALL" || category.type === type);
  const categoryName = categories.find((category) => category.id === categoryId)?.name;

  // React Query hashes the key by value, so a fresh object each render is fine.
  const countParams = range
    ? {
        page: 1,
        limit: 1,
        type: type === "ALL" ? undefined : type,
        categoryId: categoryId || undefined,
        ...rangeToIsoBounds(range)
      }
    : null;
  const countQuery = useQuery({
    queryKey: ["transactions", "count", countParams],
    queryFn: () => getTransactions(countParams ?? undefined),
    enabled: countParams !== null,
    staleTime: 60_000
  });
  const count = countQuery.data?.pagination?.total ?? null;

  const downloadMutation = useMutation({
    mutationFn: () =>
      downloadTransactionsExport({
        format,
        type,
        categoryId: categoryId || undefined,
        startDate: range?.startKey ?? undefined,
        endDate: range?.endKey ?? undefined
      }),
    onSuccess: (result) =>
      showSnack({ title: "File diunduh", detail: `${result.fileName} · ${result.location}`, mood: "happy" }),
    onError: (caughtError) =>
      showSnack({
        title: "Belum bisa mengunduh",
        detail: caughtError instanceof ApiClientError || caughtError instanceof Error ? caughtError.message : "Coba lagi sebentar lagi.",
        mood: "worried"
      })
  });

  const formatLabel = FORMATS.find((item) => item.value === format)?.label ?? "";
  const empty = count === 0;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader title="Export data" />

        <div className="saku-line-thin mt-3.5 flex items-center gap-3 rounded-saku-card bg-saku-coin-soft px-3.5 py-3">
          <SakuMascot animated size={46} />
          <p className="text-sm font-extrabold">Simpan catatanmu ke file, untuk cadangan atau diolah lagi.</p>
        </div>

        <SheetFieldLabel>Format</SheetFieldLabel>
        <div aria-label="Format file" className="grid grid-cols-3 gap-2" role="radiogroup">
          {FORMATS.map((item) => {
            const selected = item.value === format;

            return (
              <button
                aria-checked={selected}
                className={cn(
                  "saku-line-thin flex flex-col items-center gap-1 rounded-[18px] px-1.5 py-3 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
                  selected ? "bg-saku-coin shadow-saku-xs" : "bg-saku-paper"
                )}
                key={item.value}
                onClick={() => setFormat(item.value)}
                role="radio"
                type="button"
              >
                <item.Icon aria-hidden="true" className="size-[22px]" strokeWidth={2.3} />
                <span className="font-saku-head text-[17px] font-semibold">{item.label}</span>
                <span className="text-[11px] font-bold text-saku-muted">{item.hint}</span>
              </button>
            );
          })}
        </div>

        <SheetFieldLabel>Periode</SheetFieldLabel>
        <div className="flex flex-wrap gap-2">
          {EXPORT_PERIODS.map((item) => (
            <StickerChip active={item.value === period} key={item.value} onClick={() => setPeriod(item.value)}>
              {item.label}
            </StickerChip>
          ))}
        </div>
        {period === "custom" ? (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <label className="text-xs font-black text-saku-muted">
              Dari
              <input
                className={cn(DATE_INPUT_CLASS, "mt-1")}
                max={custom.endKey || todayKey}
                onChange={(event) => setCustom((current) => ({ ...current, startKey: event.target.value }))}
                type="date"
                value={custom.startKey}
              />
            </label>
            <label className="text-xs font-black text-saku-muted">
              Sampai
              <input
                className={cn(DATE_INPUT_CLASS, "mt-1")}
                max={todayKey}
                min={custom.startKey || undefined}
                onChange={(event) => setCustom((current) => ({ ...current, endKey: event.target.value }))}
                type="date"
                value={custom.endKey}
              />
            </label>
          </div>
        ) : null}

        <SheetFieldLabel>Jenis</SheetFieldLabel>
        <SegmentedControl
          ariaLabel="Jenis transaksi"
          onChange={(value) => {
            setType(value);
            setCategoryId("");
          }}
          options={TYPES}
          value={type}
        />
        <label className="saku-line-thin relative mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-saku-paper px-3.5 text-[13px] font-black shadow-saku-xs focus-within:ring-4 focus-within:ring-saku-accent/30">
          <Tags aria-hidden="true" className="size-[15px]" strokeWidth={2.4} />
          {categoryName ?? "Semua kategori"}
          <ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
          <select
            aria-label="Kategori"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">Semua kategori</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="saku-line-thin mt-4 flex items-center justify-between gap-3 rounded-[18px] bg-saku-paper px-3.5 py-3">
          <div className="min-w-0">
            <p className="font-saku-head text-xl font-semibold" aria-live="polite">
              {range === null
                ? "Belum ada periode"
                : count === null
                  ? "Menghitung…"
                  : `${count.toLocaleString("id-ID")} transaksi`}
            </p>
            <p className="text-xs font-bold text-saku-muted">{range ? range.label : "Pilih tanggal mulai dan akhir"}</p>
          </div>
          <Download aria-hidden="true" className="size-6 shrink-0" strokeWidth={2.4} />
        </div>

        <StickerButton
          className="mt-3.5"
          disabled={range === null || empty}
          fullWidth
          isLoading={downloadMutation.isPending}
          onClick={() => downloadMutation.mutate()}
        >
          {range === null ? "Pilih tanggal dulu" : empty ? "Tidak ada transaksi" : `Unduh ${formatLabel}`}
        </StickerButton>
      </div>

      <FloatingSnackHost />
    </AppShell>
  );
}
