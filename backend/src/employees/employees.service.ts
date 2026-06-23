import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const employeeInclude = {
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
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
  teamMembers: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      position: true,
      department: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: AuthUser) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.employeeProfile.findMany({
        include: employeeInclude,
        orderBy: {
          employeeCode: 'asc',
        },
      });
    }

    if (currentUser.role === Role.MANAGER && currentUser.employeeProfileId) {
      return this.prisma.employeeProfile.findMany({
        where: {
          OR: [
            { id: currentUser.employeeProfileId },
            { managerId: currentUser.employeeProfileId },
          ],
        },
        include: employeeInclude,
        orderBy: {
          employeeCode: 'asc',
        },
      });
    }

    throw new ForbiddenException('You do not have permission');
  }

  async findMe(currentUser: AuthUser) {
    const employeeProfileId = currentUser.employeeProfileId;
    if (!employeeProfileId) {
      throw new NotFoundException('Employee profile not found');
    }

    const employee = await this.prisma.employeeProfile.findUnique({
      where: {
        id: employeeProfileId,
      },
      include: employeeInclude,
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    return employee;
  }

  async findOne(id: string, currentUser: AuthUser) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: {
        id,
      },
      include: employeeInclude,
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    if (currentUser.role === Role.ADMIN) {
      return employee;
    }

    if (
      currentUser.role === Role.MANAGER &&
      currentUser.employeeProfileId &&
      (employee.id === currentUser.employeeProfileId ||
        employee.managerId === currentUser.employeeProfileId)
    ) {
      return employee;
    }

    if (
      currentUser.role === Role.EMPLOYEE &&
      employee.id === currentUser.employeeProfileId
    ) {
      return employee;
    }

    throw new ForbiddenException('You do not have permission');
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: {
        id,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    return this.prisma.employeeProfile.update({
      where: {
        id,
      },
      data: {
        employeeCode: updateEmployeeDto.employeecode,
        firstName: updateEmployeeDto.firstName,
        lastName: updateEmployeeDto.lastName,
        position: updateEmployeeDto.position,
        department: updateEmployeeDto.department,
        status: updateEmployeeDto.status,
        managerId: updateEmployeeDto.managerId,
        hireDate: updateEmployeeDto.hireDate
          ? new Date(updateEmployeeDto.hireDate)
          : undefined,
      },
      include: employeeInclude,
    });
  }
}
