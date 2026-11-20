-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "SellerAccountType" AS ENUM ('individual', 'company');

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountType" "SellerAccountType" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "shopName" VARCHAR(120) NOT NULL,
    "companyName" VARCHAR(150),
    "county" VARCHAR(100) NOT NULL,
    "town" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "SellerStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "sellerId" UUID;

-- AlterTable
ALTER TABLE "order_items"
    ADD COLUMN "sellerId" UUID,
    ADD COLUMN "sellerShopNameAtPurchase" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_userId_key" ON "seller_profiles"("userId");

-- CreateIndex
CREATE INDEX "seller_profiles_status_submittedAt_idx" ON "seller_profiles"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "seller_profiles_reviewedById_idx" ON "seller_profiles"("reviewedById");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "order_items_sellerId_idx" ON "order_items"("sellerId");

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve seller information in order items if seller-owned products already exist.
UPDATE "order_items" AS oi
SET "sellerId" = p."sellerId",
    "sellerShopNameAtPurchase" = s."shopName"
FROM "products" AS p
JOIN "seller_profiles" AS s ON s."id" = p."sellerId"
WHERE oi."productId" = p."id";
