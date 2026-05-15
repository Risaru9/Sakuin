import { apiRequest } from "../../lib/api-client";
import type { Category, CategoryType } from "./category.types";

export function getCategories(type?: CategoryType) {
  const query = type ? `?type=${type}` : "";

  return apiRequest<Category[]>(`/api/categories${query}`);
}