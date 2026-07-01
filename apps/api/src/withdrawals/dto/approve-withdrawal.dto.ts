import { IsString, IsUrl, IsOptional, MaxLength } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'proofImage must be a valid URL' })
  proofImage: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
