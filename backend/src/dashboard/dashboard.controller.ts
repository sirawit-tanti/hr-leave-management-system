import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { RequestWithUser } from '../auth/types/request-with-user.type';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard)
  @Get()
  getDashboard(@Req() request: RequestWithUser) {
    return this.dashboardService.getDashboard(request.user);
  }
}
