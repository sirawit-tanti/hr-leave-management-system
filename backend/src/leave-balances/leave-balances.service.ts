import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';

const leaveBalanceInclude = {
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
      description: true,
      defaultDaysPerYear: true,
      isPaid: true,
      isActive: true,
    },
  },
} as const;

@Injectable()
export class LeaveBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(currentUser: AuthUser) {
    const employeeProfileId = currentUser.employeeProfileId;

    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return this.prisma.leaveBalance.findMany({
      where: {
        employeeProfileId,
      },
      include: leaveBalanceInclude,
      orderBy: [
        {
          year: 'desc',
        },
        {
          leaveType: {
            name: 'asc',
          },
        },
      ],
    });
  }

  async findAll(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.leaveBalance.findMany({
        include: leaveBalanceInclude,
        orderBy: [
          {
            year: 'desc',
          },
          {
            employeeProfile: {
              employeeCode: 'asc',
            },
          },
        ],
      });
    }

    if (currentUser.role === Role.MANAGER && currentUser.employeeProfileId) {
      return this.prisma.leaveBalance.findMany({
        where: {
          employeeProfile: {
            OR: [
              {
                id: currentUser.employeeProfileId,
              },
              {
                managerId: currentUser.employeeProfileId,
              },
            ],
          },
        },
        include: leaveBalanceInclude,
        orderBy: [
          {
            year: 'desc',
          },
          {
            employeeProfile: {
              employeeCode: 'asc',
            },
          },
        ],
      });
    }

    throw new ForbiddenException('You do not have permission');
  }

  async findOne(id: string, currentUser: AuthUser) {
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        id,
      },
      include: leaveBalanceInclude,
    });

    if (!leaveBalance) {
      throw new NotFoundException('Leave balance not found');
    }

    if (
      currentUser.role === Role.MANAGER &&
      currentUser.employeeProfileId &&
      (leaveBalance.employeeProfileId === currentUser.employeeProfileId ||
        leaveBalance.employeeProfile.managerId ===
          currentUser.employeeProfileId)
    ) {
      return leaveBalance;
    }

    if (
      currentUser.role === Role.EMPLOYEE &&
      leaveBalance.employeeProfileId === currentUser.employeeProfileId
    ) {
      return leaveBalance;
    }

    throw new ForbiddenException('You do not have permission');
  }

  async update(id: string, updateLeaveBalanceDto: UpdateLeaveBalanceDto) {
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        id,
      },
    });

    if (!leaveBalance) {
      throw new NotFoundException('Leave balance not found');
    }

    const currentTotalDays = Number(leaveBalance.totalDays.toString());
    const currentUsedDays = Number(leaveBalance.usedDays.toString());

    const totalDays = updateLeaveBalanceDto.totalDays ?? currentTotalDays;
    const usedDays = updateLeaveBalanceDto.usedDays ?? currentUsedDays;
    const remainingDays =
      updateLeaveBalanceDto.remainingDays ?? totalDays - usedDays;

    if (usedDays > totalDays) {
      throw new BadRequestException('Used days cannot exceed total days');
    }

    if (remainingDays < 0) {
      throw new BadRequestException('Remaining days cannot be negative');
    }

    return this.prisma.leaveBalance.update({
      where: {
        id,
      },
      data: {
        totalDays: totalDays.toString(),
        usedDays: usedDays.toString(),
        remainingDays: remainingDays.toString(),
      },
      include: leaveBalanceInclude,
    });
  }
}
