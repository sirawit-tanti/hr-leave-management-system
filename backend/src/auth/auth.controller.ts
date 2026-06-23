import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { RequestWithUser } from './types/request-with-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() request: RequestWithUser) {
    return {
      user: request.user,
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminOnly() {
    return {
      message: 'Admin only route',
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('manager-or-admin')
  getManagerOrAdmin() {
    return {
      message: 'Manager or admin route',
    };
  }
}
