import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.progress.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@crm.com',
      password,
      role: Role.ADMIN,
      department: 'Management',
      phone: '+1-555-0100',
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      name: 'John Sales',
      email: 'sales@crm.com',
      password,
      role: Role.SALES_TEAM,
      department: 'Sales',
      phone: '+1-555-0101',
    },
  });

  const salesRep = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah@crm.com',
      password,
      role: Role.SALES_TEAM,
      department: 'Sales',
      phone: '+1-555-0102',
    },
  });

  const hrManager = await prisma.user.create({
    data: {
      name: 'Emily HR',
      email: 'hr@crm.com',
      password,
      role: Role.HR_TEAM,
      department: 'HR',
      phone: '+1-555-0103',
    },
  });

  const hrSpecialist = await prisma.user.create({
    data: {
      name: 'Michael Chen',
      email: 'michael@crm.com',
      password,
      role: Role.HR_TEAM,
      department: 'HR',
      phone: '+1-555-0104',
    },
  });

  const itLead = await prisma.user.create({
    data: {
      name: 'Priya IT',
      email: 'it@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'IT',
      phone: '+1-555-0105',
    },
  });
  const adminExec = await prisma.user.create({
    data: {
      name: 'Ravi Admin',
      email: 'adminstaff@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'Administration',
      phone: '+1-555-0106',
    },
  });
  const financeLead = await prisma.user.create({
    data: {
      name: 'Sonia Finance',
      email: 'finance@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'Finance',
      phone: '+1-555-0107',
    },
  });
  const engLead = await prisma.user.create({
    data: {
      name: 'Arjun Engineering',
      email: 'engineering@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'Engineering',
      phone: '+1-555-0108',
    },
  });
  const marketingLead = await prisma.user.create({
    data: {
      name: 'Maya Marketing',
      email: 'marketing@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'Marketing',
      phone: '+1-555-0109',
    },
  });
  const supportLead = await prisma.user.create({
    data: {
      name: 'Aman Support',
      email: 'help@crm.com',
      password,
      role: Role.CONTRIBUTOR,
      department: 'Support',
      phone: '+1-555-0110',
    },
  });

  // Create sample tasks
  const tasks = [
    {
      title: 'Enterprise Client Onboarding',
      description: 'Complete onboarding process for Acme Corp enterprise account',
      assignedTo: salesManager.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.HIGH,
      department: 'Sales',
      remarks: 'Client signed annual contract',
      dueDate: new Date('2026-07-01'),
    },
    {
      title: 'Q2 Sales Pipeline Review',
      description: 'Review and update Q2 sales pipeline with team leads',
      assignedTo: salesRep.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      department: 'Sales',
      remarks: 'Waiting for regional data',
      dueDate: new Date('2026-06-30'),
    },
    {
      title: 'New Employee Orientation',
      description: 'Conduct orientation for 5 new hires starting next week',
      assignedTo: hrManager.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.HIGH,
      department: 'HR',
      remarks: 'Orientation materials prepared',
      dueDate: new Date('2026-06-20'),
    },
    {
      title: 'Benefits Enrollment Campaign',
      description: 'Launch annual benefits enrollment communication campaign',
      assignedTo: hrSpecialist.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      department: 'HR',
      remarks: 'Pending legal review',
      dueDate: new Date('2026-07-15'),
    },
    {
      title: 'Lead Qualification - TechStart Inc',
      description: 'Qualify inbound lead from TechStart Inc for enterprise tier',
      assignedTo: salesRep.id,
      status: TaskStatus.REJECTED,
      priority: Priority.URGENT,
      department: 'Sales',
      remarks: 'Budget constraints - not qualified',
      dueDate: new Date('2026-06-10'),
    },
    {
      title: 'Performance Review Cycle',
      description: 'Initiate mid-year performance review cycle for all departments',
      assignedTo: hrManager.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.HIGH,
      department: 'HR',
      remarks: 'Templates being finalized',
      dueDate: new Date('2026-08-01'),
    },
    {
      title: 'CRM Integration Proposal',
      description: 'Prepare integration proposal for GlobalTech partnership',
      assignedTo: salesManager.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.HIGH,
      department: 'Sales',
      remarks: 'Technical specs in progress',
      dueDate: new Date('2026-07-20'),
    },
    {
      title: 'Compliance Training Update',
      description: 'Update compliance training modules for new regulations',
      assignedTo: hrSpecialist.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.MEDIUM,
      department: 'HR',
      remarks: 'Training modules deployed',
      dueDate: new Date('2026-06-05'),
    },
    {
      title: 'Customer Success Check-in',
      description: 'Quarterly check-in with top 10 enterprise accounts',
      assignedTo: salesRep.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.MEDIUM,
      department: 'Sales',
      remarks: 'All accounts contacted',
      dueDate: new Date('2026-06-15'),
    },
    {
      title: 'Workplace Policy Review',
      description: 'Annual review of remote work and hybrid policies',
      assignedTo: hrManager.id,
      status: TaskStatus.REJECTED,
      priority: Priority.LOW,
      department: 'HR',
      remarks: 'Deferred to Q3',
      dueDate: new Date('2026-06-01'),
    },
    {
      title: 'IT Helpdesk Queue Cleanup',
      description: 'Review and close stale IT support requests',
      assignedTo: itLead.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      department: 'IT',
      remarks: 'Waiting on user confirmations',
      dueDate: new Date('2026-07-03'),
    },
    {
      title: 'Administration Policy Update',
      description: 'Refresh office admin procedures and document access rules',
      assignedTo: adminExec.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.MEDIUM,
      department: 'Administration',
      remarks: 'Document shared with team',
      dueDate: new Date('2026-07-05'),
    },
    {
      title: 'Finance Reconciliation',
      description: 'Reconcile monthly invoices and payment records',
      assignedTo: financeLead.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.HIGH,
      department: 'Finance',
      remarks: 'Awaiting bank statement update',
      dueDate: new Date('2026-07-08'),
    },
    {
      title: 'Engineering Release Prep',
      description: 'Prepare release checklist for the next sprint',
      assignedTo: engLead.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.HIGH,
      department: 'Engineering',
      remarks: 'Build pipeline green',
      dueDate: new Date('2026-07-10'),
    },
    {
      title: 'Marketing Campaign Review',
      description: 'Finalize creative assets for the new campaign',
      assignedTo: marketingLead.id,
      status: TaskStatus.ON_HOLD,
      priority: Priority.MEDIUM,
      department: 'Marketing',
      remarks: 'Waiting for approval',
      dueDate: new Date('2026-07-12'),
    },
    {
      title: 'Support Desk Follow-up',
      description: 'Check all unresolved customer support requests',
      assignedTo: supportLead.id,
      status: TaskStatus.PROCESSED,
      priority: Priority.LOW,
      department: 'Support',
      remarks: 'Top issues resolved',
      dueDate: new Date('2026-07-14'),
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.create({ data: taskData });

    // Create initial progress log
    await prisma.progress.create({
      data: {
        taskId: task.id,
        updatedBy: admin.id,
        status: taskData.status,
        remarks: `Task created with status: ${taskData.status}`,
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Demo Accounts (password: password123):');
  console.log('  Admin:       admin@crm.com');
  console.log('  Sales:       sales@crm.com / sarah@crm.com');
  console.log('  HR:          hr@crm.com / michael@crm.com');
  console.log('  IT:          it@crm.com');
  console.log('  Administration: adminstaff@crm.com');
  console.log('  Finance:     finance@crm.com');
  console.log('  Engineering: engineering@crm.com');
  console.log('  Marketing:   marketing@crm.com');
  console.log('  Support:     help@crm.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
