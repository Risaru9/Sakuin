-- Bring the migration history back in sync with schema.prisma.
-- Category.limit is read by category and summary endpoints.
ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "limit" DECIMAL(18,2);

-- AI chat history persistence used by the assistant module.
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "cards" JSONB,
    "suggestions" JSONB,
    "transactionDraft" JSONB,
    "transactionDrafts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx"
ON "ChatMessage"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ChatMessage_userId_fkey'
  ) THEN
    ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
