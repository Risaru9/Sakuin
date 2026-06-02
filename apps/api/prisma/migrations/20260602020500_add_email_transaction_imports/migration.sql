-- Email connections used by Gmail transaction detection.
CREATE TABLE "EmailConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "scopes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "historyId" TEXT,
    "detectedProviders" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailTransactionImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailConnectionId" TEXT,
    "gmailMessageId" TEXT,
    "emailFingerprint" TEXT NOT NULL,
    "transactionFingerprint" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL DEFAULT 'gmail',
    "financialProvider" TEXT NOT NULL,
    "rawSubject" TEXT,
    "snippet" TEXT,
    "parsedType" "TransactionType",
    "parsedAmount" DECIMAL(18,2),
    "parsedMerchant" TEXT,
    "parsedMethod" TEXT,
    "parsedReference" TEXT,
    "parsedOccurredAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "statusReason" TEXT,
    "transactionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTransactionImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailConnection_userId_provider_emailAddress_key" ON "EmailConnection"("userId", "provider", "emailAddress");
CREATE INDEX "EmailConnection_userId_status_idx" ON "EmailConnection"("userId", "status");

CREATE UNIQUE INDEX "EmailTransactionImport_transactionId_key" ON "EmailTransactionImport"("transactionId");
CREATE UNIQUE INDEX "EmailTransactionImport_userId_emailFingerprint_key" ON "EmailTransactionImport"("userId", "emailFingerprint");
CREATE INDEX "EmailTransactionImport_userId_status_createdAt_idx" ON "EmailTransactionImport"("userId", "status", "createdAt");
CREATE INDEX "EmailTransactionImport_userId_transactionFingerprint_idx" ON "EmailTransactionImport"("userId", "transactionFingerprint");
CREATE INDEX "EmailTransactionImport_emailConnectionId_createdAt_idx" ON "EmailTransactionImport"("emailConnectionId", "createdAt");

ALTER TABLE "EmailConnection" ADD CONSTRAINT "EmailConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailTransactionImport" ADD CONSTRAINT "EmailTransactionImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailTransactionImport" ADD CONSTRAINT "EmailTransactionImport_emailConnectionId_fkey" FOREIGN KEY ("emailConnectionId") REFERENCES "EmailConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailTransactionImport" ADD CONSTRAINT "EmailTransactionImport_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
