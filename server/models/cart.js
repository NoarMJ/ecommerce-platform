
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    guestTokenHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

cartSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

cartSchema.pre('validate', function () {
  if (!this.user && !this.guestTokenHash) {
    this.invalidate(
      'user',
      'A cart must belong to a user or a guest session.'
    );
  }

  if (this.user && this.guestTokenHash) {
    this.invalidate(
      'guestTokenHash',
      'A cart cannot belong to both a user and a guest session.'
    );
  }
});

module.exports = mongoose.model('Cart', cartSchema);
