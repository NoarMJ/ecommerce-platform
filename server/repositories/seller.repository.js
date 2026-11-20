const prisma = require('../config/prisma');
 
const APPLICANT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
};
 
// ---- Phase 2 (applicant side) ----
const findByUserId = (userId) =>
  prisma.sellerProfile.findUnique({ where: { userId } });
 
const create = (data) => prisma.sellerProfile.create({ data });
 
const updateIfStatus = (userId, allowedStatuses, data) =>
  prisma.sellerProfile.updateMany({
    where: { userId, status: { in: allowedStatuses } },
    data,
  });
 
// ---- Phase 3 (admin side) ----
const findByIdWithUser = (id) =>
  prisma.sellerProfile.findUnique({
    where: { id },
    include: { user: { select: APPLICANT_SELECT } },
  });
 
function buildAdminWhere({ status, search }) {
  const where = {};
 
  if (status) where.status = status;
 
  if (search) {
    const contains = { contains: search, mode: 'insensitive' };
    where.OR = [
      { shopName: contains },
      { companyName: contains },
      {
        user: {
          OR: [{ email: contains }, { firstName: contains }, { lastName: contains }],
        },
      },
    ];
  }
 
  return where;
}
 
// Returns [rows, total] in one database round trip.
const listForAdmin = ({ status, search, skip, take, sortDirection }) => {
  const where = buildAdminWhere({ status, search });
 
  return prisma.$transaction([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { submittedAt: sortDirection },
      skip,
      take,
      include: { user: { select: APPLICANT_SELECT } },
    }),
    prisma.sellerProfile.count({ where }),
  ]);
};
 
// Only changes the row if its status is still one of `fromStatuses`.
const transitionStatus = (id, fromStatuses, data) =>
  prisma.sellerProfile.updateMany({
    where: { id, status: { in: fromStatuses } },
    data,
  });
 
module.exports = {
  findByUserId,
  create,
  updateIfStatus,
  findByIdWithUser,
  listForAdmin,
  transitionStatus,
};
 