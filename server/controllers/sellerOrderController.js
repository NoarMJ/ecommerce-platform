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
  advanceItem: respond(async (req) => ({
    item: await sellerOrderService.advanceMyItem(req.seller.id, req.params.itemId, req.body.action),
  })),
  dashboard: respond(async (req) => ({
    overview: await sellerOrderService.getDashboardOverview(req.seller.id),
  })),
  requestCancellation: respond(async (req) => ({
    result: await sellerOrderService.requestMyItemCancellation(req.seller.id, req.params.itemId, req.body.reason),
  })),
  adminCancelItem: respond(async (req) => ({
    item: await sellerOrderService.adminCancelItem(req.userId, req.params.itemId),
  })),
};
