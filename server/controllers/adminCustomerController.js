const adminCustomerService = require('../services/adminCustomer.service');

// GET /api/admin/customers?search=&status=&seller=&page=&limit=
const listCustomers = async (req, res, next) => {
  try {
    return res.json(await adminCustomerService.listCustomers(req.query));
  } catch (error) {
    if (error.isAppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
    return next(error);
  }
};

module.exports = { listCustomers };
