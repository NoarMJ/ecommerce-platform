const sellerProductService = require('../services/sellerProduct.service');

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

// `getPayload(req)` returns the JSON to send back.
const respond = (getPayload, statusCode = 200) => async (req, res, next) => {
  try {
    return res.status(statusCode).json(await getPayload(req));
  } catch (err) {
    return sendError(err, res, next);
  }
};

module.exports = {
  listProducts: respond((req) =>
    sellerProductService.listMyProducts(req.seller.id, req.query)
  ),
  getProduct: respond(async (req) => ({
    product: await sellerProductService.getMyProduct(req.seller.id, req.params.id),
  })),
  createProduct: respond(
    async (req) => ({
      product: await sellerProductService.createMyProduct(req.seller.id, req.body),
    }),
    201
  ),
  updateProduct: respond(async (req) => ({
    product: await sellerProductService.updateMyProduct(
      req.seller.id,
      req.params.id,
      req.body,
      req.userId
    ),
  })),
  deactivateProduct: respond(async (req) => ({
    product: await sellerProductService.setMyProductActive(
      req.seller.id,
      req.params.id,
      false
    ),
  })),
  activateProduct: respond(async (req) => ({
    product: await sellerProductService.setMyProductActive(
      req.seller.id,
      req.params.id,
      true
    ),
  })),
};
