
const prisma = require('../config/prisma');

// Every function that takes `tx` must run inside prisma.$transaction(async (tx) => ...)
// so the stock change and the order change succeed or fail together.
//
// Meaning of the numbers: product.stock is the stock AVAILABLE to sell right now.
// Checkout takes it immediately (same as before). A reservation row records that the
// units are only held until `expiresAt`; they become a sale when the order is paid
// (M-Pesa) or approved (cash on delivery), and go back if the hold runs out or the
// order is cancelled.

const SELLER_CAN_SELL = {
  OR: [{ sellerId: null }, { seller: { status: 'approved' } }],
};

const byProductId = (a, b) => a.productId.localeCompare(b.productId);

const createForOrder = (tx, { orderId, items, expiresAt }) =>
  tx.stockReservation.createMany({
    data: items.map((item) => ({
      orderId,
      orderItemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      expiresAt,
    })),
  });

// Active holds become sales. Safe to call twice: only 'active' rows are touched.
const commitForOrder = async (tx, orderId, { itemIds } = {}) => {
  const holds = await tx.stockReservation.findMany({
    where: {
      orderId,
      status: 'active',
      ...(itemIds ? { orderItemId: { in: itemIds } } : {}),
    },
    include: {
      orderItem: {
        select: { sellerId: true },
      },
    },
  });

  let committed = 0;

  for (const hold of holds) {
    const result = await tx.stockReservation.updateMany({
      where: {
        id: hold.id,
        status: 'active',
      },
      data: {
        status: 'committed',
        committedAt: new Date(),
      },
    });

    if (result.count !== 1) continue;

    await tx.stockMovement.create({
      data: {
        productId: hold.productId,
        orderId,
        orderItemId: hold.orderItemId,
        type: 'sale',
        quantityDelta: -hold.quantity,
        note: 'Order confirmed',
      },
    });

    committed += 1;
  }

  return committed;
};

// Gives the stock of every item back.
//  - active hold    -> no sale ever happened: mark released/expired, stock goes back
//  - committed sale -> stock goes back and a "return" movement is recorded
//  - no hold at all -> order created before reservations existed: stock goes back
const giveStockBack = async (
  tx,
  orderId,
  { holdStatus = 'released', actorId = null, note } = {}
) => {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { reservation: true },
  });

  for (const item of items) {
    const hold = item.reservation;

    if (hold && (hold.status === 'released' || hold.status === 'expired')) {
      continue;
    }

    await tx.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity },
      },
    });

    if (hold && hold.status === 'active') {
      await tx.stockReservation.updateMany({
        where: {
          id: hold.id,
          status: 'active',
        },
        data: {
          status: holdStatus,
          releasedAt: new Date(),
        },
      });
    } else if (hold && hold.status === 'committed') {
      await tx.stockReservation.update({
        where: { id: hold.id },
        data: {
          status: 'released',
          releasedAt: new Date(),
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          orderId,
          orderItemId: item.id,
          type: 'return',
          quantityDelta: item.quantity,
          actorId,
          note: note || 'Order cancelled',
        },
      });
    }
  }
};

// A payment arrived for an order we already cancelled because the hold ran out.
// Try to take the stock again; if it is still there, the order comes back to life.
const reviveCancelledOrder = async (tx, orderId) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { reservation: true },
      },
    },
  });

  if (
    !order ||
    order.orderStatus !== 'cancelled' ||
    order.cancelReason !== 'payment_expired' ||
    order.paymentStatus !== 'pending'
  ) {
    return false;
  }

  const items = [...order.items].sort(byProductId);
  const taken = [];

  const putBack = async () => {
    for (const done of taken) {
      await tx.product.update({
        where: { id: done.productId },
        data: {
          stock: { increment: done.quantity },
        },
      });
    }
  };

  for (const item of items) {
    const result = await tx.product.updateMany({
      where: {
        id: item.productId,
        isActive: true,
        stock: { gte: item.quantity },
        ...SELLER_CAN_SELL,
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (result.count !== 1) {
      await putBack();
      return false;
    }

    taken.push(item);
  }

  const revived = await tx.order.updateMany({
    where: {
      id: orderId,
      orderStatus: 'cancelled',
      cancelReason: 'payment_expired',
    },
    data: {
      orderStatus: 'pending',
      paymentStatus: 'paid',
      cancelledAt: null,
      cancelReason: null,
    },
  });

  if (revived.count !== 1) {
    await putBack();
    return false;
  }

  await tx.orderStatusHistory.create({
    data: {
      orderId,
      status: 'pending',
    },
  });

  for (const item of items) {
    if (item.reservation) {
      await tx.stockReservation.update({
        where: { id: item.reservation.id },
        data: {
          status: 'committed',
          committedAt: new Date(),
          releasedAt: null,
        },
      });
    }

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        orderId,
        orderItemId: item.id,
        type: 'sale',
        quantityDelta: -item.quantity,
        note: 'Payment received after the hold ran out',
      },
    });
  }

  return true;
};

// Call inside the payment transaction, right after the payment row was marked succeeded.
// Returns 'paid' | 'revived' | 'needs_review'.
const settlePaidOrder = async (tx, orderId) => {
  const marked = await tx.order.updateMany({
    where: {
      id: orderId,
      paymentStatus: 'pending',
      orderStatus: { not: 'cancelled' },
    },
    data: {
      paymentStatus: 'paid',
    },
  });

  if (marked.count === 1) {
    await commitForOrder(tx, orderId);
    return 'paid';
  }

  if (await reviveCancelledOrder(tx, orderId)) {
    return 'revived';
  }

  // Cancelled by an admin, already paid, or the stock is gone:
  // a person must decide whether a refund is required.
  return 'needs_review';
};

// A customer who is actively paying should not lose the hold mid-prompt.
// Never extend a reservation that has already expired.
const extendHold = async (orderId, expiresAt) => {
  const updated = await prisma.stockReservation.updateMany({
    where: {
      orderId,
      status: 'active',
      expiresAt: {
        gt: new Date(),
        lt: expiresAt,
      },
    },
    data: { expiresAt },
  });
  if (updated.count > 0) return updated;
  // A still-live hold may already be later than this requested expiry. That is
  // a valid reservation, not an expired one, and must not block payment.
  const active = await prisma.stockReservation.count({
    where: { orderId, status: 'active', expiresAt: { gt: new Date() } },
  });
  return { count: active > 0 ? 1 : 0 };
};

module.exports = {
  createForOrder,
  commitForOrder,
  giveStockBack,
  reviveCancelledOrder,
  settlePaidOrder,
  extendHold,
};
