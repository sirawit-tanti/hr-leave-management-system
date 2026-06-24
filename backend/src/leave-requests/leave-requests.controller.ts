import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { RequestWithUser } from '../auth/types/request-with-user.type';
import { CancelLeaveRequestDto } from './dto/cancel-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestService: LeaveRequestsService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Req() request: RequestWithUser) {
    return this.leaveRequestService.findAll(request.user);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.leaveRequestService.create(createLeaveRequestDto, request.user);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: RequestWithUser,
  ) {
    return this.leaveRequestService.findOne(id, request.user);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.leaveRequestService.update(
      id,
      updateLeaveRequestDto,
      request.user,
    );
  }

  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() cancelLeaveRequestDto: CancelLeaveRequestDto,
    @Req() request: RequestWithUser,
  ) {
    return this.leaveRequestService.cancel(
      id,
      cancelLeaveRequestDto,
      request.user,
    );
  }
}
