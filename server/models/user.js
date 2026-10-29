
const mongoose = require('mongoose');

// Every permission the application supports.
// An admin can only receive permissions from this list.
const ADMIN_PERMISSIONS = require('../config/adminPermissions');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },

    // Specific actions permitted for a regular administrator.
    permissions: {
      type: [
        {
          type: String,
          enum: ADMIN_PERMISSIONS,
        },
      ],
      default: [],
    },

    // Only the trusted primary administrator should have this set to true.
    isPrimaryAdmin: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
