import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const company = 'Acme Realty';
const departmentEmployees = [
  { department: 'Sales', people: [
    { name: 'Aarav Sharma', email: 'sales1@crm.com', phone: '+91-90000-10001' },
    { name: 'Diya Reddy', email: 'sales2@crm.com', phone: '+91-90000-10002' },
  ]},
  { department: 'HR', people: [
    { name: 'Ananya Rao', email: 'hr1@crm.com', phone: '+91-90000-20001' },
    { name: 'Kabir Verma', email: 'hr2@crm.com', phone: '+91-90000-20002' },
  ]},
  { department: 'IT', people: [
    { name: 'Ishan Patel', email: 'it1@crm.com', phone: '+91-90000-30001' },
    { name: 'Meera Shah', email: 'it2@crm.com', phone: '+91-90000-30002' },
  ]},
  { department: 'Administration', people: [
    { name: 'Ritu Verma', email: 'admin1@crm.com', phone: '+91-90000-40001' },
    { name: 'Kunal Bhatia', email: 'admin2@crm.com', phone: '+91-90000-40002' },
  ]},
  { department: 'Finance', people: [
    { name: 'Neel Joshi', email: 'finance1@crm.com', phone: '+91-90000-50001' },
    { name: 'Pooja Sethi', email: 'finance2@crm.com', phone: '+91-90000-50002' },
  ]},
  { department: 'Engineering', people: [
    { name: 'Aditya Nair', email: 'eng1@crm.com', phone: '+91-90000-60001' },
    { name: 'Sana Khan', email: 'eng2@crm.com', phone: '+91-90000-60002' },
  ]},
  { department: 'Marketing', people: [
    { name: 'Rohit Malhotra', email: 'mkt1@crm.com', phone: '+91-90000-70001' },
    { name: 'Nisha Iyer', email: 'mkt2@crm.com', phone: '+91-90000-70002' },
  ]},
  { department: 'Support', people: [
    { name: 'Tanya Singh', email: 'help1@crm.com', phone: '+91-90000-80001' },
    { name: 'Arun Das', email: 'help2@crm.com', phone: '+91-90000-80002' },
  ]},
];

const employees = departmentEmployees.flatMap((group) =>
  group.people.map((person, index) => ({
    name: person.name,
    email: person.email,
    role: Role.CONTRIBUTOR,
    company,
    department: group.department,
    phone: person.phone,
  }))
);

async function main() {
  const password = await bcrypt.hash('password123', 12);

  await prisma.user.updateMany({
    where: { email: { in: ['sales@crm.com', 'sarah@crm.com', 'hr@crm.com', 'michael@crm.com'] } },
    data: { department: 'Demo' },
  });

  for (const employee of employees) {
    await prisma.user.upsert({
      where: { email: employee.email },
      update: {
        name: employee.name,
        role: employee.role,
        isActive: true,
        company: employee.company,
        department: employee.department,
        phone: employee.phone,
      },
      create: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
        company: employee.company,
        department: employee.department,
        phone: employee.phone,
        password,
      },
    });
  }

  console.log('Created/updated department employees.');
  console.log('Password for all seeded employees: password123');
  console.log('Sales: sales1@crm.com, sales2@crm.com');
  console.log('HR: hr1@crm.com, hr2@crm.com');
  console.log('IT: it1@crm.com, it2@crm.com');
  console.log('Administration: admin1@crm.com, admin2@crm.com');
  console.log('Finance: finance1@crm.com, finance2@crm.com');
  console.log('Engineering: eng1@crm.com, eng2@crm.com');
  console.log('Marketing: mkt1@crm.com, mkt2@crm.com');
  console.log('Support: help1@crm.com, help2@crm.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
