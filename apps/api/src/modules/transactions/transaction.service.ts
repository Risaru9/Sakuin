import type { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateTransactionInput,
  CreateTransactionsBulkInput,
  GetTransactionsQuery,
  TransactionListResponse,
  TransactionResponse,
  UpdateTransactionInput
} from "./transaction.types.js";

type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: {
    category: true;
  };
}>;

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function toTransactionResponse(
  transaction: TransactionWithCategory
): TransactionResponse {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount.toString(),
    note: transaction.note,
    date: transaction.date.toISOString(),
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color,
      isDefault: transaction.category.isDefault
    },
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString()
  };
}

async function ensureCategoryCanBeUsed(
  userId: string,
  categoryId: string,
  type: TransactionType
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
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

  if (!category) {
    throw new HttpError(
      "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi",
      400
    );
  }

  return category;
}

function getCategoryUsageKey(categoryId: string, type: TransactionType) {
  return `${categoryId}:${type}`;
}

async function getUsableCategoriesForBulk(
  userId: string,
  inputs: CreateTransactionInput[]
) {
  const categoryIds = [...new Set(inputs.map((input) => input.categoryId))];

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: categoryIds
      },
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

  const categoryMap = new Map(
    categories.map((category) => [
      getCategoryUsageKey(category.id, category.type),
      category
    ])
  );

  for (const input of inputs) {
    const category = categoryMap.get(
      getCategoryUsageKey(input.categoryId, input.type as TransactionType)
    );

    if (!category) {
      throw new HttpError(
        "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi",
        400
      );
    }
  }

  return categoryMap;
}

async function getOwnedTransactionOrThrow(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId
    },
    include: {
      category: true
    }
  });

  if (!transaction) {
    throw new HttpError("Transaksi tidak ditemukan", 404);
  }

  return transaction;
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionResponse> {
  await ensureCategoryCanBeUsed(
    userId,
    input.categoryId,
    input.type as TransactionType
  );

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type as TransactionType,
      amount: input.amount,
      note: input.note?.trim() || null,
      date: input.date
    },
    include: {
      category: true
    }
  });

  return toTransactionResponse(transaction);
}

export async function createTransactionsBulk(
  userId: string,
  input: CreateTransactionsBulkInput
): Promise<TransactionResponse[]> {
  await getUsableCategoriesForBulk(userId, input.transactions);

  const transactions = await prisma.$transaction(
    input.transactions.map((transactionInput) =>
      prisma.transaction.create({
        data: {
          userId,
          categoryId: transactionInput.categoryId,
          type: transactionInput.type as TransactionType,
          amount: transactionInput.amount,
          note: transactionInput.note?.trim() || null,
          date: transactionInput.date
        },
        include: {
          category: true
        }
      })
    )
  );

  return transactions.map(toTransactionResponse);
}

export async function getTransactions(
  userId: string,
  query: GetTransactionsQuery
): Promise<TransactionListResponse> {
  const where: Prisma.TransactionWhereInput = {
    userId
  };

  if (query.type) {
    where.type = query.type as TransactionType;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.search) {
    where.note = {
      contains: query.search,
      mode: "insensitive"
    };
  }

  const dateFilter: Prisma.DateTimeFilter = {};

  if (query.startDate) {
    dateFilter.gte = startOfDay(query.startDate);
  }

  if (query.endDate) {
    dateFilter.lte = endOfDay(query.endDate);
  }

  if (Object.keys(dateFilter).length > 0) {
    where.date = dateFilter;
  }

  const orderByMap: Record<
  GetTransactionsQuery["sort"],
  Prisma.TransactionOrderByWithRelationInput[]
> = {
  date_desc: [
    {
      date: "desc"
    },
    {
      createdAt: "desc"
    }
  ],
  date_asc: [
    {
      date: "asc"
    },
    {
      createdAt: "desc"
    }
  ],
  created_desc: [
    {
      createdAt: "desc"
    }
  ],
  created_asc: [
    {
      createdAt: "asc"
    }
  ]
};

  const skip = (query.page - 1) * query.limit;

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: {
        category: true
      },
      orderBy: orderByMap[query.sort],
      skip,
      take: query.limit
    }),
    prisma.transaction.count({
      where
    })
  ]);

  return {
    items: transactions.map(toTransactionResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
}

export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionResponse> {
  const transaction = await getOwnedTransactionOrThrow(userId, transactionId);

  return toTransactionResponse(transaction);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionResponse> {
  const existingTransaction = await getOwnedTransactionOrThrow(
    userId,
    transactionId
  );

  const finalType = (input.type ?? existingTransaction.type) as TransactionType;
  const finalCategoryId = input.categoryId ?? existingTransaction.categoryId;

  await ensureCategoryCanBeUsed(userId, finalCategoryId, finalType);

  const transaction = await prisma.transaction.update({
    where: {
      id: existingTransaction.id
    },
    data: {
      type: finalType,
      categoryId: finalCategoryId,
      amount: input.amount ?? existingTransaction.amount,
      date: input.date ?? existingTransaction.date,
      note:
        input.note !== undefined
          ? input.note?.trim() || null
          : existingTransaction.note
    },
    include: {
      category: true
    }
  });

  return toTransactionResponse(transaction);
}

export async function deleteTransaction(
  userId: string,
  transactionId: string
): Promise<TransactionResponse> {
  const existingTransaction = await getOwnedTransactionOrThrow(
    userId,
    transactionId
  );

  const deletedTransaction = await prisma.transaction.delete({
    where: {
      id: existingTransaction.id
    },
    include: {
      category: true
    }
  });

  return toTransactionResponse(deletedTransaction);
}