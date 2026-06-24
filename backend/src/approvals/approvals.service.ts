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
import { ApproveLeaveRequestDto } from './dto/approve-leave-request.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';

const approvalInclude = {
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
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPending(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.leaveRequest.findMany({
        where: {
          status: LeaveRequestStatus.PENDING,
        },
        include: approvalInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    const managerProfileId = currentUser.employeeProfileId;

    if (!managerProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return this.prisma.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.PENDING,
        employeeProfile: {
          managerId: managerProfileId,
        },
      },
      include: approvalInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approve(
    leaveRequestId: string,
    approveLeaveRequestDto: ApproveLeaveRequestDto,
    currentUser: AuthUser,
  ) {
    const approverProfileId = currentUser.employeeProfileId;

    if (!approverProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.findUnique({
        where: {
          id: leaveRequestId,
        },
        include: {
          employeeProfile: true,
          leaveType: true,
        },
      });

      if (!leaveRequest) {
        throw new NotFoundException('Leave request not found');
      }

      this.ensureCanApproveOrReject(currentUser, leaveRequest);

      const leaveYear = leaveRequest.startDate.getUTCFullYear();

      const leaveBalance = await tx.leaveBalance.findUnique({
        where: {
          employeeProfileId_leaveTypeId_year: {
            employeeProfileId: leaveRequest.employeeProfileId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: leaveYear,
          },
        },
      });

      if (!leaveBalance) {
        throw new BadRequestException('Leave balance not found');
      }

      const requestedDays = Number(leaveRequest.totalDays.toString());
      const usedDays = Number(leaveBalance.usedDays.toString());
      const remainingDays = Number(leaveBalance.remainingDays.toString());

      if (requestedDays > remainingDays) {
        throw new BadRequestException(
          'Leave request exceeds remaining balance',
        );
      }

      await tx.leaveBalance.update({
        where: {
          id: leaveBalance.id,
        },
        data: {
          usedDays: (usedDays + requestedDays).toString(),
          remainingDays: (remainingDays - requestedDays).toString(),
        },
      });

      await tx.leaveRequest.update({
        where: {
          id: leaveRequest.id,
        },
        data: {
          status: LeaveRequestStatus.APPROVED,
          managerNote:
            approveLeaveRequestDto.comment ?? 'Leave request approved.',
          decidedAt: new Date(),
        },
      });

      await tx.approvalAction.create({
        data: {
          leaveRequestId,
          approverProfileId,
          action: ApprovalActionType.APPROVED,
          comment: approveLeaveRequestDto.comment ?? 'Leave request approved.',
        },
      });

      return tx.leaveRequest.findUnique({
        where: {
          id: leaveRequestId,
        },
        include: approvalInclude,
      });
    });
  }

  async reject(
    leaveRequestId: string,
    rejectLeaveRequestDto: RejectLeaveRequestDto,
    currentUser: AuthUser,
  ) {
    const approverProfileId = currentUser.employeeProfileId;

    if (!approverProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.findUnique({
        where: {
          id: leaveRequestId,
        },
        include: {
          employeeProfile: true,
        },
      });

      if (!leaveRequest) {
        throw new NotFoundException('Leave request not found');
      }

      this.ensureCanApproveOrReject(currentUser, leaveRequest);

      await tx.leaveRequest.update({
        where: {
          id: leaveRequestId,
        },
        data: {
          status: LeaveRequestStatus.REJECTED,
          managerNote: rejectLeaveRequestDto.comment,
          decidedAt: new Date(),
        },
      });

      await tx.approvalAction.create({
        data: {
          leaveRequestId,
          approverProfileId,
          action: ApprovalActionType.REJECTED,
          comment: rejectLeaveRequestDto.comment,
        },
      });

      return tx.leaveRequest.findUnique({
        where: {
          id: leaveRequestId,
        },
        include: approvalInclude,
      });
    });
  }

  private ensureCanApproveOrReject(
    currentUser: AuthUser,
    leaveRequest: {
      employeeProfileId: string;
      status: LeaveRequestStatus;
      employeeProfile: {
        managerId: string | null;
      };
    },
  ) {
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be reviewed',
      );
    }

    if (leaveRequest.employeeProfileId === currentUser.employeeProfileId) {
      throw new ForbiddenException('You cannot review your own leave request');
    }

    if (currentUser.role === Role.ADMIN) {
      return;
    }

    if (
      currentUser.role === Role.MANAGER &&
      leaveRequest.employeeProfile.managerId === currentUser.employeeProfileId
    ) {
      return;
    }

    throw new ForbiddenException('You do not have permission');
  }
}
