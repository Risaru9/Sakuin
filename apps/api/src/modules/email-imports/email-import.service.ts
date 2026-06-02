import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from "node:crypto";
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
  EmailImportCleanupResponse,
  GmailAutoSyncResponse,
  GmailSyncInput,
  GmailSyncResponse,
  EmailTransactionImportResponse,
  ImportEmailInput,
  ParsedEmailTransaction
} from "./email-import.types.js";

const AUTO_IMPORT_CONFIDENCE = 0.9;
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_SEARCH_QUERY =
  'newer_than:14d (("Rp" OR "IDR") (qris OR pembayaran OR "transfer masuk" OR "transfer keluar" OR debit OR kredit OR "top up" OR refund OR cashback))';

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
type HttpResponseLike = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

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
    tokenExpiresAt: connection.accessTokenExpiresAt?.toISOString() ?? null,
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

function isGmailConfigured() {
  return Boolean(
    env.GMAIL_CLIENT_ID &&
      env.GMAIL_CLIENT_SECRET &&
      env.GMAIL_REDIRECT_URI &&
      env.EMAIL_TOKEN_ENCRYPTION_KEY
  );
}

function getEncryptionKey() {
  if (!env.EMAIL_TOKEN_ENCRYPTION_KEY) {
    throw new HttpError("EMAIL_TOKEN_ENCRYPTION_KEY belum dikonfigurasi", 500);
  }

  return createHash("sha256").update(env.EMAIL_TOKEN_ENCRYPTION_KEY).digest();
}

function encryptToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

function decryptToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) {
    throw new HttpError("Token Gmail tersimpan tidak valid", 500);
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivText, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function signOAuthState(payload: { userId: string; nonce: string; exp: number }) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env.JWT_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyOAuthState(state: string) {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    throw new HttpError("State OAuth tidak valid", 400);
  }

  const expectedSignature = createHmac("sha256", env.JWT_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new HttpError("State OAuth tidak valid", 400);
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
    userId?: string;
    exp?: number;
  };

  if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
    throw new HttpError("State OAuth sudah kedaluwarsa", 400);
  }

  return {
    userId: payload.userId
  };
}

async function postForm<T>(url: string, body: Record<string, string>) {
  const response = (await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(body)
  })) as unknown as HttpResponseLike;

  return parseGoogleResponse<T>(response, "OAuth Gmail");
}

