import { apiRequest } from "../../lib/api-client";
import type { SummaryData } from "./summary.types";

export function getSummary() {
  return apiRequest<SummaryData>("/api/summary");
}