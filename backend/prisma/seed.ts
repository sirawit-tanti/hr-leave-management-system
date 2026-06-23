import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ApprovalActionType,
  EmploymentStatus,
  LeaveRequestStatus,
  PrismaClient,
  Role,
} from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const currentYear = new Date().getFullYear();

  console.log('Start seeding...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    },
    create: {
      email: 'manager@example.com',
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {
      passwordHash,
      role: Role.EMPLOYEE,
      isActive: true,
    },
    create: {
      email: 'employee@example.com',
      passwordHash,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  const adminProfile = await prisma.employeeProfile.upsert({
    where: { employeeCode: 'EMP001' },
    update: {
      firstName: 'Admin',
      lastName: 'User',
      position: 'HR Administrator',
      department: 'Human Resources',
      status: EmploymentStatus.ACTIVE,
    },
    create: {
      userId: adminUser.id,
      employeeCode: 'EMP001',
      firstName: 'Admin',
      lastName: 'User',
      position: 'HR Administrator',
      department: 'Human Resources',
      hireDate: new Date('2022-01-01'),
      status: EmploymentStatus.ACTIVE,
    },
  });

  const managerProfile = await prisma.employeeProfile.upsert({
    where: { employeeCode: 'EMP002' },
    update: {
      firstName: 'Manager',
      lastName: 'User',
      position: 'Engineering Manager',
      department: 'Engineering',
      status: EmploymentStatus.ACTIVE,
    },
    create: {
      userId: managerUser.id,
      employeeCode: 'EMP002',
      firstName: 'Manager',
      lastName: 'User',
      position: 'Engineering Manager',
      department: 'Engineering',
      hireDate: new Date('2022-06-01'),
      status: EmploymentStatus.ACTIVE,
    },
  });

  const employeeProfile = await prisma.employeeProfile.upsert({
    where: { employeeCode: 'EMP003' },
    update: {
      firstName: 'Employee',
      lastName: 'User',
      position: 'Software Developer',
      department: 'Engineering',
      managerId: managerProfile.id,
      status: EmploymentStatus.ACTIVE,
    },
    create: {
      userId: employeeUser.id,
      employeeCode: 'EMP003',
      firstName: 'Employee',
      lastName: 'User',
      position: 'Software Developer',
      department: 'Engineering',
      managerId: managerProfile.id,
      hireDate: new Date('2023-01-15'),
      status: EmploymentStatus.ACTIVE,
    },
  });

  const annualLeave = await prisma.leaveType.upsert({
    where: { name: 'Annual Leave' },
    update: {
      description: 'Paid annual leave for vacation or personal time off.',
      defaultDaysPerYear: '10',
      isPaid: true,
      isActive: true,
    },
    create: {
      name: 'Annual Leave',
      description: 'Paid annual leave for vacation or personal time off.',
      defaultDaysPerYear: '10',
      isPaid: true,
      isActive: true,
    },
  });

  const sickLeave = await prisma.leaveType.upsert({
    where: { name: 'Sick Leave' },
    update: {
      description: 'Paid leave for illness or medical appointments.',
      defaultDaysPerYear: '30',
      isPaid: true,
      isActive: true,
    },
    create: {
      name: 'Sick Leave',
      description: 'Paid leave for illness or medical appointments.',
      defaultDaysPerYear: '30',
      isPaid: true,
      isActive: true,
    },
  });

  const businessLeave = await prisma.leaveType.upsert({
    where: { name: 'Business Leave' },
    update: {
      description: 'Paid leave for personal business matters.',
      defaultDaysPerYear: '3',
      isPaid: true,
      isActive: true,
    },
    create: {
      name: 'Business Leave',
      description: 'Paid leave for personal business matters.',
      defaultDaysPerYear: '3',
      isPaid: true,
      isActive: true,
    },
  });

  const unpaidLeave = await prisma.leaveType.upsert({
    where: { name: 'Unpaid Leave' },
    update: {
      description: 'Leave without pay.',
      defaultDaysPerYear: '0',
      isPaid: false,
      isActive: true,
    },
    create: {
      name: 'Unpaid Leave',
      description: 'Leave without pay.',
      defaultDaysPerYear: '0',
      isPaid: false,
      isActive: true,
    },
  });

  const leaveTypes = [annualLeave, sickLeave, businessLeave, unpaidLeave];
  const profiles = [adminProfile, managerProfile, employeeProfile];

  for (const profile of profiles) {
    for (const leaveType of leaveTypes) {
      const totalDays = leaveType.defaultDaysPerYear;

      await prisma.leaveBalance.upsert({
        where: {
          employeeProfileId_leaveTypeId_year: {
            employeeProfileId: profile.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
        update: {
          totalDays,
          usedDays: '0',
          remainingDays: totalDays,
        },
        create: {
          employeeProfileId: profile.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          totalDays,
          usedDays: '0',
          remainingDays: totalDays,
        },
      });
    }
  }

  await prisma.approvalAction.deleteMany();
  await prisma.leaveRequest.deleteMany();

  const approvedRequest = await prisma.leaveRequest.create({
    data: {
      employeeProfileId: employeeProfile.id,
      leaveTypeId: annualLeave.id,
      startDate: new Date(`${currentYear}-07-10`),
      endDate: new Date(`${currentYear}-07-11`),
      totalDays: '2',
      reason: 'Family trip',
      status: LeaveRequestStatus.APPROVED,
      managerNote: 'Approved. Enjoy your leave.',
      requestedAt: new Date(),
      decidedAt: new Date(),
    },
  });

  await prisma.approvalAction.createMany({
    data: [
      {
        leaveRequestId: approvedRequest.id,
        action: ApprovalActionType.CREATED,
        comment: 'Leave request created by employee.',
      },
      {
        leaveRequestId: approvedRequest.id,
        approverProfileId: managerProfile.id,
        action: ApprovalActionType.APPROVED,
        comment: 'Approved by manager.',
      },
    ],
  });

  const pendingRequest = await prisma.leaveRequest.create({
    data: {
      employeeProfileId: employeeProfile.id,
      leaveTypeId: sickLeave.id,
      startDate: new Date(`${currentYear}-08-05`),
      endDate: new Date(`${currentYear}-08-05`),
      totalDays: '1',
      reason: 'Medical appointment',
      status: LeaveRequestStatus.PENDING,
      requestedAt: new Date(),
    },
  });

  await prisma.approvalAction.create({
    data: {
      leaveRequestId: pendingRequest.id,
      action: ApprovalActionType.CREATED,
      comment: 'Leave request created by employee.',
    },
  });

  await prisma.leaveBalance.update({
    where: {
      employeeProfileId_leaveTypeId_year: {
        employeeProfileId: employeeProfile.id,
        leaveTypeId: annualLeave.id,
        year: currentYear,
      },
    },
    data: {
      usedDays: '2',
      remainingDays: '8',
    },
  });

  console.log('Seeding completed.');
  console.log('Demo accounts:');
  console.log('admin@example.com / password123');
  console.log('manager@example.com / password123');
  console.log('employee@example.com / password123');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
