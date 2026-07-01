import {
  IsBoolean,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const CONSENT_STATUSES = ['pending', 'accepted', 'rejected'] as const;
const GA_STATUSES = [
  'unknown',
  'waiting_for_consent',
  'loading',
  'ready',
  'blocked',
  'disabled',
  'failed',
] as const;
const GA_TARGETS = ['ga', 'gtm'] as const;

export class CreateVisitSessionDto {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  visitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  refClickId?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  utmTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  utmContent?: string;

  @IsString()
  landingPage: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(CONSENT_STATUSES)
  consentStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(GA_STATUSES)
  gaStatus?: string;

  @IsOptional()
  @IsBoolean()
  gaTrackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  gaRequested?: boolean;

  @IsOptional()
  @IsBoolean()
  gaScriptLoaded?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(GA_TARGETS)
  gaConfiguredTarget?: string;

  @IsOptional()
  @IsBoolean()
  gaFirstPageviewSent?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  gaEventCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gaFailedReason?: string;

  @IsOptional()
  @IsBoolean()
  isInAppBrowser?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  browserContext?: string;
}
