import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`${name} is required for deployment bootstrap.`);
  }
  return value;
}

function optionalEnv(name: string, fallback?: string) {
  return process.env[name]?.trim() || fallback;
}

async function upsertCompany(name: string) {
  return prisma.company.upsert({
    where: { name },
    update: {
      director: optionalEnv('PLATFORM_DIRECTOR', `${name} Director`),
      gstNo: optionalEnv('PLATFORM_GST_NO'),
      phone: optionalEnv('PLATFORM_PHONE'),
    },
    create: {
      name,
      director: optionalEnv('PLATFORM_DIRECTOR', `${name} Director`),
      gstNo: optionalEnv('PLATFORM_GST_NO'),
      phone: optionalEnv('PLATFORM_PHONE'),
    },
  });
}

async function upsertSuperAdmin() {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultEmail = isProduction ? undefined : 'superadmin@crm.com';
  const defaultPassword = isProduction ? undefined : 'password123';

  const company = optionalEnv('SUPER_ADMIN_COMPANY', 'Platform')!;
  const email = requireEnv('SUPER_ADMIN_EMAIL', defaultEmail).toLowerCase();
  const password = requireEnv('SUPER_ADMIN_PASSWORD', defaultPassword);
  const passwordHash = await bcrypt.hash(password, 12);

  await upsertCompany(company);

  return prisma.user.upsert({
    where: { email },
    update: {
      name: optionalEnv('SUPER_ADMIN_NAME', 'Super Admin')!,
      password: passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      company,
      department: optionalEnv('SUPER_ADMIN_DEPARTMENT', 'Platform'),
      phone: optionalEnv('SUPER_ADMIN_PHONE'),
    },
    create: {
      name: optionalEnv('SUPER_ADMIN_NAME', 'Super Admin')!,
      email,
      password: passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      company,
      department: optionalEnv('SUPER_ADMIN_DEPARTMENT', 'Platform'),
      phone: optionalEnv('SUPER_ADMIN_PHONE'),
    },
  });
}

async function main() {
  console.log('Starting deployment bootstrap...');
  const superAdmin = await upsertSuperAdmin();
  console.log(`Super admin ready: ${superAdmin.email}`);
  console.log('Deployment bootstrap complete.');
}

main()
  .catch((error) => {
    console.error('Deployment bootstrap failed.');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
