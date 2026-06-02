import type { TransactionType } from "@prisma/client";

export type EmailImportStatus =
  | "imported"
  | "needs_review"
  | "ignored"
  | "duplicate";

export type ParsedEmailTransaction = {
  financialProvider: string;
  type: TransactionType | null;
  amount: string | null;
  merchant: string | null;
  method: string | null;
  reference: string | null;
  occurredAt: Date | null;
  confidence: number;
  warnings: string[];
};

export type ImportEmailInput = {
  emailAddress?: string;
  from?: string;
  subject?: string;
  body: string;
  messageId?: string;
  receivedAt?: Date;
  autoImport?: boolean;
};

export type GmailSyncInput = {
  connectionId?: string;
  maxMessages?: number;
};

export type GmailSyncResponse = {
  scanned: number;
  processed: number;
  imported: number;
  needsReview: number;
  duplicate: number;
  ignored: number;
};

export type EmailConnectionResponse = {
  id: string;
  provider: string;
  emailAddress: string;
  status: string;
  detectedProviders: string[];
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
};

export type EmailTransactionImportResponse = {
  id: string;
  emailConnectionId: string | null;
  emailAddress: string | null;
  financialProvider: string;
  type: TransactionType | null;
  amount: string | null;
  merchant: string | null;
  method: string | null;
  reference: string | null;
  occurredAt: string | null;
  confidence: number;
  status: EmailImportStatus;
  statusReason: string | null;
  transactionId: string | null;
  categoryName: string | null;
  note: string | null;
  rawSubject: string | null;
  snippet: string | null;
  createdAt: string;
};
