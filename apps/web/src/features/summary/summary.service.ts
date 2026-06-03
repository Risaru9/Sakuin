import { apiRequest } from "../../lib/api-client";
import type { SummaryData } from "./summary.types";

export type GetSummaryParams = {
  month?: number;
  year?: number;
};

export function getSummary(params: GetSummaryParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.month) {
    searchParams.set("month", String(params.month));
  }

  if (params.year) {
    searchParams.set("year", String(params.year));
  }

  const query = searchParams.toString();

  return apiRequest<SummaryData>(query ? `/api/summary?${query}` : "/api/summary");
}
