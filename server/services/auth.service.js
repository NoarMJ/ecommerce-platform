const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const { isUuid } = require('../utils/ids');
const { validateSignupFields } = require('../utils/userValidation');

const BCRYPT_ROUNDS = 12;

const register = async (body) => {
  const data = validateSignupFields(body);

  if (await userRepository.emailExists(data.email)) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  try {
    // Public registration always creates a customer
    return await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      phoneNumber: data.phoneNumber,
      role: 'customer',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('An account with this email already exists.', 409);
    }
    throw error;
  }
};

// Checks the email and password. Returns the user without the hash.
const verifyCredentials = async ({ email, password } = {}) => {
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await userRepository.findByEmailWithHash(
    email.trim().toLowerCase()
  );

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password.', 401);
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// For middleware and /me. Returns null for old Mongo ids or inactive users.
const getActiveUser = async (id) => {
  if (!isUuid(id)) return null;

  const user = await userRepository.findPublicById(id);
  return user && user.isActive ? user : null;
};

module.exports = { register, verifyCredentials, getActiveUser };