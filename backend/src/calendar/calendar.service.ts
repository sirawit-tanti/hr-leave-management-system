import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { LeaveRequestStatus, Role } from '../generated/prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';

const calendarLeaveRequestInclude = {
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

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaveEvents(currentUser: AuthUser, query: CalendarQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);

    const where = this.buildCalendarWhere(currentUser, startDate, endDate);

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where,
      include: calendarLeaveRequestInclude,
      orderBy: [
        {
          startDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return {
      range: {
        startDate: this.formatDateOnly(startDate),
        endDate: this.formatDateOnly(endDate),
      },
      events: leaveRequests.map((leaveRequest) => {
        const employeeName = `${leaveRequest.employeeProfile.firstName} ${leaveRequest.employeeProfile.lastName}`;

        return {
          id: leaveRequest.id,
          title: `${employeeName} - ${leaveRequest.leaveType.name}`,
          startDate: this.formatDateOnly(leaveRequest.startDate),
          endDate: this.formatDateOnly(leaveRequest.endDate),
          totalDays: Number(leaveRequest.totalDays.toString()),
          status: leaveRequest.status,
          leaveType: leaveRequest.leaveType,
          employee: leaveRequest.employeeProfile,
        };
      }),
    };
  }

  private buildCalendarWhere(
    currentUser: AuthUser,
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
    };

    if (currentUser.role === Role.ADMIN) {
      return baseWhere;
    }

    const employeeProfileId = currentUser.employeeProfileId;

    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    if (currentUser.role === Role.MANAGER) {
      return {
        ...baseWhere,
        employeeProfile: {
          OR: [
            {
              id: employeeProfileId,
            },
            {
              managerId: employeeProfileId,
            },
          ],
        },
      };
    }

    return {
      ...baseWhere,
      employeeProfileId,
    };
  }

  private resolveDateRange(query: CalendarQueryDto) {
    const now = new Date();

    const startDate = query.startDate
      ? this.parseDateOnly(query.startDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDate = query.endDate
      ? this.parseDateOnly(query.endDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

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

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
