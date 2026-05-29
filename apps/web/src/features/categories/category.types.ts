export type CategoryType = "INCOME" | "EXPENSE";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  limit: number | null;
};

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  limit?: number | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;