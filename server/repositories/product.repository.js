const prisma = require('../config/prisma');

const existsActiveInCategory = async (categoryId) => {
  const count = await prisma.product.count({
    where: { categoryId, isActive: true },
  });
  return count > 0;
};

module.exports = { existsActiveInCategory };