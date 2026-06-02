import { randomUUID } from "node:crypto";
import type { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { invalidateCachedFinancialContext } from "../ai/ai-financial-context-cache.js";
import {
  createEmailFingerprint,
  createTransactionFingerprint,
  parseEmailTransaction
} from "./email-import.parser.js";
import type {
  EmailConnectionResponse,
  EmailTransactionImportResponse,
  ImportEmailInput,
  ParsedEmailTransaction
} from "./email-import.types.js";

const AUTO_IMPORT_CONFIDENCE = 0.78;

const importInclude = {
  emailConnection: {
    select: {
      emailAddress: true
    }
  },
  transaction: {
    include: {
      category: {
        select: {
          name: true
        }
      }
    }
  }
} satisfies Prisma.EmailTransactionImportInclude;

type ImportWithRelations = Prisma.EmailTransactionImportGetPayload<{
  include: typeof importInclude;
}>;
type PrismaExecutor = typeof prisma | Prisma.TransactionClient;

function safeJsonArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapConnection(connection: Prisma.EmailConnectionGetPayload<{}>): EmailConnectionResponse {
  return {
    id: connection.id,
    provider: connection.provider,
    emailAddress: connection.emailAddress,
    status: connection.status,
    detectedProviders: safeJsonArray(connection.detectedProviders),
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString()
  };
}

function mapImport(record: ImportWithRelations): EmailTransactionImportResponse {
  return {
    id: record.id,
    emailConnectionId: record.emailConnectionId,
    emailAddress: record.emailConnection?.emailAddress ?? null,
    financialProvider: record.financialProvider,
    type: record.parsedType,
    amount: record.parsedAmount?.toString() ?? null,
    merchant: record.parsedMerchant,
    method: record.parsedMethod,
    reference: record.parsedReference,
    occurredAt: record.parsedOccurredAt?.toISOString() ?? null,
    confidence: record.confidence,
    status: record.status as EmailTransactionImportResponse["status"],
    statusReason: record.statusReason,
    transactionId: record.transactionId,
    categoryName: record.transaction?.category.name ?? null,
    note: record.transaction?.note ?? null,
    rawSubject: record.rawSubject,
    snippet: record.snippet,
    createdAt: record.createdAt.toISOString()
  };
}

function getSnippet(input: ImportEmailInput) {
  const raw = input.body.replace(/\s+/g, " ").trim();
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

function getCategoryName(provider: string) {
  return `Transfer ${provider || "Tidak Dikenal"}`;
}

function getCategoryStyle(type: TransactionType) {
  return type === "INCOME"
    ? { icon: "arrow-up-circle", color: "#16A34A" }
    : { icon: "arrow-down-circle", color: "#2563EB" };
}

async function ensureTransferCategory(
  db: PrismaExecutor,
  userId: string,
  provider: string,
  type: TransactionType
) {
  const name = getCategoryName(provider);
  const existingCategory = await db.category.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive"
      },
      type
    },
    select: {
      id: true
    }
  });

  if (existingCategory) {
    return existingCategory.id;
  }

  const style = getCategoryStyle(type);
  const category = await db.category.create({
    data: {
      userId,
      name,
      type,
      icon: style.icon,
      color: style.color,
      isDefault: false
    },
    select: {
      id: true
    }
  });

  return category.id;
}

function buildTransactionNote(parsed: ParsedEmailTransaction, input: ImportEmailInput) {
  const parts = [
    parsed.method ? `${parsed.method}` : "Email transaksi",
    parsed.financialProvider,
    parsed.merchant ? `- ${parsed.merchant}` : null,
    parsed.reference ? `Ref ${parsed.reference}` : null,
    input.emailAddress ? `via ${input.emailAddress}` : null
  ].filter(Boolean);

  return parts.join(" ").slice(0, 255);
}

function canAutoImport(parsed: ParsedEmailTransaction) {
  return Boolean(
    parsed.type &&
      parsed.amount &&
      parsed.occurredAt &&
      parsed.financialProvider !== "Tidak Dikenal" &&
      parsed.confidence >= AUTO_IMPORT_CONFIDENCE
  );
}

