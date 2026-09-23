import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, ChevronDown, RefreshCw, Settings2 } from "lucide-react";
import {
  CategoryBadge,
  SakuMascot,
  SakuSnackHost,
  StickerChip
} from "../../components/saku";
import { cn } from "../../lib/cn";
import { describeDateKey, formatAmount, formatSignedAmount } from "./composer-logic";
import { subscribeComposerFocus, takeComposerFocusRequest } from "./composer-bridge";
import { ComposerDetailSheet } from "./ComposerDetailSheet";
import { QuickCategorySettingsSheet } from "./QuickCategorySettingsSheet";
import { getQuickCategoryIds, saveQuickCategoryIds } from "./quick-category-preferences";
import { useQuickComposer } from "./use-quick-composer";
import type { Category } from "../categories/category.types";

type QuickComposerProps = {
  className?: string;
};

/**
 * Instagram-comment style entry: type "kopi 18rb", press Enter, done.
 * Guesses appear as chips above the field; tapping one opens the detail sheet.
 */
export function QuickComposer({ className }: QuickComposerProps) {
  const composer = useQuickComposer();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [savedQuickCategoryIds, setSavedQuickCategoryIds] = useState<string[]>(() => getQuickCategoryIds());
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const { guess, changeText } = composer;
  const quickCategories = useMemo(() => {
    const expenses = composer.categories.filter((category) => category.type === "EXPENSE");
    const configured = savedQuickCategoryIds
      .map((categoryId) => expenses.find((category) => category.id === categoryId))
      .filter((category): category is Category => Boolean(category));

    if (configured.length > 0) {
      return configured;
    }

    const preferred = ["makanan", "transportasi", "belanja", "tagihan"];

    return preferred
      .map(
        (name) =>
          expenses.find((category) => category.name.trim().toLowerCase() === name) ??
          expenses.find((category) => category.name.trim().toLowerCase().includes(name))
      )
      .filter((category): category is Category => Boolean(category));
  }, [composer.categories, savedQuickCategoryIds]);

  const selectedQuickCategory = composer.overrides.categoryId
    ? composer.categories.find((category) => category.id === composer.overrides.categoryId) ?? null
    : null;

  useLayoutEffect(() => {
    if (!composer.text.trim() && selectedQuickCategory) {
      inputRef.current?.focus();
    }
  }, [composer.text, selectedQuickCategory]);

  useEffect(() => {
    function handleFocusRequest() {
      const request = takeComposerFocusRequest();

      if (!request) {
        return;
      }

      if (request.text !== undefined) {
        changeText(request.text);
      }

      inputRef.current?.focus();
    }

    handleFocusRequest();
    return subscribeComposerFocus(handleFocusRequest);
  }, [changeText]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    composer.submit();
  }

  function saveFromSheet() {
    if (composer.submit()) {
      setSheetOpen(false);
    }
  }

  function saveQuickSettings(categoryIds: string[]) {
    const validIds = categoryIds
      .filter((categoryId) => composer.categories.some((category) => category.id === categoryId && category.type === "EXPENSE"))
      .slice(0, 6);

    if (validIds.length === 0) {
      return;
    }

    setSavedQuickCategoryIds(validIds);
    saveQuickCategoryIds(validIds);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <SakuSnackHost />

      {composer.hint ? (
        <p
          className="saku-line-hair self-start rounded-2xl bg-saku-coin-soft px-3 py-1.5 text-xs font-extrabold text-saku-ink motion-safe:animate-saku-rise"
          id={hintId}
          role="alert"
        >
          {composer.hint.message}
          {composer.hint.canRetry ? (
            <button
              className="ml-2 inline-flex items-center gap-1 font-black text-saku-accent underline"
              onClick={composer.retryCategories}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="size-3" />
              Muat ulang
            </button>
          ) : null}
        </p>
      ) : null}

      {!composer.text.trim() && quickCategories.length > 0 ? (
        <div aria-label="Transaksi cepat" className="-mx-1 px-1" role="group">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px] font-black tracking-[0.04em] text-saku-muted uppercase">Catat cepat</span>
            <button
              aria-label="Atur tombol cepat"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black text-saku-muted hover:text-saku-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
              onClick={() => setQuickSettingsOpen(true)}
              type="button"
            >
              <Settings2 aria-hidden="true" className="size-3.5" />
              Atur
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickCategories.map((category) => (
              <StickerChip
                active={selectedQuickCategory?.id === category.id}
                aria-label={`Catat ${category.name}`}
                className="min-h-8 gap-1 px-2.5 text-[11px]"
                key={category.id}
                leading={<CategoryBadge icon={category.icon} name={category.name} size={20} />}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (selectedQuickCategory?.id === category.id) {
                    composer.clearQuickCategory();
                  } else {
                    composer.selectQuickCategory(category);
                  }
                  inputRef.current?.focus();
                }}
                tone="highlight"
              >
                {category.name}
              </StickerChip>
            ))}
          </div>
        </div>
      ) : null}

      {guess ? (
        <div
          aria-label="Tebakan Saku"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-1.5 pr-14 [scrollbar-width:none] motion-safe:animate-saku-rise lg:pr-1 [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          <span
            className={cn(
              "saku-line-thin inline-flex min-h-11 shrink-0 items-center rounded-full bg-saku-paper px-3 font-saku-head text-[15px] font-semibold shadow-saku-xs",
              guess.type === "INCOME" ? "text-saku-income" : "text-saku-ink"
            )}
          >
            {guess.isMultiple
              ? `${guess.drafts.length} transaksi · ${formatAmount(guess.totalAmount)}`
              : formatSignedAmount(guess.totalAmount, guess.type)}
          </span>

          {guess.category ? (
            <StickerChip
              aria-label={`Kategori ${guess.category.name}${guess.needsCheck ? ", perlu dicek" : ""}`}
              leading={<CategoryBadge icon={guess.category.icon} name={guess.category.name} size={26} />}
              onClick={() => setSheetOpen(true)}
              tone="highlight"
              trailing={<ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />}
            >
              {guess.category.name}
              {guess.needsCheck ? (
                <span
                  aria-hidden="true"
                  className="saku-line-hair flex size-4 items-center justify-center rounded-full bg-saku-watch text-[10px]"
                >
                  ?
                </span>
              ) : null}
            </StickerChip>
          ) : null}

          <StickerChip
            leading={<CalendarDays aria-hidden="true" className="size-4" />}
            onClick={() => setSheetOpen(true)}
          >
            {describeDateKey(guess.dateKey, composer.todayKey)}
          </StickerChip>

          <StickerChip
            aria-label={`Jenis ${guess.type === "INCOME" ? "masuk" : "keluar"}, ketuk untuk mengganti`}
            leading={<ArrowLeftRight aria-hidden="true" className="size-4" />}
            onClick={composer.toggleType}
          >
            {guess.type === "INCOME" ? "Masuk" : "Keluar"}
          </StickerChip>
        </div>
      ) : null}

      <form
        aria-label="Catat transaksi"
        className="saku-line flex h-14 items-center gap-2.5 rounded-full bg-saku-paper pr-[7px] pl-1.5 font-saku-body shadow-saku-sm"
        onSubmit={handleSubmit}
      >
        {/* Tapping Saku opens the AI chat, "Tanya Saku". */}
        <Link
          aria-label="Tanya Saku"
          className="saku-line-thin saku-press flex size-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-saku-coin-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          title="Tanya Saku"
          to="/asisten"
        >
          <SakuMascot className="mt-1.5" mood={composer.hint ? "worried" : "happy"} size={38} />
        </Link>
        <label className="sr-only" htmlFor={inputId}>
          Catat transaksi, misalnya kopi 18rb
        </label>
        <input
          ref={inputRef}
          aria-describedby={composer.hint ? hintId : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold text-saku-ink outline-none placeholder:font-bold placeholder:text-saku-muted"
          enterKeyHint="send"
          id={inputId}
          maxLength={500}
          onChange={(event) => composer.changeText(event.target.value)}
          placeholder={selectedQuickCategory ? `Nominal ${selectedQuickCategory.name.toLowerCase()}…` : "Catat… misal kopi 18rb"}
          value={composer.text}
        />
        {composer.text.trim() ? (
          <button
            className="saku-line-thin saku-press min-h-11 shrink-0 rounded-full bg-saku-coin px-3.5 font-saku-head text-[15px] font-semibold text-saku-ink shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            type="submit"
          >
            Simpan
          </button>
        ) : null}
      </form>

      {guess ? (
        <ComposerDetailSheet
          categories={composer.categories}
          guess={guess}
          onChange={composer.updateOverrides}
          onClose={() => setSheetOpen(false)}
          onSave={saveFromSheet}
          open={sheetOpen}
          todayKey={composer.todayKey}
        />
      ) : null}

      <QuickCategorySettingsSheet
        categories={composer.categories}
        onClose={() => setQuickSettingsOpen(false)}
        onSave={saveQuickSettings}
        open={quickSettingsOpen}
        selectedIds={quickCategories.map((category) => category.id)}
      />
    </div>
  );
}
