import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { RequestWithUser } from '../auth/types/request-with-user.type';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @UseGuards(AuthGuard)
  @Get('leave-events')
  getLeaveEvents(
    @Query() query: CalendarQueryDto,
    @Req() request: RequestWithUser,
  ) {
    return this.calendarService.getLeaveEvents(request.user, query);
  }
}
