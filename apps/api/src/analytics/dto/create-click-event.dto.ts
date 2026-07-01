import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Legacy DTO for /analytics/click-events.
 * Only used by the legacy referral/conversion compatibility path.
 */
export class CreateClickEventDto {
  @IsString()
  productId: string;

  @IsString()
  platform: string;

  @IsString()
  @IsOptional()
  weidianItemId?: string;

  @IsObject()
  @IsOptional()
  skuInfo?: Record<string, any>;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  referralCode?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ip?: string;
}
