import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  findAllUser() {
    return this.adminService.findAllUser();
  }

  @Get(':id')
  findOneUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.findOneUser(id);
  }

  @Post()
  createUser(@Body() createAdminUserDto: CreateAdminUserDto) {
    return this.adminService.createUser(createAdminUserDto);
  }

  @Patch(':id/reset-password')
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.adminService.resetPassword(id, resetPasswordDto);
  }

  @Patch(':id')
  updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateAdminUserDto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, updateAdminUserDto);
  }
}
