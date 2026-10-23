
const mongoose = require('mongoose');

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
