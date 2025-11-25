import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import pg from 'pg';
import 'dotenv/config';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Prisma 7 requires an adapter for direct database connections
const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const superAdmin: SeedUser = {
  email: 'admin@alkitab.com',
  password: 'Admin@123',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super_admin',
};

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  try {
    const existing = await prisma.user.findUnique({
      where: { email: superAdmin.email },
    });

    if (existing) {
      console.log(
        `⚠️  User "${superAdmin.email}" already exists, skipping...\n`,
      );
    } else {
      const passwordHash = await bcrypt.hash(superAdmin.password, 10);

      await prisma.user.create({
        data: {
          email: superAdmin.email,
          passwordHash,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          role: superAdmin.role,
        },
      });

      console.log('✅ Super admin created:');
      console.log(`   Email:    ${superAdmin.email}`);
      console.log(`   Password: ${superAdmin.password}`);
      console.log(`   Role:     ${superAdmin.role}\n`);
    }

    console.log('🎉 Seed completed successfully!\n');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Seed failed:', message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void seed();
