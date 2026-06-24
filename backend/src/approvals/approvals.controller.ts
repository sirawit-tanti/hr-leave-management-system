import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/types/request-with-user.type';
import { ApprovalsService } from './approvals.service';
import { ApproveLeaveRequestDto } from './dto/approve-leave-request.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';

@Controller('approvals')
@UseGuards(AuthGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  findPending(@Req() request: RequestWithUser) {
    return this.approvalsService.findPending(request.user);
  }

  @Patch(':id/approve')
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() approveLeaveRequestDto: ApproveLeaveRequestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.approvalsService.approve(
      id,
      approveLeaveRequestDto,
      request.user,
    );
  }

  @Patch(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() rejectLeaveRequestDto: RejectLeaveRequestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.approvalsService.reject(
      id,
      rejectLeaveRequestDto,
      request.user,
    );
  }
}
