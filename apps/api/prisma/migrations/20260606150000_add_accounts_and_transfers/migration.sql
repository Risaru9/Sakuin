CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'SAVINGS', 'OTHER');

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "initialBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Account" (
    "id",
    "userId",
    "name",
    "type",
    "initialBalance",
    "icon",
    "color",
    "isArchived",
    "createdAt",
    "updatedAt"
)
SELECT
    'account_default_' || "id",
    "id",
    'Dompet Utama',
    'CASH'::"AccountType",
    0,
    'wallet',
    '#2563eb',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

ALTER TABLE "Transaction" ADD COLUMN "accountId" TEXT;

UPDATE "Transaction"
SET "accountId" = 'account_default_' || "userId";

CREATE TABLE "AccountTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");
CREATE INDEX "Account_userId_isArchived_idx" ON "Account"("userId", "isArchived");
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");
CREATE INDEX "AccountTransfer_userId_date_idx" ON "AccountTransfer"("userId", "date");
CREATE INDEX "AccountTransfer_fromAccountId_date_idx" ON "AccountTransfer"("fromAccountId", "date");
CREATE INDEX "AccountTransfer_toAccountId_date_idx" ON "AccountTransfer"("toAccountId", "date");

ALTER TABLE "Account"
ADD CONSTRAINT "Account_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountTransfer"
ADD CONSTRAINT "AccountTransfer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountTransfer"
ADD CONSTRAINT "AccountTransfer_fromAccountId_fkey"
FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountTransfer"
ADD CONSTRAINT "AccountTransfer_toAccountId_fkey"
FOREIGN KEY ("toAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
