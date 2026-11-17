const adminSellerService = require('../services/adminseller.service');
 
// Same shape as sellerController.js; reuse your shared helper if you have one.
const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }
  return next(error);
};
 
const listSellers = async (req, res, next) => {
  try {
    return res.json(await adminSellerService.listSellers(req.query));
  } catch (err) {
    return sendError(err, res, next);
  }
};
 
const getSeller = async (req, res, next) => {
  try {
    const seller = await adminSellerService.getSeller(req.params.id);
    return res.json({ seller });
  } catch (err) {
    return sendError(err, res, next);
  }
};
 
const review = (action) => async (req, res, next) => {
  try {
    const seller = await adminSellerService.reviewSeller(
      req.user.id,
      req.params.id,
      action,
      req.body
    );
    return res.json({ seller });
  } catch (err) {
    return sendError(err, res, next);
  }
};
 
module.exports = {
  listSellers,
  getSeller,
  approveSeller: review('approve'),
  rejectSeller: review('reject'),
  suspendSeller: review('suspend'),
  reactivateSeller: review('reactivate'),
};
 