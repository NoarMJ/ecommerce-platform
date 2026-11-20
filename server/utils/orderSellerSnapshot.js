const AppError = require('./AppError');

// Use inside your order-creation transaction when you load the cart's products:
//   tx.product.findMany({ where: { id: { in: ids } }, include: PURCHASE_PRODUCT_INCLUDE })
const PURCHASE_PRODUCT_INCLUDE = {
  seller: { select: { id: true, shopName: true, status: true } },
};

// Re-check at checkout time. A seller may have been suspended after the item
// was added to the cart. This FAILS CLOSED: a product that has a seller but
// whose seller data was not loaded (forgot PURCHASE_PRODUCT_INCLUDE) is
// treated as unavailable rather than silently allowed.
function assertProductsPurchasable(products) {
  const unavailable = products.filter(
    (product) =>
      !product.isActive ||
      (product.sellerId && (!product.seller || product.seller.status !== 'approved'))
  );

  if (unavailable.length > 0) {
    const error = new AppError(
      'Some items are no longer available. Remove them from your cart and try again.',
      409
    );
    error.details = { unavailableProductIds: unavailable.map((product) => product.id) };
    throw error;
  }
}

// Spread into each order item's create data. Platform products get nulls.
const sellerSnapshotFields = (product) => ({
  sellerId: product.sellerId || null,
  sellerShopNameAtPurchase: product.seller ? product.seller.shopName : null,
});

// Buyers do not see seller identity. Use on every customer-facing order item.
function stripSellerFields(item) {
  const { sellerId, sellerShopNameAtPurchase, ...rest } = item;
  return rest;
}

module.exports = {
  PURCHASE_PRODUCT_INCLUDE,
  assertProductsPurchasable,
  sellerSnapshotFields,
  stripSellerFields,
};
