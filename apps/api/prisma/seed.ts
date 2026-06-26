import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'DESIGNER';
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    console.log(`User already exists — skipping: ${data.email}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
    select: { id: true, email: true, name: true, role: true },
  });
  console.log('Created user:', user);
  return user;
}

async function main() {
  // Admin user
  await upsertUser({
    name: 'Admin',
    email: 'admin@dito.com',
    password: 'Admin@123',
    role: 'ADMIN',
  });

  // Normal user (Designer)
  await upsertUser({
    name: 'Designer',
    email: 'user@dito.com',
    password: 'User@123',
    role: 'DESIGNER',
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
