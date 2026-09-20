import { apiRequest } from "../../lib/api-client";

export type EmailImportStatus = "imported" | "needs_review" | "ignored" | "duplicate";

export type EmailConnection = {
  id: string;
  provider: string;
  emailAddress: string;
  status: string;
  detectedProviders: string[];
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
};

export type EmailTransactionImport = {
  id: string;
  emailConnectionId: string | null;
  emailAddress: string | null;
  financialProvider: string;
  type: "INCOME" | "EXPENSE" | null;
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

export type EmailImportOverview = {
  gmailConfigured: boolean;
  connections: EmailConnection[];
  recentImports: EmailTransactionImport[];
  stats: {
    imported: number;
    needsReview: number;
    duplicate: number;
    ignored: number;
  };
};

export type ImportEmailInput = {
  emailAddress?: string;
  from?: string;
  subject?: string;
  body: string;
  messageId?: string;
  autoImport?: boolean;
};

export type GmailSyncInput = {
  connectionId?: string;
  maxMessages?: number;
};

export type GmailSyncResult = {
  scanned: number;
  processed: number;
  imported: number;
  needsReview: number;
  duplicate: number;
  ignored: number;
};

export type EmailImportCleanupResult = {
  flaggedImports: number;
  deletedTransactions: number;
  ignoredImports: number;
};

export function getEmailImportOverview() {
  return apiRequest<EmailImportOverview>("/api/email-imports/overview");
}

export function getGmailAuthUrl() {
  return apiRequest<{ configured: boolean; authUrl: string | null }>(
    "/api/email-imports/gmail/auth-url"
  );
}

export function syncGmail(input: GmailSyncInput = {}) {
  return apiRequest<GmailSyncResult>("/api/email-imports/gmail/sync", {
    method: "POST",
    body: input
  });
}

export function disconnectGmail(connectionId: string) {
  return apiRequest<EmailConnection>(
    `/api/email-imports/gmail/connections/${connectionId}/disconnect`,
    {
      method: "POST"
    }
  );
}

export function cleanupEmailImports() {
  return apiRequest<EmailImportCleanupResult>("/api/email-imports/cleanup", {
    method: "POST"
  });
}

export function importEmail(input: ImportEmailInput) {
  return apiRequest<EmailTransactionImport | null>("/api/email-imports/import-email", {
    method: "POST",
    body: input
  });
}

export function approveEmailImport(importId: string) {
  return apiRequest<EmailTransactionImport>(
    `/api/email-imports/imports/${importId}/approve`,
    {
      method: "POST"
    }
  );
}

export function ignoreEmailImport(importId: string) {
  return apiRequest<EmailTransactionImport>(
    `/api/email-imports/imports/${importId}/ignore`,
    {
      method: "POST"
    }
  );
}
