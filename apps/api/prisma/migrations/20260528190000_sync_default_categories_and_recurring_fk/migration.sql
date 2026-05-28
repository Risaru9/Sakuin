-- Keep required default categories available even when a database is restored or
-- tests have been run against a persistent test database.
INSERT INTO "Category" ("id", "userId", "name", "type", "icon", "color", "isDefault", "createdAt", "updatedAt")
VALUES
  ('cat_income_salary', NULL, 'Gaji', 'INCOME'::"TransactionType", 'wallet', '#22c55e', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_income_bonus', NULL, 'Bonus', 'INCOME'::"TransactionType", 'gift', '#84cc16', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_income_other', NULL, 'Pemasukan Lainnya', 'INCOME'::"TransactionType", 'plus-circle', '#14b8a6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_food', NULL, 'Makanan', 'EXPENSE'::"TransactionType", 'utensils', '#f97316', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_transport', NULL, 'Transportasi', 'EXPENSE'::"TransactionType", 'car', '#3b82f6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_shopping', NULL, 'Belanja', 'EXPENSE'::"TransactionType", 'shopping-bag', '#ec4899', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_education', NULL, 'Pendidikan', 'EXPENSE'::"TransactionType", 'book-open', '#8b5cf6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_health', NULL, 'Kesehatan', 'EXPENSE'::"TransactionType", 'heart-pulse', '#ef4444', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_bill', NULL, 'Tagihan', 'EXPENSE'::"TransactionType", 'receipt', '#64748b', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_expense_other', NULL, 'Pengeluaran Lainnya', 'EXPENSE'::"TransactionType", 'minus-circle', '#6b7280', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "userId" = EXCLUDED."userId",
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "icon" = EXCLUDED."icon",
  "color" = EXCLUDED."color",
  "isDefault" = EXCLUDED."isDefault",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Remove a previously test-created default category only when it is unused.
DELETE FROM "Category" c
WHERE c."id" = 'cat_expense_fuel'
  AND c."userId" IS NULL
  AND c."isDefault" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Transaction" t WHERE t."categoryId" = c."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RecurringRule" r WHERE r."categoryId" = c."id"
  );

-- Prepare existing data before adding the optional transaction foreign key.
UPDATE "RecurringRuleRun" rr
SET "transactionId" = NULL
WHERE rr."transactionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Transaction" t WHERE t."id" = rr."transactionId"
  );

CREATE INDEX "RecurringRuleRun_transactionId_idx" ON "RecurringRuleRun"("transactionId");

ALTER TABLE "RecurringRuleRun"
ADD CONSTRAINT "RecurringRuleRun_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
