
const bcrypt = require('bcrypt');
const User = require('../models/user');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // 1. Check required fields.
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

    // 2. Normalize the email address.
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Apply basic validation.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
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

    if (
      phoneNumber !== undefined &&
      (typeof phoneNumber !== 'string' || phoneNumber.trim().length > 30)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number must be text of no more than 30 characters.',
      });
    }

    // 4. Check whether the email is already registered.
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    // 5. Hash the password before saving it.
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. Create the account.
    // The public request cannot choose its own role.
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: passwordHash,
      phoneNumber: phoneNumber?.trim() || '',
      role: 'customer',
    });

    // 7. Return safe account details only.
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
    // The database unique index also protects against simultaneous
    // registration requests using the same email.
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

    // Check that both fields were supplied.
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    // Find the user and retrieve the password hash.
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

  
    console.log('Login diagnostic:', {
    userFound: Boolean(user),
    passwordReceived: typeof password === 'string',
     passwordHashRetrieved: typeof user.password === 'string',
     passwordHashLength:
     typeof user.password === 'string'
         ? user.password.length
         : 0,
    });

const passwordMatches = await bcrypt.compare(
  password,
  user.password
);

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // Prevent an existing session from being reused after login.
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user._id.toString();

      req.session.save((err) => {
        if (err) return next(err);

        return res.status(200).json({
          message: 'Login successful.',
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          },
        });
      });
    });
  } catch (error) {
    next(error);
  }
};



const getMe = async (req, res, next) => {
  try {
    // 1. Check whether the session contains a user ID.
    if (!req.session.userId) {
      return res.status(401).json({
        message: 'You are not logged in.',
      });
    }

    // 2. Find the account associated with the session.
    const user = await User.findById(req.session.userId);

    // 3. Handle accounts that no longer exist or are disabled.
    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Your session is no longer valid.',
      });
    }

    // 4. Return safe user details.
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
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = (req , res , next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie('connect.sid' , {
            path: '/',
        });

        return res.status(200).json({
            message : 'Logout Successful',
        });

     });
};

module.exports = { register , login  , getMe , logout};
