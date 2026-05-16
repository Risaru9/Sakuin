import type { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";

type GetCategoriesInput = {
  userId: string;
  type?: TransactionType;
};

type CreateCategoryInput = {
  name: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
};

type UpdateCategoryInput = {
  name?: string;
  type?: TransactionType;
  icon?: string | null;
  color?: string | null;
};

type CategoryRecord = Prisma.CategoryGetPayload<object>;

function normalizeOptionalValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function normalizeName(value: string) {
  return value.trim();
}

function mapCategory(category: CategoryRecord) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault
  };
}

function getVisibleCategoryWhere(
  userId: string,
  type?: TransactionType
): Prisma.CategoryWhereInput {
  return {
    type,
    OR: [
      {
        userId: null,
        isDefault: true
      },
      {
        userId
      }
    ]
  };
}

async function ensureVisibleCategoryNameIsUnique({
  userId,
  name,
  type,
  ignoredCategoryId
}: {
  userId: string;
  name: string;
  type: TransactionType;
  ignoredCategoryId?: string;
}) {
  const existingCategory = await prisma.category.findFirst({
    where: {
      id: ignoredCategoryId
        ? {
            not: ignoredCategoryId
          }
        : undefined,
      name: {
        equals: name,
        mode: "insensitive"
      },
      type,
      OR: [
        {
          userId: null,
          isDefault: true
        },
        {
          userId
        }
      ]
    }
  });

  if (existingCategory) {
    throw new HttpError(
      "Nama kategori sudah digunakan untuk tipe transaksi tersebut",
      409
    );
  }
}

async function getCustomCategoryOrThrow(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
      isDefault: false
    }
  });

  if (!category) {
    throw new HttpError(
      "Kategori tidak ditemukan atau tidak bisa diubah",
      404
    );
  }

  return category;
}

export async function getCategoriesService(input: GetCategoriesInput) {
  const categories = await prisma.category.findMany({
    where: getVisibleCategoryWhere(input.userId, input.type),
    orderBy: [
      {
        isDefault: "desc"
      },
      {
        type: "asc"
      },
      {
        name: "asc"
      }
    ]
  });

  return categories.map(mapCategory);
}

export async function createCategoryService(
  userId: string,
  input: CreateCategoryInput
) {
  const name = normalizeName(input.name);

  await ensureVisibleCategoryNameIsUnique({
    userId,
    name,
    type: input.type
  });

  const category = await prisma.category.create({
    data: {
      userId,
      name,
      type: input.type,
      icon: normalizeOptionalValue(input.icon),
      color: normalizeOptionalValue(input.color),
      isDefault: false
    }
  });

  return mapCategory(category);
}

export async function updateCategoryService(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
) {
  const existingCategory = await getCustomCategoryOrThrow(userId, categoryId);

  const nextType = input.type ?? existingCategory.type;
  const nextName =
    input.name !== undefined
      ? normalizeName(input.name)
      : existingCategory.name;

  if (nextType !== existingCategory.type) {
    const usedTransactionCount = await prisma.transaction.count({
      where: {
        categoryId: existingCategory.id,
        userId
      }
    });

    if (usedTransactionCount > 0) {
      throw new HttpError(
        "Tipe kategori tidak bisa diubah karena kategori sudah digunakan oleh transaksi",
        400
      );
    }
  }

  await ensureVisibleCategoryNameIsUnique({
    userId,
    name: nextName,
    type: nextType,
    ignoredCategoryId: existingCategory.id
  });

  const category = await prisma.category.update({
    where: {
      id: existingCategory.id
    },
    data: {
      name: nextName,
      type: nextType,
      icon:
        input.icon !== undefined
          ? normalizeOptionalValue(input.icon)
          : existingCategory.icon,
      color:
        input.color !== undefined
          ? normalizeOptionalValue(input.color)
          : existingCategory.color
    }
  });

  return mapCategory(category);
}

export async function deleteCategoryService(
  userId: string,
  categoryId: string
) {
  const existingCategory = await getCustomCategoryOrThrow(userId, categoryId);

  const usedTransactionCount = await prisma.transaction.count({
    where: {
      categoryId: existingCategory.id,
      userId
    }
  });

  if (usedTransactionCount > 0) {
    throw new HttpError(
      "Kategori tidak bisa dihapus karena sudah digunakan oleh transaksi",
      400
    );
  }

  const deletedCategory = await prisma.category.delete({
    where: {
      id: existingCategory.id
    }
  });

  return mapCategory(deletedCategory);
}