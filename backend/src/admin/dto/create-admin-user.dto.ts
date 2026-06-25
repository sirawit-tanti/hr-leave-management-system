import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  employeeCode!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  position!: string;

  @IsString()
  department!: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
