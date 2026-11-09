const prisma = require('../config/prisma');

const findAll = ({ onlyActive = false } = {}) =>
  prisma.category.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: { name: 'asc' },
  });

const findById = (id) =>
  prisma.category.findUnique({ where: { id } });

const findBySlug = (slug) =>
  prisma.category.findUnique({ where: { slug } });

const create = (data) =>
  prisma.category.create({ data });

const update = (id, data) =>
  prisma.category.update({ where: { id }, data });

const remove = (id) =>
  prisma.category.delete({ where: { id } });

module.exports = { findAll, findById, findBySlug, create, update, remove };