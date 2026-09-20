import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import { getCategories } from "../categories/category.service";

const REFERENCE_STALE_TIME = 5 * 60_000;

/** Categories shared by every screen that records or edits entries. */
export function useReferenceData() {
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
    staleTime: REFERENCE_STALE_TIME
  });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  return { categories, categoriesQuery };
}
