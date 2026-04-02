import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role, UserStatus } from '../src/generated/prisma/enums';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run seed script.');
}

const adminEmail = (process.env.ADMIN_EMAIL!).trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to run seed script.');
}

const adapter = new PrismaPg(new Pool({ connectionString }));
const prisma = new PrismaClient({ adapter });

const defaultCategories = ['Salary', 'Groceries', 'Rent', 'Utilities', 'Transport', 'Entertainment'];

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function main() {
  const passwordHash = await hash(adminPassword!, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  for (const categoryName of defaultCategories) {
    const name = categoryName.trim();
    await prisma.category.upsert({
      where: {
        userId_normalizedName: {
          userId: user.id,
          normalizedName: normalizeCategoryName(name),
        },
      },
      update: {
        name,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        name,
        normalizedName: normalizeCategoryName(name),
      },
    });
  }

  console.log(`Seeded admin user: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
