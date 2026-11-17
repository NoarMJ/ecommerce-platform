const sellerService = require('../services/seller.service.js');

const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({ 
        status: 'error',
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
    });
  } return next(error);
     };
// Thin wrapper: pass the authenticated user's id and the body to the service.
const handle = (serviceMethod, statusCode = 200) => 
    async (req, res, next) => {
  try {
    const seller = await serviceMethod(req.userId, req.body);
   return res.status(statusCode).json({ seller });
  } catch (err) {
   return sendError(err, res, next);
  }
};
 
module.exports = {
  submitApplication: handle(sellerService.submitApplication, 201),
  getMyApplication: handle(sellerService.getMyApplication),
  updateMyApplication: handle(sellerService.updateMyApplication),
  resubmitApplication: handle(sellerService.resubmitApplication),
};