async function findOrCreateConnection(userId: string, input: ImportEmailInput, parsed: ParsedEmailTransaction) {
  const emailAddress = input.emailAddress?.trim().toLowerCase();
  if (!emailAddress) {
    return null;
  }

  const existing = await prisma.emailConnection.findUnique({
    where: {
      userId_provider_emailAddress: {
        userId,
        provider: "gmail",
        emailAddress
      }
    }
  });

  const detectedProviders = Array.from(
    new Set([...(existing ? safeJsonArray(existing.detectedProviders) : []), parsed.financialProvider])
  ).filter((provider) => provider !== "Tidak Dikenal");

  if (existing) {
    return prisma.emailConnection.update({
      where: {
        id: existing.id
      },
      data: {
        status: "active",
        detectedProviders,
        lastSyncedAt: new Date()
      }
    });
  }

  return prisma.emailConnection.create({
    data: {
      userId,
      provider: "gmail",
      emailAddress,
      status: "active",
      detectedProviders,
      lastSyncedAt: new Date()
    }
  });
}

async function createTransactionFromImport({
  db = prisma,
  userId,
  parsed,
  input,
  invalidateCache = true
}: {
  db?: PrismaExecutor;
  userId: string;
  parsed: ParsedEmailTransaction;
  input: ImportEmailInput;
  invalidateCache?: boolean;
}) {
  if (!parsed.type || !parsed.amount || !parsed.occurredAt) {
    throw new HttpError("Data transaksi belum lengkap untuk diimpor", 400);
  }

  const categoryId = await ensureTransferCategory(
    db,
    userId,
    parsed.financialProvider,
    parsed.type
  );

  const transaction = await db.transaction.create({
    data: {
      userId,
      categoryId,
      type: parsed.type,
      amount: parsed.amount,
      date: parsed.occurredAt,
      note: buildTransactionNote(parsed, input)
    }
  });

  if (invalidateCache) {
    invalidateCachedFinancialContext(userId);
  }

  return transaction;
}

export async function getEmailImportOverview(userId: string) {
  const [
    connections,
    imports,
    importedCount,
    needsReviewCount,
    duplicateCount,
    ignoredCount
  ] = await prisma.$transaction([
    prisma.emailConnection.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.emailTransactionImport.findMany({
      where: {
        userId
      },
      include: importInclude,
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.emailTransactionImport.count({
      where: {
        userId,
        status: "imported"
      }
    }),
    prisma.emailTransactionImport.count({
      where: {
        userId,
        status: "needs_review"
      }
    }),
    prisma.emailTransactionImport.count({
      where: {
        userId,
        status: "duplicate"
      }
    }),
    prisma.emailTransactionImport.count({
      where: {
        userId,
        status: "ignored"
      }
    })
  ]);

  return {
    gmailConfigured: Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET),
    connections: connections.map(mapConnection),
    recentImports: imports.map(mapImport),
    stats: {
      imported: importedCount,
      needsReview: needsReviewCount,
      duplicate: duplicateCount,
      ignored: ignoredCount
    }
  };
}

export async function getGmailAuthUrl(userId: string) {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_REDIRECT_URI) {
    return {
      configured: false,
      authUrl: null
    };
  }

  const state = Buffer.from(JSON.stringify({ userId, nonce: randomUUID() })).toString("base64url");
  const params = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    redirect_uri: env.GMAIL_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    state
  });

  return {
    configured: true,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  };
}

