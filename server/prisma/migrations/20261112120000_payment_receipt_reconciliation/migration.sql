ALTER TABLE "payments"
ADD COLUMN "reconciliationReceipt" TEXT,
ADD COLUMN "reconciliationConversationId" TEXT,
ADD COLUMN "reconciliationStatus" TEXT,
ADD COLUMN "reconciliationRequestedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "payments_reconciliationReceipt_key"
ON "payments"("reconciliationReceipt");

CREATE UNIQUE INDEX "payments_reconciliationConversationId_key"
ON "payments"("reconciliationConversationId");

CREATE TABLE "payment_receipt_verifications" (
  "id" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "receipt" TEXT NOT NULL,
  "conversationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resultCode" INTEGER,
  "resultDesc" TEXT,
  "rawCallback" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_receipt_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_receipt_verifications_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payment_receipt_verifications_receipt_key"
ON "payment_receipt_verifications"("receipt");

CREATE UNIQUE INDEX "payment_receipt_verifications_conversationId_key"
ON "payment_receipt_verifications"("conversationId");

CREATE INDEX "payment_receipt_verifications_paymentId_createdAt_idx"
ON "payment_receipt_verifications"("paymentId", "createdAt");
