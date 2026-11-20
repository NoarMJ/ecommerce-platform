CREATE TYPE "CategoryApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ItemFulfilmentStatus" AS ENUM ('awaiting_payment', 'approved', 'processed', 'dispatched', 'delivered', 'cancellation_requested', 'cancelled');

ALTER TABLE "categories" ADD COLUMN "approvalStatus" "CategoryApprovalStatus" NOT NULL DEFAULT 'approved';
ALTER TABLE "categories" ADD COLUMN "createdBySellerId" UUID;
ALTER TABLE "categories" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "reviewedById" UUID;
ALTER TABLE "categories" ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "products" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "order_items" ADD COLUMN "fulfilmentStatus" "ItemFulfilmentStatus" NOT NULL DEFAULT 'awaiting_payment';
ALTER TABLE "order_items" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3);
ALTER TABLE "order_items" ADD COLUMN "cancellationRequestReason" TEXT;

UPDATE "order_items" oi SET "fulfilmentStatus" = CASE
  WHEN o."orderStatus" = 'delivered' THEN 'delivered'::"ItemFulfilmentStatus"
  WHEN o."orderStatus" = 'shipped' THEN 'dispatched'::"ItemFulfilmentStatus"
  WHEN o."orderStatus" = 'processing' THEN 'processed'::"ItemFulfilmentStatus"
  WHEN o."paymentStatus" = 'paid' THEN 'approved'::"ItemFulfilmentStatus"
  ELSE 'awaiting_payment'::"ItemFulfilmentStatus"
END FROM "orders" o WHERE oi."orderId" = o."id";
