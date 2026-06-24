import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalActionType,
  LeaveRequestStatus,
  Role,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CancelLeaveRequestDto } from './dto/cancel-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

const leaveRequestInclude = {
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
      isPaid: true,
      isActive: true,
    },
  },
  approvalActions: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      approverProfile: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          position: true,
          department: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.leaveRequest.findMany({
        include: leaveRequestInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    const employeeProfileId = currentUser.employeeProfileId;

    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    if (currentUser.role === Role.MANAGER) {
      return this.prisma.leaveRequest.findMany({
        where: {
          employeeProfile: {
            OR: [{ id: employeeProfileId }, { managerId: employeeProfileId }],
          },
        },
        include: leaveRequestInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return this.prisma.leaveRequest.findMany({
      where: {
        employeeProfileId,
      },
      include: leaveRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, currentUser: AuthUser) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: leaveRequestInclude,
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    this.ensureCanAccessLeaveRequest(currentUser, leaveRequest);

    return leaveRequest;
  }

  async create(
    createLeaveRequestDto: CreateLeaveRequestDto,
    currentUser: AuthUser,
  ) {
    const employeeProfileId = currentUser.employeeProfileId;

    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    const startDate = this.parseDateOnly(createLeaveRequestDto.startDate);
    const endDate = this.parseDateOnly(createLeaveRequestDto.endDate);
    const totalDays = this.calculateTotalDays(startDate, endDate);

    await this.validateLeaveType(createLeaveRequestDto.leaveTypeId);
    await this.validateLeaveBalance({
      employeeProfileId,
      leaveTypeId: createLeaveRequestDto.leaveTypeId,
      year: startDate.getUTCFullYear(),
      totalDays,
    });

    return this.prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.create({
        data: {
          employeeProfileId,
          leaveTypeId: createLeaveRequestDto.leaveTypeId,
          startDate,
          endDate,
          totalDays: totalDays.toString(),
          reason: createLeaveRequestDto.reason,
          status: LeaveRequestStatus.PENDING,
        },
      });

      await tx.approvalAction.create({
        data: {
          leaveRequestId: leaveRequest.id,
          action: ApprovalActionType.CREATED,
          comment: 'Leave request created.',
        },
      });

      return tx.leaveRequest.findUnique({
        where: {
          id: leaveRequest.id,
        },
        include: leaveRequestInclude,
      });
    });
  }

  async update(
    id: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
    currentUser: AuthUser,
  ) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: {
        employeeProfile: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    this.ensureCanModifyOwnPendingRequest(currentUser, leaveRequest);

    const isChangingLeaveType = Boolean(updateLeaveRequestDto.leaveTypeId);
    const leaveTypeId =
      updateLeaveRequestDto.leaveTypeId ?? leaveRequest.leaveTypeId;
    const startDate = updateLeaveRequestDto.startDate
      ? this.parseDateOnly(updateLeaveRequestDto.startDate)
      : leaveRequest.startDate;
    const endDate = updateLeaveRequestDto.endDate
      ? this.parseDateOnly(updateLeaveRequestDto.endDate)
      : leaveRequest.endDate;
    const totalDays = this.calculateTotalDays(startDate, endDate);

    if (isChangingLeaveType) {
      await this.validateLeaveType(leaveTypeId);
    }
    await this.validateLeaveBalance({
      employeeProfileId: leaveRequest.employeeProfileId,
      leaveTypeId,
      year: startDate.getUTCFullYear(),
      totalDays,
    });

    return this.prisma.leaveRequest.update({
      where: {
        id,
      },
      data: {
        leaveTypeId,
        startDate,
        endDate,
        totalDays: totalDays.toString(),
        reason: updateLeaveRequestDto.reason,
      },
      include: leaveRequestInclude,
    });
  }

  async cancel(
    id: string,
    cancelLeaveRequestDto: CancelLeaveRequestDto,
    currentUser: AuthUser,
  ) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: {
        employeeProfile: true,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    this.ensureCanModifyOwnPendingRequest(currentUser, leaveRequest);

    return this.prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: {
          id,
        },
        data: {
          status: LeaveRequestStatus.CANCELLED,
        },
      });

      await tx.approvalAction.create({
        data: {
          leaveRequestId: id,
          action: ApprovalActionType.CANCELLED,
          comment: cancelLeaveRequestDto.comment ?? 'Leave request cancelled.',
        },
      });

      return tx.leaveRequest.findUnique({
        where: {
          id,
        },
        include: leaveRequestInclude,
      });
    });
  }

  private ensureCanAccessLeaveRequest(
    currentUser: AuthUser,
    leaveRequest: {
      employeeProfileId: string;
      employeeProfile: {
        managerId: string | null;
      };
    },
  ) {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    if (
      currentUser.role === Role.MANAGER &&
      currentUser.employeeProfileId &&
      (leaveRequest.employeeProfileId === currentUser.employeeProfileId ||
        leaveRequest.employeeProfile.managerId ===
          currentUser.employeeProfileId)
    ) {
      return;
    }

    if (
      currentUser.role === Role.EMPLOYEE &&
      leaveRequest.employeeProfileId === currentUser.employeeProfileId
    ) {
      return;
    }

    throw new ForbiddenException('You do not have permission');
  }

  private ensureCanModifyOwnPendingRequest(
    currentUser: AuthUser,
    leaveRequest: {
      employeeProfileId: string;
      status: LeaveRequestStatus;
    },
  ) {
    if (leaveRequest.employeeProfileId !== currentUser.employeeProfileId) {
      throw new ForbiddenException(
        'You can only modify your own leave request',
      );
    }

    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be modified',
      );
    }
  }

  private async validateLeaveType(leaveTypeId: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: {
        id: leaveTypeId,
      },
    });

    if (!leaveType || !leaveType.isActive) {
      throw new BadRequestException('Leave type is not available');
    }

    return leaveType;
  }

  private async validateLeaveBalance(params: {
    employeeProfileId: string;
    leaveTypeId: string;
    year: number;
    totalDays: number;
  }) {
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeProfileId_leaveTypeId_year: {
          employeeProfileId: params.employeeProfileId,
          leaveTypeId: params.leaveTypeId,
          year: params.year,
        },
      },
    });

    if (!leaveBalance) {
      throw new BadRequestException(
        'Leave balance not found for this leave type',
      );
    }

    const remainingDays = Number(leaveBalance.remainingDays.toString());

    if (params.totalDays > remainingDays) {
      throw new BadRequestException('Leave request exceeds remaining balance');
    }
  }

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private calculateTotalDays(startDate: Date, endDate: Date) {
    if (endDate < startDate) {
      throw new BadRequestException(
        'End date must be after or equal to start date',
      );
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diff = endDate.getTime() - startDate.getTime();

    return diff / millisecondsPerDay + 1;
  }
}
