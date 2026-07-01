import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectWithdrawalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  adminNote: string;
}
