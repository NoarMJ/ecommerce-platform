const PUBLIC_SELLER_FILTER = {
  OR: [{ sellerId: null }, { seller: { status: 'approved' } }],
};

// Combine with any existing where object without overwriting its own OR/AND.
const withPublicVisibility = (where = {}) => ({
  AND: [where, PUBLIC_SELLER_FILTER],
});

// Add to `include` / `select` on buyer-facing queries so the badge can be computed.
const SELLER_BADGE_INCLUDE = { seller: { select: { status: true } } };

// Replaces the raw seller relation with a boolean. Seller identity is not exposed.
function withSellerBadge(product) {
  if (!product) return product;
  const { seller, ...rest } = product;
  return { ...rest, isApprovedSeller: Boolean(seller && seller.status === 'approved') };
}

module.exports = {
  PUBLIC_SELLER_FILTER,
  withPublicVisibility,
  SELLER_BADGE_INCLUDE,
  withSellerBadge,
};
