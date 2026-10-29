
const bcrypt = require('bcrypt');
const User = require('../models/user');
const ADMIN_PERMISSIONS = require('../config/adminPermissions');

// Return administrator accounts without exposing password hashes.
const getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('firstName lastName email phoneNumber role permissions isPrimaryAdmin isActive createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

// Create an administrator with no permissions initially.
const createAdmin = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'First name, last name, email and password are required.',
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters and no more than 72 UTF-8 bytes.',
      });
    }

    if (firstName.trim().length > 50 || lastName.trim().length > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Names must not exceed 50 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: passwordHash,
      phoneNumber:
        typeof phoneNumber === 'string' ? phoneNumber.trim() : '',
      role: 'admin',
      permissions: [],
      isPrimaryAdmin: false,
    });

    res.status(201).json({
      status: 'success',
      message: 'Administrator account created successfully.',
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isPrimaryAdmin: admin.isPrimaryAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Only the primary administrator may grant or revoke permissions.
const updateAdminPermissions = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isPrimaryAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the primary administrator can assign permissions.',
      });
    }

    const { permissions } = req.body;

    if (
      !Array.isArray(permissions) ||
      !permissions.every(
        (permission) =>
          typeof permission === 'string' &&
          ADMIN_PERMISSIONS.includes(permission)
      )
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide an array containing only valid permissions.',
        availablePermissions: ADMIN_PERMISSIONS,
      });
    }

    const admin = await User.findOne({
      _id: req.params.id,
      role: 'admin',
      isPrimaryAdmin: false,
    });

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Administrator not found or cannot be modified.',
      });
    }

    admin.permissions = [...new Set(permissions)];
    await admin.save();

    res.status(200).json({
      status: 'success',
      message: 'Administrator permissions updated successfully.',
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdmins,
  createAdmin,
  updateAdminPermissions,
};
