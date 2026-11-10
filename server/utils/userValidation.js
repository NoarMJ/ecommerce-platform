const AppError = require('./AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks and cleans the fields shared by register and create-admin
const validateSignupFields = ({
  firstName,
  lastName,
  email,
  password,
  phoneNumber,
} = {}) => {
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
    throw new AppError(
      'First name, last name, email and password are required.',
      400
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('Please provide a valid email address.', 400);
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new AppError(
      'Password must be at least 8 characters and no more than 72 UTF-8 bytes.',
      400
    );
  }

  if (firstName.trim().length > 50 || lastName.trim().length > 50) {
    throw new AppError('Names must not exceed 50 characters.', 400);
  }

  if (
    phoneNumber !== undefined &&
    (typeof phoneNumber !== 'string' || phoneNumber.trim().length > 30)
  ) {
    throw new AppError(
      'Phone number must be text of no more than 30 characters.',
      400
    );
  }

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password,
    phoneNumber: phoneNumber?.trim() || '',
  };
};

module.exports = { validateSignupFields };