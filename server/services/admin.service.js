const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');
const { validateSignupFields } = require('../utils/userValidation');
const ADMIN_PERMISSIONS = require('../config/adminPermissions');

const BCRYPT_ROUNDS = 12;

const getAdmins = () => userRepository.findAdmins();

// Creates an administrator with no permissions initially.
const createAdmin = async (body) => {
  const data = validateSignupFields(body);

  if (await userRepository.emailExists(data.email)) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  try {
    return await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      phoneNumber: data.phoneNumber,
      role: 'admin',
      permissions: [],
      isPrimaryAdmin: false,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('An account with this email already exists.', 409);
    }
    throw error;
  }
};

// Only the primary administrator may grant or revoke permissions.
const updateAdminPermissions = async (actingUser, id, permissions) => {
  if (!actingUser || !actingUser.isPrimaryAdmin) {
    throw new AppError(
      'Only the primary administrator can assign permissions.',
      403
    );
  }

  if (
    !Array.isArray(permissions) ||
    !permissions.every(
      (permission) =>
        typeof permission === 'string' &&
        ADMIN_PERMISSIONS.includes(permission)
    )
  ) {
    const error = new AppError(
      'Provide an array containing only valid permissions.',
      400
    );
    error.availablePermissions = ADMIN_PERMISSIONS;
    throw error;
  }

  const notFound = () =>
    new AppError('Administrator not found or cannot be modified.', 404);

  if (!isUuid(id)) throw notFound();

  const admin = await userRepository.findEditableAdminById(id);
  if (!admin) throw notFound();

  return userRepository.updatePermissions(id, [...new Set(permissions)]);
};

module.exports = { getAdmins, createAdmin, updateAdminPermissions };