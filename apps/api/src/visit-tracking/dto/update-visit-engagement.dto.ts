import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ENGAGEMENT_REASONS = [
  'heartbeat',
  'milestone',
  'visibility_hidden',
  'pagehide',
  'outbound',
] as const;

export class UpdateVisitEngagementDto {
  @IsString()
  @MaxLength(255)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  visitId?: string;

  @IsInt()
  @Min(0)
  @Max(60000)
  activeDeltaMs: number;

  @IsInt()
  @Min(0)
  @Max(120000)
  totalDeltaMs: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  eventCount?: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pagePath?: string;

  @IsOptional()
  @IsString()
  @IsIn(ENGAGEMENT_REASONS)
  reason?: string;
}
