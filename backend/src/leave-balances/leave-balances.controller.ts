import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import type { RequestWithUser } from 'src/auth/types/request-with-user.type';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { LeaveBalancesService } from './leave-balances.service';

@Controller('leave-balances')
export class LeaveBalancesController {
    constructor(private readonly leaveBalancesService: LeaveBalancesService ) {}

    @UseGuards(AuthGuard)
    @Get('me')
    findMe(@Req() request: RequestWithUser) {
        return this.leaveBalancesService.findMe(request.user);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.MANAGER)
    @Get()
    findAll(@Req() request: RequestWithUser) {
        return this.leaveBalancesService.findAll(request.user);
    }

    @UseGuards(AuthGuard)
    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe) id: string, @Req() request: RequestWithUser) {
        return this.leaveBalancesService.findOne(id, request.user);
    }

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Patch(':id')
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateLeaveBalanceDto: UpdateLeaveBalanceDto) {
        return this.leaveBalancesService.update(id, updateLeaveBalanceDto);
    }
}
