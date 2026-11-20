const prisma = require('../config/prisma');

// Data minimisation: only what a seller needs to fulfil their own items.
// No user id/email, no payment records, no totals of the whole order.
const orderSelect = (sellerId) => ({
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentStatus: true,
  paymentMethod: true,
  shipFullName: true,
  shipPhone: true,
  shipAddressLine1: true,
  shipAddressLine2: true,
  shipCity: true,
  shipCounty: true,
  shipPostalCode: true,
  customerNote: true,
  createdAt: true,
  items: {
    where: { sellerId }, // other sellers' items in the same order are never returned
    orderBy: { position: 'asc' },
    select: {
      id: true,
      productId: true,
      name: true,
      sku: true,
      image: true,
      unitPriceMinor: true,
      quantity: true,
      lineTotalMinor: true,
    },
  },
});

const listForSeller = ({ sellerId, orderStatus, skip, take }) => {
  const where = { items: { some: { sellerId } } };
  if (orderStatus) where.orderStatus = orderStatus;

  return prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: orderSelect(sellerId),
    }),
    prisma.order.count({ where }),
  ]);
};

const findOneForSeller = (orderId, sellerId) =>
  prisma.order.findFirst({
    where: { id: orderId, items: { some: { sellerId } } },
    select: orderSelect(sellerId),
  });

module.exports = { listForSeller, findOneForSeller };
