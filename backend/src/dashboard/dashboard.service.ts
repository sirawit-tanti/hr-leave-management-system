import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus, Role } from '../generated/prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

const leaveRequestSummaryInclude = {
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

const leaveBalanceInclude = {
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
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN) {
      return this.getAdminDashboard();
    }

    if (currentUser.role === Role.MANAGER) {
      return this.getManagerDashboard(currentUser);
    }

    return this.getEmployeeDashboard(currentUser);
  }

  private async getAdminDashboard() {
    const currrentYear = new Date().getFullYear();
    const { startOfYear, endOfYear } = this.getYearRange(currrentYear);

    const [
      totalEmployees,
      activeEmployees,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      cancelledRequests,
      recentLeaveRequests,
      approvedRequestsThisYear,
    ] = await Promise.all([
      this.prisma.employeeProfile.count(),
      this.prisma.employeeProfile.count({
        where: {
          status: 'ACTIVE',
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: LeaveRequestStatus.PENDING,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: LeaveRequestStatus.APPROVED,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: LeaveRequestStatus.REJECTED,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: LeaveRequestStatus.CANCELLED,
        },
      }),
      this.prisma.leaveRequest.findMany({
        take: 5,
        include: leaveRequestSummaryInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: LeaveRequestStatus.APPROVED,
          startDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        include: {
          leaveType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      role: Role.ADMIN,
      summary: {
        totalEmployees,
        activeEmployees,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        cancelledRequests,
      },
      leaveUsageByType: this.buildLeaveUsageByType(approvedRequestsThisYear),
      recentLeaveRequests,
    };
  }

  private async getManagerDashboard(currentUser: AuthUser) {
    const managerProfileId = currentUser.employeeProfileId;

    if (!managerProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    const [
      myLeaveBalances,
      teamMembersCount,
      pendingApprovals,
      recentTeamLeaveRequests,
      myRecentLeaveRequests,
    ] = await Promise.all([
      this.prisma.leaveBalance.findMany({
        where: {
          employeeProfileId: managerProfileId,
        },
        include: leaveBalanceInclude,
        orderBy: {
          year: 'desc',
        },
      }),
      this.prisma.employeeProfile.count({
        where: {
          managerId: managerProfileId,
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: LeaveRequestStatus.PENDING,
          employeeProfile: {
            managerId: managerProfileId,
          },
        },
        include: leaveRequestSummaryInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeProfile: {
            OR: [{ id: managerProfileId }, { managerId: managerProfileId }],
          },
        },
        take: 5,
        include: leaveRequestSummaryInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeProfileId: managerProfileId,
        },
        take: 5,
        include: leaveRequestSummaryInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      role: Role.MANAGER,
      summary: {
        teamMembersCount,
        pendingApprovalsCount: pendingApprovals.length,
        totalRemainingDays: this.sumRemainingDays(myLeaveBalances),
      },
      myLeaveBalances,
      pendingApprovals,
      recentTeamLeaveRequests,
      myRecentLeaveRequests,
    };
  }

  private async getEmployeeDashboard(currentUser: AuthUser) {
    const employeeProfileId = currentUser.employeeProfileId;

    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    const [
      myLeaveBalances,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      cancelledRequests,
      recentLeaveRequests,
    ] = await Promise.all([
      this.prisma.leaveBalance.findMany({
        where: {
          employeeProfileId,
        },
        include: leaveBalanceInclude,
        orderBy: {
          year: 'desc',
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employeeProfileId,
          status: LeaveRequestStatus.PENDING,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employeeProfileId,
          status: LeaveRequestStatus.APPROVED,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employeeProfileId,
          status: LeaveRequestStatus.REJECTED,
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employeeProfileId,
          status: LeaveRequestStatus.CANCELLED,
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeProfileId,
        },
        take: 5,
        include: leaveRequestSummaryInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      role: Role.EMPLOYEE,
      summary: {
        totalRemainingDays: this.sumRemainingDays(myLeaveBalances),
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        cancelledRequests,
      },
      myLeaveBalances,
      recentLeaveRequests,
    };
  }

  private sumRemainingDays(
    leaveBalances: Array<{ remainingDays: { toString: () => string } }>,
  ) {
    return leaveBalances.reduce((total, balance) => {
      return total + Number(balance.remainingDays.toString());
    }, 0);
  }

  private buildLeaveUsageByType(
    leaveRequests: Array<{
      totalDays: { toString: () => string };
      leaveType: { id: string; name: string };
    }>,
  ) {
    const usageMap = new Map<
      string,
      { leaveTypeId: string; name: string; usedDays: number }
    >();

    for (const request of leaveRequests) {
      const current = usageMap.get(request.leaveType.id);

      if (!current) {
        usageMap.set(request.leaveType.id, {
          leaveTypeId: request.leaveType.id,
          name: request.leaveType.name,
          usedDays: Number(request.totalDays.toString()),
        });

        continue;
      }

      current.usedDays += Number(request.totalDays.toString());
    }

    return Array.from(usageMap.values());
  }

  private getYearRange(year: number) {
    return {
      startOfYear: new Date(Date.UTC(year, 0, 1)),
      endOfYear: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    };
  }
}
