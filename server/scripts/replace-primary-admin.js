// scripts/replace-primary-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const args = process.argv.slice(2);
const demote = args.includes('--demote');
const [email, password, firstName = 'Primary', lastName = 'Admin'] =
  args.filter((a) => a !== '--demote');

async function main() {
  if (!email || !password) {
    console.error(
      'Usage: node scripts/replace-primary-admin.js <email> <password> [firstName] [lastName] [--demote]'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    // Find the old primary admin(s), excluding the new email
    const oldAdmins = await tx.user.findMany({
      where: { isPrimaryAdmin: true, NOT: { email: normalizedEmail } },
      select: { id: true, email: true },
    });

    const ids = oldAdmins.map((u) => u.id);

    if (ids.length) {
      if (demote) {
        await tx.user.updateMany({
          where: { id: { in: ids } },
          data: { isPrimaryAdmin: false },
        });
      } else {
        await tx.user.deleteMany({ where: { id: { in: ids } } });
      }
    }

    // Create the new admin, or take over the account if the email already exists
    const user = await tx.user.upsert({
      where: { email: normalizedEmail },
      update: { passwordHash, role: 'admin', isPrimaryAdmin: true },
      create: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
        isPrimaryAdmin: true,
      },
    });

    return { user, removed: oldAdmins.map((u) => u.email) };
  });

  console.log(demote ? 'Demoted:' : 'Deleted:', result.removed.join(', ') || 'none');
  console.log('New primary admin:', result.user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());