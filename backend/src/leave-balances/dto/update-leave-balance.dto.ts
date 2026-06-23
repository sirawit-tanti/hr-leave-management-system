import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateLeaveBalanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usedDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainingDays?: number;
}
