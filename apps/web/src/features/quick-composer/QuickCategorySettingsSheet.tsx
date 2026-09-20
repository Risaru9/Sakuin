import { Check } from "lucide-react";
import { BottomSheet, CategoryBadge, StickerButton } from "../../components/saku";
import { cn } from "../../lib/cn";
import type { Category } from "../categories/category.types";

type QuickCategorySettingsSheetProps = {
  open: boolean;
  categories: Category[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (categoryIds: string[]) => void;
};

export const MAX_QUICK_CATEGORIES = 6;

export function QuickCategorySettingsSheet({
  open,
  categories,
  selectedIds,
  onClose,
  onSave
}: QuickCategorySettingsSheetProps) {
  const expenseCategories = categories.filter((category) => category.type === "EXPENSE");
  const selectedSet = new Set(selectedIds);

  function toggleCategory(categoryId: string) {
    if (selectedSet.has(categoryId)) {
      onSave(selectedIds.filter((id) => id !== categoryId));
      return;
    }

    if (selectedIds.length >= MAX_QUICK_CATEGORIES) {
      return;
    }

    onSave([...selectedIds, categoryId]);
  }

  return (
    <BottomSheet
      footer={
        <StickerButton fullWidth onClick={onClose}>
          Selesai
        </StickerButton>
      }
      onClose={onClose}
      open={open}
      subtitle={`Pilih 1–${MAX_QUICK_CATEGORIES} yang paling sering kamu catat`}
      title="Atur tombol cepat"
    >
      <div aria-label="Pilih tombol cepat" className="grid grid-cols-4 gap-x-1 gap-y-2" role="group">
        {expenseCategories.map((category) => {
          const selected = selectedSet.has(category.id);

          return (
            <button
              aria-label={`Tombol cepat ${category.name}`}
              aria-pressed={selected}
              className="relative flex min-h-11 flex-col items-center gap-1 rounded-2xl pt-1 pb-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              type="button"
            >
              <CategoryBadge
                className={cn(selected && "shadow-saku-xs motion-safe:animate-saku-wiggle")}
                icon={category.icon}
                size={42}
              />
              {selected ? (
                <span className="saku-line-hair absolute top-0 right-2 flex size-5 items-center justify-center rounded-full bg-saku-accent">
                  <Check aria-hidden="true" className="size-3 text-white" strokeWidth={3.6} />
                </span>
              ) : null}
              <span className="line-clamp-2 text-center text-[11px] leading-tight font-black">{category.name}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs font-bold text-saku-muted">
        {selectedIds.length === 0
          ? "Pilih minimal satu kategori."
          : `${selectedIds.length} tombol dipilih · bisa diubah kapan saja.`}
      </p>
    </BottomSheet>
  );
}
