import { apiRequest } from "../../lib/api-client";
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput
} from "./category.types";

export function getCategories(type?: CategoryType) {
  const query = type ? `?type=${type}` : "";

  return apiRequest<Category[]>(`/api/categories${query}`);
}

export function createCategory(input: CreateCategoryInput) {
  return apiRequest<Category>("/api/categories", {
    method: "POST",
    body: input
  });
}

export function updateCategory(categoryId: string, input: UpdateCategoryInput) {
  return apiRequest<Category>(`/api/categories/${categoryId}`, {
    method: "PUT",
    body: input
  });
}

export function deleteCategory(categoryId: string) {
  return apiRequest<Category>(`/api/categories/${categoryId}`, {
    method: "DELETE"
  });
}

/** Sets (or clears with null) the monthly limit; default categories keep it per user. */
export function setCategoryLimit(categoryId: string, limit: number | null) {
  return apiRequest<Category>(`/api/categories/${categoryId}/limit`, {
    method: "PUT",
    body: { limit }
  });
}
