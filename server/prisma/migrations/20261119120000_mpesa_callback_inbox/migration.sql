CREATE TYPE "MpesaCallbackEventStatus" AS ENUM (
  'pending',
  'unmatched',
  'processed',
  'failed',
  'invalid'
);

CREATE TABLE "mpesa_callback_events" (
  "id" UUID NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "checkoutRequestId" TEXT,
  "status" "MpesaCallbackEventStatus" NOT NULL DEFAULT 'pending',
  "body" JSONB NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mpesa_callback_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mpesa_callback_events_payloadHash_key"
  ON "mpesa_callback_events"("payloadHash");

CREATE INDEX "mpesa_callback_events_status_receivedAt_idx"
  ON "mpesa_callback_events"("status", "receivedAt");

CREATE INDEX "mpesa_callback_events_checkoutRequestId_idx"
  ON "mpesa_callback_events"("checkoutRequestId");
