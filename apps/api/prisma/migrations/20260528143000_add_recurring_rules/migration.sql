-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "autoPost" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRuleRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurringRuleId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringRuleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringRule_userId_isActive_nextRunAt_idx" ON "RecurringRule"("userId", "isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringRule_categoryId_idx" ON "RecurringRule"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringRuleRun_recurringRuleId_occurrenceDate_key" ON "RecurringRuleRun"("recurringRuleId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "RecurringRuleRun_userId_occurrenceDate_idx" ON "RecurringRuleRun"("userId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRuleRun" ADD CONSTRAINT "RecurringRuleRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRuleRun" ADD CONSTRAINT "RecurringRuleRun_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
