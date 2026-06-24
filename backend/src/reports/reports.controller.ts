import {
  Controller,
  Get,
  Header,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/types/request-with-user.type';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('leave-usage')
  getLeaveUsageReport(
    @Query() query: ReportQueryDto,
    @Req() request: RequestWithUser,
  ) {
    return this.reportsService.getLeaveUsageReport(request.user, query);
  }

  @Get('leave-balances')
  getLeaveBalanceReport(
    @Query() query: ReportQueryDto,
    @Req() request: RequestWithUser,
  ) {
    return this.reportsService.getLeaveBalanceReport(request.user, query);
  }

  @Get('leave-usage/export')
  @Header('Content-Type', 'text/csv')
  async exportLeaveUsageReport(
    @Query() query: ReportQueryDto,
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.reportsService.getLeaveUsageCsv(request.user, query);

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="leave-usage-report.csv"',
    );

    return csv;
  }
}
