export type CategoryType = "INCOME" | "EXPENSE";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
};

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;