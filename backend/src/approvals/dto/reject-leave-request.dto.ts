import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectLeaveRequestDto {
  @IsString()
  @MaxLength(500)
  @MinLength(2)
  comment!: string;
}
