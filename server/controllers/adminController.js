const adminService = require('../services/admin.service');

const sendError = (error, res, next) => {
  if (error.isAppError) {
    const body = { status: 'error', message: error.message };

    if (error.availablePermissions) {
      body.availablePermissions = error.availablePermissions;
    }

    return res.status(error.statusCode).json(body);
  }
  return next(error);
};

// Return administrator accounts without exposing password hashes.
const getAdmins = async (req, res, next) => {
  try {
    const admins = await adminService.getAdmins();

    res.status(200).json({
      status: 'success',
      results: admins.length,
      // _id is a temporary bridge for the frontend
      data: admins.map((admin) => ({ ...admin, _id: admin.id })),
    });
  } catch (error) {
    sendError(error, res, next);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.createAdmin(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Administrator account created successfully.',
      data: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isPrimaryAdmin: admin.isPrimaryAdmin,
      },
    });
  } catch (error) {
    sendError(error, res, next);
  }
};

const updateAdminPermissions = async (req, res, next) => {
  try {
    const admin = await adminService.updateAdminPermissions(
      req.user,
      req.params.id,
      req.body.permissions
    );

    res.status(200).json({
      status: 'success',
      message: 'Administrator permissions updated successfully.',
      data: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    sendError(error, res, next);
  }
};

module.exports = { getAdmins, createAdmin, updateAdminPermissions };