async function gmailFetch<T>(accessToken: string, path: string) {
  const response = (await fetch(`${GMAIL_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  })) as unknown as HttpResponseLike;

  return parseGoogleResponse<T>(response, "Gmail API");
}

function parseJsonBody(body: string) {
  if (!body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: Array<{
          reason?: string;
          metadata?: Record<string, string>;
        }>;
      };
      error_description?: string;
      error_uri?: string;
    };
  } catch {
    return null;
  }
}

function getGoogleErrorMessage(context: string, status: number, body: string) {
  const parsed = parseJsonBody(body);
  const googleMessage =
    parsed?.error?.message ?? parsed?.error_description ?? body;
  const reason =
    parsed?.error?.details?.find((detail) => detail.reason)?.reason ??
    parsed?.error?.status;
  const normalizedMessage = googleMessage.toLowerCase();

  if (
    status === 403 &&
    (normalizedMessage.includes("api has not been used") ||
      normalizedMessage.includes("disabled") ||
      reason === "SERVICE_DISABLED")
  ) {
    return "Gmail API belum aktif di Google Cloud project yang dipakai OAuth Sakuin. Aktifkan Gmail API, tunggu beberapa menit, lalu coba hubungkan lagi.";
  }

  if (
    status === 403 &&
    (normalizedMessage.includes("insufficient authentication scopes") ||
      normalizedMessage.includes("insufficient permission") ||
      reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT")
  ) {
    return "Izin Gmail yang diberikan belum cukup. Putuskan koneksi Gmail jika sudah ada, lalu hubungkan ulang dan pastikan izin membaca Gmail disetujui.";
  }

  if (status === 401) {
    return "Token Gmail tidak valid atau sudah dicabut. Hubungkan Gmail ulang dari tab Deteksi.";
  }

  const compactMessage = googleMessage.replace(/\s+/g, " ").trim();
  return compactMessage
    ? `${context} gagal (${status}): ${compactMessage.slice(0, 220)}`
    : `${context} gagal (${status})`;
}

async function parseGoogleResponse<T>(
  response: HttpResponseLike,
  context: string
) {
  const body = await response.text();

  if (!response.ok) {
    throw new HttpError(
      getGoogleErrorMessage(context, response.status, body),
      502
    );
  }

  const parsed = parseJsonBody(body);
  if (!parsed) {
    throw new HttpError(`${context} mengembalikan response tidak valid`, 502);
  }

  return parsed as T;
}

type GmailTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type GmailProfileResponse = {
  emailAddress: string;
  historyId?: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
};

type GmailMessageResponse = {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: GmailMessageResponse["payload"][];
  };
};

function getHeader(message: GmailMessageResponse, name: string) {
  return (
    message.payload?.headers?.find(
      (header) => header.name.toLowerCase() === name.toLowerCase()
    )?.value ?? null
  );
}

function decodeGmailBody(data: string | undefined) {
  if (!data) {
    return "";
  }

  return Buffer.from(data, "base64url").toString("utf8");
}

function extractMessageBody(payload: GmailMessageResponse["payload"]): string {
  if (!payload) {
    return "";
  }

  const directBody = decodeGmailBody(payload.body?.data);
  const childBodies = (payload.parts ?? [])
    .map((part) => extractMessageBody(part))
    .filter(Boolean);

  return [directBody, ...childBodies].filter(Boolean).join("\n").trim();
}

function getTokenExpiry(expiresIn?: number) {
  const seconds = expiresIn ?? 3600;
  return new Date(Date.now() + Math.max(seconds - 60, 60) * 1000);
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
      parsed.hasExplicitTransactionDate &&
      parsed.isLikelyFinancialEmail &&
      parsed.financialProvider !== "Tidak Dikenal" &&
      parsed.reference &&
      !parsed.warnings.some((warning) => warning.includes("masa depan")) &&
      parsed.confidence >= AUTO_IMPORT_CONFIDENCE
  );
}

function shouldPersistImport(parsed: ParsedEmailTransaction, input: ImportEmailInput) {
  if (input.autoImport === false) {
    return true;
  }

  return Boolean(
    parsed.isLikelyFinancialEmail &&
      parsed.financialProvider !== "Tidak Dikenal" &&
      parsed.amount &&
      parsed.type
  );
}

function isSuspiciousImport(record: {
  financialProvider: string;
  parsedAmount: Prisma.Decimal | null;
  parsedType: TransactionType | null;
  parsedOccurredAt: Date | null;
  confidence: number;
  parsedMerchant: string | null;
  status: string;
}) {
  const merchant = record.parsedMerchant ?? "";
  const isFuture = record.parsedOccurredAt
    ? record.parsedOccurredAt.getTime() > Date.now() + 24 * 60 * 60 * 1000
    : false;

  return Boolean(
    record.status === "imported" &&
      (record.financialProvider === "Tidak Dikenal" ||
        !record.parsedAmount ||
        !record.parsedType ||
        !record.parsedOccurredAt ||
        record.confidence < AUTO_IMPORT_CONFIDENCE ||
        isFuture ||
        /linkedin|\.com|\.id|newsletter|notification/i.test(merchant))
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
    gmailConfigured: isGmailConfigured(),
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
  if (!isGmailConfigured() || !env.GMAIL_CLIENT_ID || !env.GMAIL_REDIRECT_URI) {
    return {
      configured: false,
      authUrl: null
    };
  }

  const state = signOAuthState({
    userId,
    nonce: randomUUID(),
    exp: Date.now() + 15 * 60 * 1000
  });
  const params = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    redirect_uri: env.GMAIL_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPE,
    state
  });

  return {
    configured: true,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  };
}

export async function handleGmailOAuthCallback(code: string, state: string) {
  if (
    !isGmailConfigured() ||
    !env.GMAIL_CLIENT_ID ||
    !env.GMAIL_CLIENT_SECRET ||
    !env.GMAIL_REDIRECT_URI
  ) {
    throw new HttpError("OAuth Gmail belum dikonfigurasi lengkap", 500);
  }

  const { userId } = verifyOAuthState(state);
  const token = await postForm<GmailTokenResponse>(GMAIL_TOKEN_URL, {
    code,
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    redirect_uri: env.GMAIL_REDIRECT_URI,
    grant_type: "authorization_code"
  });

  const profile = await gmailFetch<GmailProfileResponse>(
    token.access_token,
    "/profile"
  );
  const emailAddress = profile.emailAddress.trim().toLowerCase();
  const existingConnection = await prisma.emailConnection.findUnique({
    where: {
      userId_provider_emailAddress: {
        userId,
        provider: "gmail",
        emailAddress
      }
    }
  });

  const encryptedRefreshToken =
    token.refresh_token ?? decryptToken(existingConnection?.encryptedRefreshToken);

  if (!encryptedRefreshToken) {
    throw new HttpError(
      "Refresh token Gmail tidak diterima. Coba hubungkan ulang dengan consent penuh.",
      400
    );
  }

  const connection = await prisma.emailConnection.upsert({
    where: {
      userId_provider_emailAddress: {
        userId,
        provider: "gmail",
        emailAddress
      }
    },
    update: {
      providerAccountId: emailAddress,
      encryptedAccessToken: encryptToken(token.access_token),
      encryptedRefreshToken: token.refresh_token
        ? encryptToken(token.refresh_token)
        : existingConnection?.encryptedRefreshToken,
      accessTokenExpiresAt: getTokenExpiry(token.expires_in),
      scopes: (token.scope ?? GMAIL_SCOPE).split(/\s+/).filter(Boolean),
      status: "active",
      historyId: profile.historyId ?? existingConnection?.historyId ?? null,
      lastSyncedAt: existingConnection?.lastSyncedAt ?? null
    },
    create: {
      userId,
      provider: "gmail",
      emailAddress,
      providerAccountId: emailAddress,
      encryptedAccessToken: encryptToken(token.access_token),
      encryptedRefreshToken: encryptToken(encryptedRefreshToken),
      accessTokenExpiresAt: getTokenExpiry(token.expires_in),
      scopes: (token.scope ?? GMAIL_SCOPE).split(/\s+/).filter(Boolean),
      status: "active",
      historyId: profile.historyId ?? null
    }
  });

  return mapConnection(connection);
}

async function refreshGmailAccessToken(connection: {
  id: string;
  encryptedAccessToken: string | null;
  encryptedRefreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}) {
  const existingToken = decryptToken(connection.encryptedAccessToken);
  if (
    existingToken &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return existingToken;
  }

  if (
    !env.GMAIL_CLIENT_ID ||
    !env.GMAIL_CLIENT_SECRET ||
    !connection.encryptedRefreshToken
  ) {
    throw new HttpError("Koneksi Gmail belum lengkap", 400);
  }

  const refreshToken = decryptToken(connection.encryptedRefreshToken);
  if (!refreshToken) {
    throw new HttpError("Refresh token Gmail tidak ditemukan", 400);
  }

  const token = await postForm<GmailTokenResponse>(GMAIL_TOKEN_URL, {
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  await prisma.emailConnection.update({
    where: {
      id: connection.id
    },
    data: {
      encryptedAccessToken: encryptToken(token.access_token),
      accessTokenExpiresAt: getTokenExpiry(token.expires_in),
      status: "active"
    }
  });

  return token.access_token;
}

async function syncOneGmailConnection(
  userId: string,
  connection: {
    id: string;
    emailAddress: string;
    encryptedAccessToken: string | null;
    encryptedRefreshToken: string | null;
    accessTokenExpiresAt: Date | null;
  },
  maxMessages: number
) {
  const accessToken = await refreshGmailAccessToken(connection);
  const list = await gmailFetch<GmailListResponse>(
    accessToken,
    `/messages?${new URLSearchParams({
      q: GMAIL_SEARCH_QUERY,
      maxResults: String(maxMessages)
    }).toString()}`
  );
  const messages = list.messages ?? [];
  const result: GmailSyncResponse = {
    scanned: messages.length,
    processed: 0,
    imported: 0,
    needsReview: 0,
    duplicate: 0,
    ignored: 0
  };

  for (const messageSummary of messages) {
    const message = await gmailFetch<GmailMessageResponse>(
      accessToken,
      `/messages/${messageSummary.id}?${new URLSearchParams({
        format: "full"
      }).toString()}`
    );
    const body = extractMessageBody(message.payload) || message.snippet || "";
    if (body.trim().length < 10) {
      continue;
    }

    const imported = await importEmailTransaction(userId, {
      emailAddress: connection.emailAddress,
      from: getHeader(message, "From") ?? undefined,
      subject: getHeader(message, "Subject") ?? undefined,
      body,
      messageId: message.id,
      receivedAt: message.internalDate
        ? new Date(Number(message.internalDate))
        : undefined,
      autoImport: true
    });

    if (!imported) {
      continue;
    }

    result.processed += 1;
    if (imported.status === "imported") result.imported += 1;
    if (imported.status === "needs_review") result.needsReview += 1;
    if (imported.status === "duplicate") result.duplicate += 1;
    if (imported.status === "ignored") result.ignored += 1;
  }

  await prisma.emailConnection.update({
    where: {
      id: connection.id
    },
    data: {
      lastSyncedAt: new Date(),
      status: "active"
    }
  });

  return result;
}

export async function syncGmailTransactions(
  userId: string,
  input: GmailSyncInput = {}
) {
  const connections = await prisma.emailConnection.findMany({
    where: {
      userId,
      provider: "gmail",
      status: "active",
      encryptedRefreshToken: {
        not: null
      },
      ...(input.connectionId ? { id: input.connectionId } : {})
    },
    select: {
      id: true,
      emailAddress: true,
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      accessTokenExpiresAt: true
    }
  });

  if (connections.length === 0) {
    throw new HttpError("Belum ada koneksi Gmail aktif", 400);
  }

  const summary: GmailSyncResponse = {
    scanned: 0,
    processed: 0,
    imported: 0,
    needsReview: 0,
    duplicate: 0,
    ignored: 0
  };

  for (const connection of connections) {
    const result = await syncOneGmailConnection(
      userId,
      connection,
      input.maxMessages ?? 10
    );
    summary.scanned += result.scanned;
    summary.processed += result.processed;
    summary.imported += result.imported;
    summary.needsReview += result.needsReview;
    summary.duplicate += result.duplicate;
    summary.ignored += result.ignored;
  }

  return summary;
}

export async function runGmailAutoSync() {
  const connections = await prisma.emailConnection.findMany({
    where: {
      provider: "gmail",
      status: "active",
      encryptedRefreshToken: {
        not: null
      }
    },
    select: {
      id: true,
      userId: true,
      emailAddress: true,
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      accessTokenExpiresAt: true
    },
    orderBy: {
      lastSyncedAt: "asc"
    },
    take: 50
  });

  const summary: GmailAutoSyncResponse = {
    connections: connections.length,
    failed: 0,
    scanned: 0,
    processed: 0,
    imported: 0,
    needsReview: 0,
    duplicate: 0,
    ignored: 0,
    errors: []
  };

  for (const connection of connections) {
    try {
      const result = await syncOneGmailConnection(
        connection.userId,
        connection,
        10
      );
      summary.scanned += result.scanned;
      summary.processed += result.processed;
      summary.imported += result.imported;
      summary.needsReview += result.needsReview;
      summary.duplicate += result.duplicate;
      summary.ignored += result.ignored;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({
        connectionId: connection.id,
        emailAddress: connection.emailAddress,
        message: error instanceof Error ? error.message : "Auto-sync Gmail gagal"
      });
    }
  }

  return summary;
}

export async function disconnectGmailConnection(userId: string, connectionId: string) {
  const connection = await prisma.emailConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      provider: "gmail"
    },
    select: {
      id: true
    }
  });

  if (!connection) {
    throw new HttpError("Koneksi Gmail tidak ditemukan", 404);
  }

  const updated = await prisma.emailConnection.update({
    where: {
      id: connection.id
    },
    data: {
      status: "disconnected",
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null
    }
  });

  return mapConnection(updated);
}

export async function cleanupSuspiciousEmailImports(userId: string) {
  const imports = await prisma.emailTransactionImport.findMany({
    where: {
      userId,
      status: "imported"
    },
    select: {
      id: true,
      financialProvider: true,
      parsedAmount: true,
      parsedType: true,
      parsedOccurredAt: true,
      confidence: true,
      parsedMerchant: true,
      status: true,
      transactionId: true
    }
  });

  const suspiciousImports = imports.filter(isSuspiciousImport);
  const transactionIds = suspiciousImports
    .map((item) => item.transactionId)
    .filter((id): id is string => Boolean(id));

  if (suspiciousImports.length === 0) {
    return {
      flaggedImports: 0,
      deletedTransactions: 0,
      ignoredImports: 0
    } satisfies EmailImportCleanupResponse;
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedTransactions = transactionIds.length
      ? await tx.transaction.deleteMany({
          where: {
            id: {
              in: transactionIds
            },
            userId
          }
        })
      : { count: 0 };

    const ignoredImports = await tx.emailTransactionImport.updateMany({
      where: {
        id: {
          in: suspiciousImports.map((item) => item.id)
        },
        userId
      },
      data: {
        status: "ignored",
        statusReason:
          "Dibersihkan otomatis karena hasil deteksi email tidak cukup valid.",
        transactionId: null
      }
    });

    return {
      flaggedImports: suspiciousImports.length,
      deletedTransactions: deletedTransactions.count,
      ignoredImports: ignoredImports.count
    } satisfies EmailImportCleanupResponse;
  });

  invalidateCachedFinancialContext(userId);
  return result;
}

export async function importEmailTransaction(userId: string, input: ImportEmailInput) {
  const parsed = parseEmailTransaction(input);
  if (!shouldPersistImport(parsed, input)) {
    return null;
  }

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
    hasExplicitTransactionDate: true,
    isLikelyFinancialEmail: true,
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
