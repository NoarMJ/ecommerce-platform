
const bcrypt = require('bcrypt');
const User = require('../models/user');
const {
  mergeGuestCartIntoUserCart,
} = require('../services/cartService');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // 1. Validate required fields.
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

    // 2. Normalize and validate email.
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    // 3. Validate password and profile fields.
    if (
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        status: 'error',
        message:
          'Password must be at least 8 characters and no more than 72 UTF-8 bytes.',
      });
    }

    if (firstName.trim().length > 50 || lastName.trim().length > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Names must not exceed 50 characters.',
      });
    }

    if (
      phoneNumber !== undefined &&
      (typeof phoneNumber !== 'string' ||
        phoneNumber.trim().length > 30)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number must be text of no more than 30 characters.',
      });
    }

    // 4. Prevent duplicate accounts.
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    // 5. Hash the password.
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. Public registration always creates a customer.
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: passwordHash,
      phoneNumber: phoneNumber?.trim() || '',
      role: 'customer',
    });

    // 7. Return safe account details.
    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to create account at this time.',
    });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    // Retrieve the password hash because the model excludes it by default.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // Regenerate the session after successful authentication.
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user._id.toString();

      req.session.save(async (saveError) => {
        if (saveError) return next(saveError);

        try {
          const guestToken = req.cookies?.guestCartToken;

          const result = await mergeGuestCartIntoUserCart(
            user._id,
            guestToken
          );

          if (result.merged) {
            res.clearCookie('guestCartToken', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            });
          }

          return res.status(200).json({
            message: 'Login successful.',
            user: {
              id: user._id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              role: user.role,
              permissions: user.permissions || [],
              isPrimaryAdmin: user.isPrimaryAdmin || false,
            },
            cartMerged: result.merged,
          });
        } catch (error) {
          return next(error);
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        message: 'You are not logged in.',
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Your session is no longer valid.',
      });
    }

    return res.status(200).json({
      message: 'Authenticated user retrieved successfully.',
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        permissions: user.permissions || [],
        isPrimaryAdmin: user.isPrimaryAdmin || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    // Match the cookie name configured by your Express session middleware.
    res.clearCookie('ecommerce.sid', {
      path: '/',
    });

    return res.status(200).json({
      message: 'Logout successful.',
    });
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
