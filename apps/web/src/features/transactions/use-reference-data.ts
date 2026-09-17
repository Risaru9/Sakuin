import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import { getAccounts } from "../accounts/account.service";
import { getCategories } from "../categories/category.service";

const REFERENCE_STALE_TIME = 5 * 60_000;

/** Categories and active accounts, shared by every screen that records or edits entries. */
export function useReferenceData() {
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
    staleTime: REFERENCE_STALE_TIME
  });
  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    staleTime: REFERENCE_STALE_TIME
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const accounts = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => !account.isArchived),
    [accountsQuery.data]
  );

  return { categories, accounts, categoriesQuery, accountsQuery };
}
