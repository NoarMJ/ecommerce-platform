const sellerOrderService = require('../services/sellerOrder.service');

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

const respond = (getPayload) => async (req, res, next) => {
  try {
    return res.json(await getPayload(req));
  } catch (err) {
    return sendError(err, res, next);
  }
};

module.exports = {
  listOrders: respond((req) => sellerOrderService.listMyOrders(req.seller.id, req.query)),
  getOrder: respond(async (req) => ({
    order: await sellerOrderService.getMyOrder(req.seller.id, req.params.id),
  })),
};
