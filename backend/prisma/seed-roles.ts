import { PrismaClient, Role, Priority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();
const companies = ['Platform', 'Acme Realty', 'Nova Homes', 'Orion Estates'];
const company = 'Acme Realty';

const demoUsers = [
  { name: 'Sofia Super Admin', email: 'superadmin@crm.com', role: Role.SUPER_ADMIN, company: 'Platform', department: 'Platform', phone: '+91-91000-00001' },
  { name: 'Priya Support Lead', email: 'support@crm.com', role: Role.SUPPORT, company: 'Platform', department: 'Support', phone: '+91-91000-00000' },
  { name: 'Arjun Acme Admin', email: 'admin.acme@crm.com', role: Role.ADMIN, company, department: 'Management', phone: '+91-91000-00002' },
  { name: 'Maya Acme Member', email: 'member.acme@crm.com', role: Role.MEMBER, company, department: 'Sales', phone: '+91-91000-00003' },
  { name: 'Riya Acme Contributor', email: 'contributor.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'Sales', phone: '+91-91000-00004' },
  { name: 'Vikram Acme Viewer', email: 'viewer.acme@example.com', role: Role.VIEWER, company, department: 'Customer', phone: '+91-91000-00005' },
  { name: 'Ishan Acme IT', email: 'it.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'IT', phone: '+91-91000-00006' },
  { name: 'Ritu Acme Admin', email: 'admin.acme.ops@crm.com', role: Role.CONTRIBUTOR, company, department: 'Administration', phone: '+91-91000-00007' },
  { name: 'Neel Acme Finance', email: 'finance.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'Finance', phone: '+91-91000-00008' },
  { name: 'Aditi Acme Engineering', email: 'engineering.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'Engineering', phone: '+91-91000-00009' },
  { name: 'Maya Acme Marketing', email: 'marketing.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'Marketing', phone: '+91-91000-00010' },
  { name: 'Arun Acme Support', email: 'help.acme@crm.com', role: Role.CONTRIBUTOR, company, department: 'Support', phone: '+91-91000-00011' },
  { name: 'Nisha Nova Admin', email: 'admin.nova@crm.com', role: Role.ADMIN, company: 'Nova Homes', department: 'Management', phone: '+91-91000-10001' },
  { name: 'Kabir Nova Member', email: 'member.nova@crm.com', role: Role.MEMBER, company: 'Nova Homes', department: 'Sales', phone: '+91-91000-10002' },
  { name: 'Ananya Nova Contributor', email: 'contributor.nova@crm.com', role: Role.CONTRIBUTOR, company: 'Nova Homes', department: 'Sales', phone: '+91-91000-10003' },
  { name: 'Tara Nova Viewer', email: 'viewer.nova@example.com', role: Role.VIEWER, company: 'Nova Homes', department: 'Customer', phone: '+91-91000-10004' },
  { name: 'Dev Orion Admin', email: 'admin.orion@crm.com', role: Role.ADMIN, company: 'Orion Estates', department: 'Management', phone: '+91-91000-20001' },
  { name: 'Ira Orion Member', email: 'member.orion@crm.com', role: Role.MEMBER, company: 'Orion Estates', department: 'Sales', phone: '+91-91000-20002' },
  { name: 'Arnav Orion Contributor', email: 'contributor.orion@crm.com', role: Role.CONTRIBUTOR, company: 'Orion Estates', department: 'Sales', phone: '+91-91000-20003' },
  { name: 'Meera Orion Viewer', email: 'viewer.orion@example.com', role: Role.VIEWER, company: 'Orion Estates', department: 'Customer', phone: '+91-91000-20004' },
];

async function main() {
  const password = await bcrypt.hash('password123', 12);

  for (const name of companies) {
    await prisma.company.upsert({
      where: { name },
      update: {},
      create: {
        name,
        director: `${name} Director`,
        gstNo: `GST-${name.replace(/\s+/g, '').toUpperCase()}-001`,
        phone: '+91-90000-99999',
      },
    });
  }

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
        company: user.company,
        department: user.department,
        phone: user.phone,
      },
      create: {
        ...user,
        password,
      },
    });
  }

  const contributor = await prisma.user.findUniqueOrThrow({ where: { email: 'contributor.acme@crm.com' } });
  const novaContributor = await prisma.user.findUniqueOrThrow({ where: { email: 'contributor.nova@crm.com' } });
  const orionContributor = await prisma.user.findUniqueOrThrow({ where: { email: 'contributor.orion@crm.com' } });

  await prisma.task.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {
      assignedTo: contributor.id,
      company,
      customerEmail: 'viewer.acme@example.com',
      department: 'Sales',
      status: TaskStatus.PROCESSED,
    },
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Follow up with Vikram Viewer',
      description: 'Demo lead task visible to Acme admin/member, assigned contributor, and customer viewer.',
      customerName: 'Vikram Viewer',
      customerEmail: 'viewer.acme@example.com',
      customerPhone: '+91-90000-30001',
      customerCompany: 'Acme Realty Customer',
      customerSource: 'Demo Lead',
      company,
      department: 'Sales',
      assignedTo: contributor.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.HIGH,
      remarks: 'Initial demo task.',
    },
  });

  await prisma.task.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {
      assignedTo: novaContributor.id,
      company: 'Nova Homes',
      customerEmail: 'viewer.nova@example.com',
      department: 'Sales',
      status: TaskStatus.PROCESSED,
    },
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Nova Homes follow up',
      description: 'Demo task for Nova company users.',
      customerName: 'Nova Viewer',
      customerEmail: 'viewer.nova@example.com',
      customerPhone: '+91-90000-30002',
      customerCompany: 'Nova Homes Customer',
      customerSource: 'Demo Lead',
      company: 'Nova Homes',
      department: 'Sales',
      assignedTo: novaContributor.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.MEDIUM,
      remarks: 'Nova demo task.',
    },
  });

  await prisma.task.upsert({
    where: { id: '33333333-3333-4333-8333-333333333333' },
    update: {
      assignedTo: orionContributor.id,
      company: 'Orion Estates',
      customerEmail: 'viewer.orion@example.com',
      department: 'Sales',
      status: TaskStatus.ON_HOLD,
    },
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Orion Estates review',
      description: 'Demo task for Orion company users.',
      customerName: 'Orion Viewer',
      customerEmail: 'viewer.orion@example.com',
      customerPhone: '+91-90000-30003',
      customerCompany: 'Orion Estates Customer',
      customerSource: 'Demo Lead',
      company: 'Orion Estates',
      department: 'Sales',
      assignedTo: orionContributor.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      remarks: 'Orion demo task.',
    },
  });

  await prisma.task.upsert({
    where: { id: '44444444-4444-4444-8444-444444444444' },
    update: {
      assignedTo: null,
      company,
      customerSource: 'Online Lead',
      department: 'Sales',
      status: TaskStatus.ON_HOLD,
    },
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Online lead: Karthik R',
      description: 'Website visitor asked for a callback about a 2BHK apartment.',
      customerName: 'Karthik R',
      customerEmail: 'karthik.online@example.com',
      customerPhone: '+91-90000-41001',
      customerCompany: '2BHK Apartment',
      customerSource: 'Online Lead',
      company,
      department: 'Sales',
      assignedTo: null,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      remarks: 'Created from website lead form. Source: Website.',
    },
  });

  await prisma.task.upsert({
    where: { id: '55555555-5555-4555-8555-555555555555' },
    update: {
      assignedTo: null,
      company: 'Nova Homes',
      customerSource: 'Online Lead',
      department: 'Sales',
      status: TaskStatus.ON_HOLD,
    },
    create: {
      id: '55555555-5555-4555-8555-555555555555',
      title: 'Online lead: Sneha M',
      description: 'Website visitor wants a site visit this weekend.',
      customerName: 'Sneha M',
      customerEmail: 'sneha.online@example.com',
      customerPhone: '+91-90000-41002',
      customerCompany: 'Weekend Site Visit',
      customerSource: 'Online Lead',
      company: 'Nova Homes',
      department: 'Sales',
      assignedTo: null,
      status: TaskStatus.ON_HOLD,
      priority: Priority.HIGH,
      remarks: 'Created from website lead form. Source: Website.',
    },
  });

  await prisma.user.updateMany({
    where: { email: { in: ['sales1@crm.com', 'sales2@crm.com', 'sales3@crm.com', 'sales4@crm.com', 'sales5@crm.com'] } },
    data: { role: Role.CONTRIBUTOR, company, department: 'Sales' },
  });

  await prisma.user.updateMany({
    where: { email: { in: ['hr1@crm.com', 'hr2@crm.com', 'hr3@crm.com', 'hr4@crm.com', 'hr5@crm.com'] } },
    data: { role: Role.CONTRIBUTOR, company, department: 'HR' },
  });

  console.log('Seeded 5-role CRM demo accounts. Password for all: password123');
  for (const user of demoUsers) console.log(`${user.role}: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
