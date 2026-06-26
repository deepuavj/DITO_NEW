// @ts-check
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
  const email = 'admin@dito.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log('Admin user already exists — skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('admin@123', 12);

  const admin = await prisma.user.create({
    data: { name: 'admin', email, passwordHash, role: 'ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log('Admin user created:', admin);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
