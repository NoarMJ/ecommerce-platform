const sellerRepository = require('../repositories/seller.repository');

// Like requireApprovedSeller, but a SUSPENDED seller may still read orders that
// were already placed with them, so they can finish fulfilling them.
// Pending and rejected applicants have no orders and are refused.
module.exports = async function requireSellerOrderAccess(req, res, next) {
  try {
    const profile = await sellerRepository.findByUserId(req.userId);

    if (!profile || !['approved', 'suspended'].includes(profile.status)) {
      return res.status(403).json({
        status: 'error',
        message: 'Seller orders are available to approved sellers only.',
      });
    }

    req.seller = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};
