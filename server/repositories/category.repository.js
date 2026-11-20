const prisma = require('../config/prisma');

const findAll = ({ onlyActive = false } = {}) =>
  prisma.category.findMany({
    where: onlyActive ? { isActive: true, approvalStatus: 'approved' } : {},
    orderBy: { name: 'asc' },
  });

const findById = (id) =>
  prisma.category.findUnique({ where: { id } });

const findBySlug = (slug) =>
  prisma.category.findUnique({ where: { slug } });

const countActiveByIds = (ids) =>
    prisma.category.count({ where :{ id: { in: ids} , isActive: true }});

const create = (data) =>
  prisma.category.create({ data });

const findPending = () => prisma.category.findMany({ where: { approvalStatus: 'pending' }, orderBy: { createdAt: 'asc' } });

const update = (id, data) =>
  prisma.category.update({ where: { id }, data });

const remove = (id) =>
  prisma.category.delete({ where: { id } });

module.exports = { findAll, findById, findBySlug, findPending, countActiveByIds, create, update, remove };
