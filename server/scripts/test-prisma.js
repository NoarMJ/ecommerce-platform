require('dotenv').config();
const prisma = require('../config/prisma');

async function main() {
  const category = await prisma.category.create({
    data: { name: 'Test Category', slug: 'test-category' },
  });
  console.log('Created:', category);

  const count = await prisma.category.count();
  console.log('Categories in database:', count);

  await prisma.category.delete({ where: { id: category.id } });
  console.log('Test category deleted');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());