import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateAccountInput,
  CreateAccountTransferInput,
  UpdateAccountInput
} from "./account.types.js";

type PrismaExecutor = typeof prisma | Prisma.TransactionClient;

const DEFAULT_ACCOUNT_NAME = "Dompet Utama";
const MAX_ACTIVE_ACCOUNTS = 20;

const accountSummarySelect = {
  id: true,
  name: true,
  type: true,
  icon: true,
  color: true
} satisfies Prisma.AccountSelect;

export async function ensureDefaultAccount(
  db: PrismaExecutor,
  userId: string
) {
  const existingAccount = await db.account.findFirst({
    where: {
      userId,
      isArchived: false
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true
    }
  });

  if (existingAccount) {
    return existingAccount;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new HttpError("User tidak ditemukan", 404);
  }

  return db.account.create({
    data: {
      userId,
      name: DEFAULT_ACCOUNT_NAME,
      type: AccountType.CASH,
      icon: "wallet",
      color: "#2563eb"
    },
    select: {
      id: true
    }
  });
}

async function getOwnedAccountOrThrow(
  userId: string,
  accountId: string,
  options: { allowArchived?: boolean } = {}
) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
      ...(options.allowArchived ? {} : { isArchived: false })
    }
  });

  if (!account) {
    throw new HttpError("Rekening tidak ditemukan", 404);
  }

  return account;
}

export async function resolveOwnedAccountId(
  db: PrismaExecutor,
  userId: string,
  accountId?: string
) {
  if (!accountId) {
    const account = await ensureDefaultAccount(db, userId);
    return account.id;
  }

  const account = await db.account.findFirst({
    where: {
      id: accountId,
      userId,
      isArchived: false
    },
    select: {
      id: true
    }
  });

  if (!account) {
    throw new HttpError("Rekening tidak ditemukan", 404);
  }

  return account.id;
}

export async function getAccounts(userId: string, includeArchived = false) {
  await ensureDefaultAccount(prisma, userId);

  const where = {
    userId,
    ...(includeArchived ? {} : { isArchived: false })
  };

  const [accounts, transactionTotals, outgoingTotals, incomingTotals] =
    await prisma.$transaction([
      prisma.account.findMany({
        where,
        orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }]
      }),
      prisma.transaction.groupBy({
        by: ["accountId", "type"],
        where: {
          userId
        },
        orderBy: [{ accountId: "asc" }, { type: "asc" }],
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),
      prisma.accountTransfer.groupBy({
        by: ["fromAccountId"],
        where: {
          userId
        },
        orderBy: {
          fromAccountId: "asc"
        },
        _sum: {
          amount: true
        }
      }),
      prisma.accountTransfer.groupBy({
        by: ["toAccountId"],
        where: {
          userId
        },
        orderBy: {
          toAccountId: "asc"
        },
        _sum: {
          amount: true
        }
      })
    ]);

  const totalsByAccount = new Map<
    string,
    { income: Prisma.Decimal; expense: Prisma.Decimal; count: number }
  >();

  for (const row of transactionTotals) {
    if (!row.accountId) {
      continue;
    }

    const current = totalsByAccount.get(row.accountId) ?? {
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
      count: 0
    };

    if (row.type === TransactionType.INCOME) {
      current.income = row._sum?.amount ?? new Prisma.Decimal(0);
    } else {
      current.expense = row._sum?.amount ?? new Prisma.Decimal(0);
    }

    current.count +=
      row._count && row._count !== true ? (row._count.id ?? 0) : 0;
    totalsByAccount.set(row.accountId, current);
  }

  const outgoingByAccount = new Map(
    outgoingTotals.map((row) => [
      row.fromAccountId,
      row._sum?.amount ?? new Prisma.Decimal(0)
    ])
  );
  const incomingByAccount = new Map(
    incomingTotals.map((row) => [
      row.toAccountId,
      row._sum?.amount ?? new Prisma.Decimal(0)
    ])
  );

  return accounts.map((account) => {
    const transactionTotal = totalsByAccount.get(account.id) ?? {
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
      count: 0
    };
    const balance = account.initialBalance
      .plus(transactionTotal.income)
      .minus(transactionTotal.expense)
      .plus(incomingByAccount.get(account.id) ?? 0)
      .minus(outgoingByAccount.get(account.id) ?? 0);

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance.toString(),
      balance: balance.toString(),
      transactionCount: transactionTotal.count,
      icon: account.icon,
      color: account.color,
      isArchived: account.isArchived,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  });
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput
) {
  const activeAccountCount = await prisma.account.count({
    where: {
      userId,
      isArchived: false
    }
  });

  if (activeAccountCount >= MAX_ACTIVE_ACCOUNTS) {
    throw new HttpError(`Maksimal ${MAX_ACTIVE_ACCOUNTS} rekening aktif`, 400);
  }

  try {
    return await prisma.account.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        initialBalance: input.initialBalance,
        icon: input.icon?.trim() || null,
        color: input.color?.trim() || null
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError("Nama rekening sudah digunakan", 409);
    }

    throw error;
  }
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  try {
    return await prisma.account.update({
      where: {
        id: account.id
      },
      data: {
        name: input.name,
        type: input.type,
        initialBalance: input.initialBalance,
        icon:
          input.icon === undefined ? undefined : input.icon?.trim() || null,
        color:
          input.color === undefined ? undefined : input.color?.trim() || null
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError("Nama rekening sudah digunakan", 409);
    }

    throw error;
  }
}

export async function archiveAccount(userId: string, accountId: string) {
  const account = await getOwnedAccountOrThrow(userId, accountId);
  const activeAccountCount = await prisma.account.count({
    where: {
      userId,
      isArchived: false
    }
  });

  if (activeAccountCount <= 1) {
    throw new HttpError("Minimal satu rekening harus tetap aktif", 400);
  }

  return prisma.account.update({
    where: {
      id: account.id
    },
    data: {
      isArchived: true
    }
  });
}

export async function createAccountTransfer(
  userId: string,
  input: CreateAccountTransferInput
) {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isArchived: false,
      id: {
        in: [input.fromAccountId, input.toAccountId]
      }
    },
    select: {
      id: true
    }
  });

  if (accounts.length !== 2) {
    throw new HttpError("Rekening asal atau tujuan tidak ditemukan", 404);
  }

  return prisma.accountTransfer.create({
    data: {
      userId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      note: input.note?.trim() || null,
      date: input.date
    },
    include: {
      fromAccount: {
        select: accountSummarySelect
      },
      toAccount: {
        select: accountSummarySelect
      }
    }
  });
}

export async function getAccountTransfers(userId: string) {
  const transfers = await prisma.accountTransfer.findMany({
    where: {
      userId
    },
    include: {
      fromAccount: {
        select: accountSummarySelect
      },
      toAccount: {
        select: accountSummarySelect
      }
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50
  });

  return transfers.map((transfer) => ({
    id: transfer.id,
    fromAccount: transfer.fromAccount,
    toAccount: transfer.toAccount,
    amount: transfer.amount.toString(),
    note: transfer.note,
    date: transfer.date.toISOString(),
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString()
  }));
}
