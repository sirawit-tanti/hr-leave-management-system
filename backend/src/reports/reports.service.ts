import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveRequestStatus,
  type Prisma,
  Role,
} from '../generated/prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

const reportLeaveRequestInclude = {
  employeeProfile: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      position: true,
      department: true,
      managerId: true,
    },
  },
  leaveType: {
    select: {
      id: true,
      name: true,
      isPaid: true,
    },
  },
} as const;

const reportLeaveBalanceInclude = {
  employeeProfile: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      position: true,
      department: true,
      managerId: true,
    },
  },
  leaveType: {
    select: {
      id: true,
      name: true,
      isPaid: true,
      isActive: true,
    },
  },
} as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaveUsageReport(currentUser: AuthUser, query: ReportQueryDto) {
    this.ensureCanViewReports(currentUser);

    const { startDate, endDate } = this.resolveDateRange(query);
    const where = this.buildLeaveUsageWhere(
      currentUser,
      query,
      startDate,
      endDate,
    );

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where,
      include: reportLeaveRequestInclude,
      orderBy: [
        {
          startDate: 'asc',
        },
        {
          endDate: 'desc',
        },
      ],
    });

    return {
      range: {
        startDate: this.formatDateOnly(startDate),
        endDate: this.formatDateOnly(endDate),
      },
      summary: {
        totalRequests: leaveRequests.length,
        totalUsedDays: this.sumTotalDays(leaveRequests),
      },
      byEmployee: this.buildUsageByEmployee(leaveRequests),
      byLeaveType: this.buildUsageByLeaveType(leaveRequests),
      items: leaveRequests.map((request) => ({
        id: request.id,
        employee: request.employeeProfile,
        leaveType: request.leaveType,
        startDate: this.formatDateOnly(request.startDate),
        endDate: this.formatDateOnly(request.endDate),
        totalDays: Number(request.totalDays.toString()),
        status: request.status,
        reason: request.reason,
      })),
    };
  }

  async getLeaveBalanceReport(currentUser: AuthUser, query: ReportQueryDto) {
    this.ensureCanViewReports(currentUser);

    const where = this.buildLeaveBalanceWhere(currentUser, query);

    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where,
      include: reportLeaveBalanceInclude,
      orderBy: [
        {
          year: 'desc',
        },
        {
          employeeProfile: {
            employeeCode: 'asc',
          },
        },
        {
          leaveType: {
            name: 'asc',
          },
        },
      ],
    });

    return {
      summary: {
        totalRows: leaveBalances.length,
        totalDays: this.sumDecimalField(leaveBalances, 'totalDays'),
        usedDays: this.sumDecimalField(leaveBalances, 'usedDays'),
        remainingDays: this.sumDecimalField(leaveBalances, 'remainingDays'),
      },
      byEmployee: this.buildBalanceByEmployee(leaveBalances),
      items: leaveBalances.map((balance) => ({
        id: balance.id,
        year: balance.year,
        employee: balance.employeeProfile,
        leaveType: balance.leaveType,
        totalDays: Number(balance.totalDays.toString()),
        usedDays: Number(balance.usedDays.toString()),
        remainingDays: Number(balance.remainingDays.toString()),
      })),
    };
  }

  async getLeaveUsageCsv(currentUser: AuthUser, query: ReportQueryDto) {
    const report = await this.getLeaveUsageReport(currentUser, query);

    const rows = report.items.map((item) => ({
      employeeCode: item.employee.employeeCode,
      employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
      department: item.employee.department,
      leaveType: item.leaveType.name,
      startDate: item.startDate,
      endDate: item.endDate,
      totalDays: item.totalDays,
      status: item.status,
      reason: item.reason ?? '',
    }));

    return this.convertToCsv(
      [
        'Employee Code',
        'Employee Name',
        'Department',
        'Leave Type',
        'Start Date',
        'End Date',
        'Total Days',
        'Status',
        'Reason',
      ],
      rows.map((row) => [
        row.employeeCode,
        row.employeeName,
        row.department,
        row.leaveType,
        row.startDate,
        row.endDate,
        row.totalDays,
        row.status,
        row.reason,
      ]),
    );
  }

  private ensureCanViewReports(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER) {
      return;
    }

    throw new ForbiddenException('You do not have permission');
  }

  private buildLeaveUsageWhere(
    currentUser: AuthUser,
    query: ReportQueryDto,
    startDate: Date,
    endDate: Date,
  ): Prisma.LeaveRequestWhereInput {
    const baseWhere: Prisma.LeaveRequestWhereInput = {
      status: LeaveRequestStatus.APPROVED,
      startDate: {
        lte: endDate,
      },
      endDate: {
        gte: startDate,
      },
      employeeProfileId: query.employeeProfileId,
      leaveTypeId: query.leaveTypeId,
    };

    if (currentUser.role === Role.ADMIN) {
      return baseWhere;
    }

    const managerProfileId = currentUser.employeeProfileId;

    if (!managerProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return {
      ...baseWhere,
      employeeProfile: {
        OR: [
          {
            id: managerProfileId,
          },
          {
            managerId: managerProfileId,
          },
        ],
      },
    };
  }

  private buildLeaveBalanceWhere(
    currentUser: AuthUser,
    query: ReportQueryDto,
  ): Prisma.LeaveBalanceWhereInput {
    const baseWhere: Prisma.LeaveBalanceWhereInput = {
      employeeProfileId: query.employeeProfileId,
      leaveTypeId: query.leaveTypeId,
    };

    if (currentUser.role === Role.ADMIN) {
      return baseWhere;
    }

    const managerProfileId = currentUser.employeeProfileId;

    if (!managerProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return {
      ...baseWhere,
      employeeProfile: {
        OR: [
          {
            id: managerProfileId,
          },
          {
            managerId: managerProfileId,
          },
        ],
      },
    };
  }

  private resolveDateRange(query: ReportQueryDto) {
    const now = new Date();

    const startDate = query.startDate
      ? this.parseDateOnly(query.startDate)
      : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const endDate = query.endDate
      ? this.parseDateOnly(query.endDate)
      : new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));

    if (endDate < startDate) {
      throw new BadRequestException(
        'End date must be after or equal to start date',
      );
    }

    return {
      startDate,
      endDate,
    };
  }

  private buildUsageByEmployee(
    leaveRequests: Array<{
      totalDays: { toString: () => string };
      employeeProfile: {
        id: string;
        employeeCode: string;
        firstName: string;
        lastName: string;
        department: string;
      };
    }>,
  ) {
    const usageMap = new Map<
      string,
      {
        employeeProfileId: string;
        employeeCode: string;
        employeeName: string;
        department: string;
        totalRequests: number;
        totalUsedDays: number;
      }
    >();

    for (const request of leaveRequests) {
      const employee = request.employeeProfile;
      const current = usageMap.get(employee.id);
      const totalDays = Number(request.totalDays.toString());

      if (!current) {
        usageMap.set(employee.id, {
          employeeProfileId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          totalRequests: 1,
          totalUsedDays: totalDays,
        });

        continue;
      }

      current.totalRequests += 1;
      current.totalUsedDays += totalDays;
    }

    return Array.from(usageMap.values());
  }

  private buildUsageByLeaveType(
    leaveRequests: Array<{
      totalDays: { toString: () => string };
      leaveType: { id: string; name: string };
    }>,
  ) {
    const usageMap = new Map<
      string,
      {
        leaveTypeId: string;
        leaveTypeName: string;
        totalRequests: number;
        totalUsedDays: number;
      }
    >();

    for (const request of leaveRequests) {
      const leaveType = request.leaveType;
      const current = usageMap.get(leaveType.id);
      const totalDays = Number(request.totalDays.toString());

      if (!current) {
        usageMap.set(leaveType.id, {
          leaveTypeId: leaveType.id,
          leaveTypeName: leaveType.name,
          totalRequests: 1,
          totalUsedDays: totalDays,
        });

        continue;
      }

      current.totalRequests += 1;
      current.totalUsedDays += totalDays;
    }

    return Array.from(usageMap.values());
  }

  private buildBalanceByEmployee(
    leaveBalances: Array<{
      totalDays: { toString: () => string };
      usedDays: { toString: () => string };
      remainingDays: { toString: () => string };
      employeeProfile: {
        id: string;
        employeeCode: string;
        firstName: string;
        lastName: string;
        department: string;
      };
    }>,
  ) {
    const balanceMap = new Map<
      string,
      {
        employeeProfileId: string;
        employeeCode: string;
        employeeName: string;
        department: string;
        totalDays: number;
        usedDays: number;
        remainingDays: number;
      }
    >();

    for (const balance of leaveBalances) {
      const employee = balance.employeeProfile;
      const current = balanceMap.get(employee.id);

      const totalDays = Number(balance.totalDays.toString());
      const usedDays = Number(balance.usedDays.toString());
      const remainingDays = Number(balance.remainingDays.toString());

      if (!current) {
        balanceMap.set(employee.id, {
          employeeProfileId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          totalDays,
          usedDays,
          remainingDays,
        });

        continue;
      }

      current.totalDays += totalDays;
      current.usedDays += usedDays;
      current.remainingDays += remainingDays;
    }

    return Array.from(balanceMap.values());
  }

  private sumTotalDays(
    leaveRequests: Array<{ totalDays: { toString: () => string } }>,
  ) {
    return leaveRequests.reduce((total, request) => {
      return total + Number(request.totalDays.toString());
    }, 0);
  }

  private sumDecimalField<T extends Record<string, unknown>>(
    items: T[],
    field: keyof T,
  ) {
    return items.reduce((total, item) => {
      const value = item[field] as { toString: () => string };
      return total + Number(value.toString());
    }, 0);
  }

  private convertToCsv(headers: string[], rows: Array<Array<string | number>>) {
    const csvHeaders = headers
      .map((header) => this.escapeCsvValue(header))
      .join(',');

    const csvRows = rows.map((row) => {
      return row.map((value) => this.escapeCsvValue(value)).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  private escapeCsvValue(value: string | number) {
    const stringValue = String(value);

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private parseDateOnlyEndOfDay(value: string) {
    return new Date(`${value}T23:59:59:999Z`);
  }

  private formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