export async function importEmailTransaction(userId: string, input: ImportEmailInput) {
  const parsed = parseEmailTransaction(input);
  const emailFingerprint = createEmailFingerprint(userId, input);
  const transactionFingerprint = createTransactionFingerprint(userId, parsed);
  const connection = await findOrCreateConnection(userId, input, parsed);

  const existingEmailImport = await prisma.emailTransactionImport.findUnique({
    where: {
      userId_emailFingerprint: {
        userId,
        emailFingerprint
      }
    },
    include: importInclude
  });

  if (existingEmailImport) {
    return mapImport(existingEmailImport);
  }

  const duplicateImport = await prisma.emailTransactionImport.findFirst({
    where: {
      userId,
      transactionFingerprint,
      status: "imported"
    },
    select: {
      id: true
    }
  });

  let status = canAutoImport(parsed) && input.autoImport !== false ? "imported" : "needs_review";
  let statusReason = parsed.warnings.join(" ") || null;

  if (duplicateImport) {
    status = "duplicate";
    statusReason = "Kemungkinan transaksi ini sudah pernah diimpor dari email lain.";
  } else if (status === "imported") {
    statusReason = "Transaksi otomatis tercatat karena data email lengkap.";
  }

  const importData = {
    userId,
    emailConnectionId: connection?.id ?? null,
    gmailMessageId: input.messageId ?? null,
    emailFingerprint,
    transactionFingerprint,
    financialProvider: parsed.financialProvider,
    rawSubject: input.subject?.slice(0, 255) ?? null,
    snippet: getSnippet(input),
    parsedType: parsed.type,
    parsedAmount: parsed.amount,
    parsedMerchant: parsed.merchant,
    parsedMethod: parsed.method,
    parsedReference: parsed.reference,
    parsedOccurredAt: parsed.occurredAt,
    confidence: parsed.confidence,
    status,
    statusReason,
    metadata: {
      from: input.from ?? null,
      warnings: parsed.warnings
    }
  } satisfies Prisma.EmailTransactionImportUncheckedCreateInput;

  if (status === "imported") {
    const created = await prisma.$transaction(async (tx) => {
      const transaction = await createTransactionFromImport({
        db: tx,
        userId,
        parsed,
        input,
        invalidateCache: false
      });

      return tx.emailTransactionImport.create({
        data: {
          ...importData,
          transactionId: transaction.id
        },
        include: importInclude
      });
    });

    invalidateCachedFinancialContext(userId);
    return mapImport(created);
  }

  const created = await prisma.emailTransactionImport.create({
    data: importData,
    include: importInclude
  });

  return mapImport(created);
}

export async function approveEmailImport(userId: string, importId: string) {
  const record = await prisma.emailTransactionImport.findFirst({
    where: {
      id: importId,
      userId
    },
    include: importInclude
  });

  if (!record) {
    throw new HttpError("Import email tidak ditemukan", 404);
  }

  if (record.transactionId) {
    return mapImport(record);
  }

  if (!record.parsedType || !record.parsedAmount || !record.parsedOccurredAt) {
    throw new HttpError("Import belum lengkap dan perlu diedit manual", 400);
  }

  const parsed: ParsedEmailTransaction = {
    financialProvider: record.financialProvider,
    type: record.parsedType,
    amount: record.parsedAmount.toString(),
    merchant: record.parsedMerchant,
    method: record.parsedMethod,
    reference: record.parsedReference,
    occurredAt: record.parsedOccurredAt,
    confidence: record.confidence,
    warnings: []
  };

  const input = {
    body: record.snippet ?? "",
    subject: record.rawSubject ?? undefined,
    emailAddress: record.emailConnection?.emailAddress ?? undefined
  };

  const updated = await prisma.$transaction(async (tx) => {
    const transaction = await createTransactionFromImport({
      db: tx,
      userId,
      parsed,
      input,
      invalidateCache: false
    });

    return tx.emailTransactionImport.update({
      where: {
        id: record.id
      },
      data: {
        status: "imported",
        statusReason: "Disetujui user dari tab Deteksi.",
        transactionId: transaction.id
      },
      include: importInclude
    });
  });

  invalidateCachedFinancialContext(userId);
  return mapImport(updated);
}

export async function ignoreEmailImport(userId: string, importId: string) {
  const record = await prisma.emailTransactionImport.findFirst({
    where: {
      id: importId,
      userId
    },
    select: {
      id: true
    }
  });

  if (!record) {
    throw new HttpError("Import email tidak ditemukan", 404);
  }

  const updated = await prisma.emailTransactionImport.update({
    where: {
      id: record.id
    },
    data: {
      status: "ignored",
      statusReason: "Diabaikan oleh user."
    },
    include: importInclude
  });

  return mapImport(updated);
}
