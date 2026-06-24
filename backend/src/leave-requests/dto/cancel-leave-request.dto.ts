import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
