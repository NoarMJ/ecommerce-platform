-- CreateEnum
CREATE TYPE "FulfilmentStatus" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- CreateTable
CREATE TABLE "seller_fulfilments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "FulfilmentStatus" NOT NULL DEFAULT 'pending',
    "courier" VARCHAR(80),
    "trackingNumber" VARCHAR(80),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_fulfilments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_fulfilment_history" (
    "id" UUID NOT NULL,
    "fulfilmentId" UUID NOT NULL,
    "status" "FulfilmentStatus" NOT NULL,
    "note" VARCHAR(200),
    "changedById" UUID,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_fulfilment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_fulfilments_orderId_sellerId_key" ON "seller_fulfilments"("orderId", "sellerId");

-- CreateIndex
CREATE INDEX "seller_fulfilments_sellerId_status_idx" ON "seller_fulfilments"("sellerId", "status");

-- CreateIndex
CREATE INDEX "seller_fulfilment_history_fulfilmentId_changedAt_idx" ON "seller_fulfilment_history"("fulfilmentId", "changedAt");

-- AddForeignKey
ALTER TABLE "seller_fulfilments" ADD CONSTRAINT "seller_fulfilments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfilments" ADD CONSTRAINT "seller_fulfilments_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfilment_history" ADD CONSTRAINT "seller_fulfilment_history_fulfilmentId_fkey"
    FOREIGN KEY ("fulfilmentId") REFERENCES "seller_fulfilments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_fulfilment_history" ADD CONSTRAINT "seller_fulfilment_history_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Repair: any order item for a seller's product that was saved without its
-- seller gets the product's seller, so every past sale shows for its seller.
UPDATE "order_items" oi
SET "sellerId" = p."sellerId",
    "sellerShopNameAtPurchase" = COALESCE(oi."sellerShopNameAtPurchase", sp."shopName")
FROM "products" p
JOIN "seller_profiles" sp ON sp."id" = p."sellerId"
WHERE oi."productId" = p."id"
  AND oi."sellerId" IS NULL
  AND p."sellerId" IS NOT NULL;

-- One fulfilment per (order, seller) for existing orders, starting at the
-- order's current status.
INSERT INTO "seller_fulfilments" ("id", "orderId", "sellerId", "status", "shippedAt", "deliveredAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), o."id", x."sellerId",
       o."orderStatus"::text::"FulfilmentStatus",
       CASE WHEN o."orderStatus" IN ('shipped', 'delivered') THEN o."updatedAt" END,
       CASE WHEN o."orderStatus" = 'delivered' THEN o."updatedAt" END,
       o."createdAt", CURRENT_TIMESTAMP
FROM "orders" o
JOIN (SELECT DISTINCT "orderId", "sellerId" FROM "order_items" WHERE "sellerId" IS NOT NULL) x
  ON x."orderId" = o."id";

INSERT INTO "seller_fulfilment_history" ("id", "fulfilmentId", "status", "note", "changedAt")
SELECT gen_random_uuid(), f."id", f."status", 'Status on record when seller tracking started', f."createdAt"
FROM "seller_fulfilments" f;
