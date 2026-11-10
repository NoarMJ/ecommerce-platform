const prisma = require('../config/prisma');

// Columns that are safe to return. passwordHash is deliberately NOT here.
const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  role: true,
  permissions: true,
  isPrimaryAdmin: true,
  isActive: true,
  createdAt: true,
};

const findPublicById = (id) =>
  prisma.user.findUnique({ where: { id }, select: publicUserSelect });

// Returns the password hash too. Use ONLY for login.
const findByEmailWithHash = (email) =>
  prisma.user.findUnique({ where: { email } });

const emailExists = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(user);
};

const create = (data) =>
  prisma.user.create({ data, select: publicUserSelect });

const findAdmins = () =>
  prisma.user.findMany({
    where: { role: 'admin' },
    select: publicUserSelect,
    orderBy: { createdAt: 'desc' },
  });

// An admin who is not the primary admin (the only kind whose permissions can change)
const findEditableAdminById = (id) =>
  prisma.user.findFirst({
    where: { id, role: 'admin', isPrimaryAdmin: false },
    select: publicUserSelect,
  });

const updatePermissions = (id, permissions) =>
  prisma.user.update({
    where: { id },
    data: { permissions },
    select: publicUserSelect,
  });

module.exports = {
  findPublicById,
  findByEmailWithHash,
  emailExists,
  create,
  findAdmins,
  findEditableAdminById,
  updatePermissions,
};