import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { EmploymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const adminUserInclude = {
  employeeProfile: {
    include: {
      manager: {
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
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUser() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        employeeProfile: {
          include: {
            manager: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        employeeProfile: {
          include: {
            manager: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                position: true,
                department: true,
              },
            },
            leaveBalances: {
              include: {
                leaveType: true,
              },
              orderBy: {
                year: 'desc',
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(createAdminUserDto: CreateAdminUserDto) {
    await this.ensureEmailIsAvailable(createAdminUserDto.email);
    await this.ensureEmployeeCodeIsAvailable(createAdminUserDto.employeeCode);

    if (createAdminUserDto.managerId) {
      await this.ensureManagerExists(createAdminUserDto.managerId);
    }

    const passwordHash = await bcrypt.hash(createAdminUserDto.password, 10);
    const currentYear = new Date().getFullYear();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: createAdminUserDto.email,
          passwordHash,
          role: createAdminUserDto.role,
          isActive: createAdminUserDto.isActive ?? true,
        },
      });

      const employeeProfile = await tx.employeeProfile.create({
        data: {
          userId: user.id,
          employeeCode: createAdminUserDto.employeeCode,
          firstName: createAdminUserDto.firstName,
          lastName: createAdminUserDto.lastName,
          position: createAdminUserDto.position,
          department: createAdminUserDto.department,
          hireDate: this.parseDateOnly(createAdminUserDto.hireDate),
          managerId: createAdminUserDto.managerId,
          status: EmploymentStatus.ACTIVE,
        },
      });

      const leaveTypes = await tx.leaveType.findMany({
        where: {
          isActive: true,
        },
      });

      await tx.leaveBalance.createMany({
        data: leaveTypes.map((leaveType) => ({
          employeeProfileId: employeeProfile.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          totalDays: leaveType.defaultDaysPerYear.toString(),
          usedDays: 0,
          remainingDays: leaveType.defaultDaysPerYear.toString(),
        })),
      });

      return tx.user.findUnique({
        where: {
          id: user.id,
        },
        include: adminUserInclude,
      });
    });
  }

  async updateUser(id: string, updateAdminUserDto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        employeeProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.employeeProfile) {
      throw new NotFoundException('Employee profile not found');
    }

    if (updateAdminUserDto.email && updateAdminUserDto.email !== user.email) {
      await this.ensureEmailIsAvailable(updateAdminUserDto.email, user.id);
    }

    if (
      updateAdminUserDto.employeeCode &&
      updateAdminUserDto.employeeCode !== user.employeeProfile.employeeCode
    ) {
      await this.ensureEmployeeCodeIsAvailable(
        updateAdminUserDto.employeeCode,
        user.employeeProfile.id,
      );
    }

    if (updateAdminUserDto.managerId) {
      if (updateAdminUserDto.managerId === user.employeeProfile.id) {
        throw new BadRequestException('Employee cannot be their own manager');
      }

      await this.ensureManagerExists(updateAdminUserDto.managerId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id,
        },
        data: {
          email: updateAdminUserDto.email,
          role: updateAdminUserDto.role,
          isActive: updateAdminUserDto.isActive,
        },
      });

      await tx.employeeProfile.update({
        where: {
          id: user.employeeProfile!.id,
        },
        data: {
          employeeCode: updateAdminUserDto.employeeCode,
          firstName: updateAdminUserDto.firstName,
          lastName: updateAdminUserDto.lastName,
          position: updateAdminUserDto.position,
          department: updateAdminUserDto.department,
          hireDate: updateAdminUserDto.hireDate
            ? this.parseDateOnly(updateAdminUserDto.hireDate)
            : undefined,
          status: updateAdminUserDto.status,
          managerId: updateAdminUserDto.managerId,
        },
      });

      return tx.user.findUnique({
        where: {
          id,
        },
        include: adminUserInclude,
      });
    });
  }

  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(resetPasswordDto.password, 10);

    await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        passwordHash,
      },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  private async ensureEmailIsAvailable(email: string, excludeUserId?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser && existingUser.id !== excludeUserId) {
      throw new ConflictException('Email already exists');
    }
  }

  private async ensureEmployeeCodeIsAvailable(
    employeeCode: string,
    excludeEmployeeProfileId?: string,
  ) {
    const existingProfile = await this.prisma.employeeProfile.findUnique({
      where: {
        employeeCode,
      },
    });

    if (existingProfile && existingProfile.id !== excludeEmployeeProfileId) {
      throw new ConflictException('Employee code already exists');
    }
  }

  private async ensureManagerExists(managerId: string) {
    const manager = await this.prisma.employeeProfile.findUnique({
      where: {
        id: managerId,
      },
    });

    if (!manager) {
      throw new NotFoundException('Manager profile not found');
    }
  }

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
