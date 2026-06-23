import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.leaveType.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: {
        id,
      },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }

  async create(createLeaveTypeDto: CreateLeaveTypeDto) {
    const existingLeaveType = await this.prisma.leaveType.findUnique({
      where: {
        name: createLeaveTypeDto.name,
      },
    });

    if (existingLeaveType) {
      throw new ConflictException('Leave type name already exists');
    }

    return this.prisma.leaveType.create({
      data: {
        name: createLeaveTypeDto.name,
        description: createLeaveTypeDto.description,
        defaultDaysPerYear: createLeaveTypeDto.defaultDaysPerYear,
        isPaid: createLeaveTypeDto.isPaid ?? true,
        isActive: createLeaveTypeDto.isActive ?? true,
      },
    });
  }

  async update(id: string, updateLeaveTypeDto: UpdateLeaveTypeDto) {
    await this.findOne(id);

    if (updateLeaveTypeDto.name) {
      const existingLeaveType = await this.prisma.leaveType.findUnique({
        where: {
          name: updateLeaveTypeDto.name,
        },
      });

      if (existingLeaveType && existingLeaveType.id !== id) {
        throw new ConflictException('Leave type name already exists');
      }
    }

    return this.prisma.leaveType.update({
      where: {
        id,
      },
      data: {
        name: updateLeaveTypeDto.name,
        description: updateLeaveTypeDto.description,
        defaultDaysPerYear: updateLeaveTypeDto.defaultDaysPerYear,
        isPaid: updateLeaveTypeDto.isPaid,
        isActive: updateLeaveTypeDto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.leaveType.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}
