const authService = require('../services/auth.service');

// TEMPORARY: guest cart merging is switched off until carts move to Postgres.
// When we migrate carts, the mergeGuestCartIntoUserCart call returns here.

const cartService = require('../services/cart.service');
const {
  GUEST_CART_COOKIE,
  guestCartClearOptions,
} = require('../config/cookies');

const sendError = (error, res, next) => {
  if (error.isAppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }
  return next(error);
};

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error.isAppError) return sendError(error, res, next);

    console.error('Registration error:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to create account at this time.',
    });
  }
};

const login = async (req, res, next) => {
  try {
    const user = await authService.verifyCredentials(req.body);

    // Regenerate the session after successful authentication.
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;

      req.session.save(async (saveError) => {
        if (saveError) return next(saveError);

        let cartMerged = false;
        let cartMergeMessage;

        try {
          const result = await cartService.mergeGuestCartIntoUserCart(
            user.id,
            req.cookies?.[GUEST_CART_COOKIE]
          );

          cartMerged = result.merged;

          if (result.merged) {
            res.clearCookie(GUEST_CART_COOKIE, guestCartClearOptions);
          }
        } catch (mergeError) {
          // Login still succeeds. The guest cart stays as it is.
          console.error('Guest cart merge failed:', mergeError.message);

          if (mergeError.isAppError) {
            cartMergeMessage = mergeError.message;
          }
        }

        return res.status(200).json({
          message: 'Login successful.',
          user: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            isPrimaryAdmin: user.isPrimaryAdmin || false,
          },
          cartMerged,
          ...(cartMergeMessage ? { cartMergeMessage } : {}),
        });
      });
    });
  } catch (error) {
    return sendError(error, res, next);
  }
};

const getMe = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'You are not logged in.' });
    }

    const user = await authService.getActiveUser(req.session.userId);

    if (!user) {
      return res.status(401).json({
        message: 'Your session is no longer valid.',
      });
    }

    return res.status(200).json({
      message: 'Authenticated user retrieved successfully.',
      user: {
        id: user.id,
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
    return next(error);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    // Match the cookie name configured by your Express session middleware.
    res.clearCookie('ecommerce.sid', { path: '/' });

    return res.status(200).json({ message: 'Logout successful.' });
  });
};

module.exports = { register, login, getMe, logout };