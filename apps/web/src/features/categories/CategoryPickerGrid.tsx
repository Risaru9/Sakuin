import { Check, Plus } from "lucide-react";
import { CategoryBadge } from "../../components/saku";
import { cn } from "../../lib/cn";
import type { Category, CategoryType } from "./category.types";

type CategoryPickerGridProps = {
  categories: Category[];
  type: CategoryType;
  selectedId: string | null;
  onSelect: (category: Category) => void;
  /** Shows a "Tambah" tile that starts creating a category. */
  onAdd?: () => void;
};

function isOtherCategory(category: Category) {
  return /lain|other/i.test(category.name);
}

/** Categories of one type, with the catch-all "Lainnya" kept last. */
export function sortCategoriesForPicker(categories: Category[], type: CategoryType) {
  return categories
    .filter((category) => category.type === type)
    .sort((first, second) => Number(isOtherCategory(first)) - Number(isOtherCategory(second)));
}

export function CategoryPickerGrid({
  categories,
  type,
  selectedId,
  onSelect,
  onAdd
}: CategoryPickerGridProps) {
  return (
    <div className="grid grid-cols-4 gap-x-1 gap-y-2">
      {sortCategoriesForPicker(categories, type).map((category) => {
        const selected = category.id === selectedId;

        return (
          <button
            aria-pressed={selected}
            className="relative flex min-h-11 flex-col items-center gap-1 rounded-2xl pt-1 pb-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            key={category.id}
            onClick={() => onSelect(category)}
            type="button"
          >
            <CategoryBadge
              className={cn(selected && "shadow-saku-xs motion-safe:animate-saku-wiggle")}
              icon={category.icon}
              name={category.name}
              size={48}
            />
            {selected ? (
              <span className="saku-line-hair absolute top-0 right-2 flex size-5 items-center justify-center rounded-full bg-saku-accent motion-safe:animate-saku-pop">
                <Check aria-hidden="true" className="size-3 text-white" strokeWidth={3.6} />
              </span>
            ) : null}
            <span className="line-clamp-2 text-center text-[11px] leading-tight font-black">
              {category.name}
            </span>
          </button>
        );
      })}

      {onAdd ? (
        <button
          className="flex min-h-11 flex-col items-center gap-1 rounded-2xl pt-1 pb-0.5 text-saku-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          onClick={onAdd}
          type="button"
        >
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-saku-muted"
          >
            <Plus className="size-5" strokeWidth={2.6} />
          </span>
          <span className="text-[11px] leading-tight font-extrabold">Tambah</span>
        </button>
      ) : null}
    </div>
  );
}
