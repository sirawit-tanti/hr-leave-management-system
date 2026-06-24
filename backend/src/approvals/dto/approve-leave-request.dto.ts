import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
