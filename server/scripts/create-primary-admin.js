require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const [email, password, firstName = 'Primary', lastName = 'Admin'] =
  process.argv.slice(2);

async function main() {
  if (!email || !password) {
    console.error(
      'Usage: node scripts/create-primary-admin.js <email> <password> [firstName] [lastName]'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    console.log('A user with this email already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
      isPrimaryAdmin: true,
    },
  });

  console.log('Primary admin created:', user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());