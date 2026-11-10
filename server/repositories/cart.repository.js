const prisma = require('../config/prisma');

// Every cart query returns the items, oldest first, with current product info
const withItems = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceMinor: true,
          images: true,
          stock: true,
          isActive: true,
        },
      },
    },
  },
};

const findById = (id) =>
  prisma.cart.findUnique({ where: { id }, include: withItems });

const findByUserId = (userId) =>
  prisma.cart.findUnique({ where: { userId }, include: withItems });

// Only guest carts that have not expired
const findActiveGuestCart = (guestTokenHash) =>
  prisma.cart.findFirst({
    where: { guestTokenHash, expiresAt: { gt: new Date() } },
    include: withItems,
  });

const createForUser = (userId) =>
  prisma.cart.create({ data: { userId }, include: withItems });

const createForGuest = (guestTokenHash, expiresAt) =>
  prisma.cart.create({
    data: { guestTokenHash, expiresAt },
    include: withItems,
  });

// Sets the quantity of one product, creating the line if needed
const setItemQuantity = (cartId, productId, quantity) =>
  prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity },
  });

const deleteItem = (cartId, productId) =>
  prisma.cartItem.deleteMany({ where: { cartId, productId } });

const clearItems = (cartId) =>
  prisma.cartItem.deleteMany({ where: { cartId } });

// The customer has no cart yet: the guest cart simply becomes theirs
const transferGuestCartToUser = (guestCartId, userId) =>
  prisma.cart.update({
    where: { id: guestCartId },
    data: { userId, guestTokenHash: null, expiresAt: null },
  });

// The customer already has a cart: add the guest items into it,
// then delete the guest cart. All steps happen together or not at all.
const mergeIntoUserCart = (userCartId, guestCartId, guestItems) =>
  prisma.$transaction([
    ...guestItems.map((item) =>
      prisma.cartItem.upsert({
        where: {
          cartId_productId: { cartId: userCartId, productId: item.productId },
        },
        create: {
          cartId: userCartId,
          productId: item.productId,
          quantity: item.quantity,
        },
        update: { quantity: { increment: item.quantity } },
      })
    ),
    prisma.cart.delete({ where: { id: guestCartId } }),
  ]);

// Used by the cleanup job (user carts have no expiry, so they are never matched)
const deleteExpiredGuestCarts = () =>
  prisma.cart.deleteMany({ where: { expiresAt: { lt: new Date() } } });

module.exports = {
  findById,
  findByUserId,
  findActiveGuestCart,
  createForUser,
  createForGuest,
  setItemQuantity,
  deleteItem,
  clearItems,
  transferGuestCartToUser,
  mergeIntoUserCart,
  deleteExpiredGuestCarts,
};