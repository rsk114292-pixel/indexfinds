import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TrafficBlockScope,
  TrafficBlockStatus,
} from '../entities/traffic-block.entity';

export class QueryTrafficDefenseCandidatesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  minutes?: number = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QueryTrafficBlocksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(TrafficBlockStatus))
  status?: TrafficBlockStatus;
}

export class CreateTrafficBlockDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  target: string;

  @IsOptional()
  @IsString()
  @IsIn([TrafficBlockScope.PRODUCT_PATHS])
  scope?: TrafficBlockScope = TrafficBlockScope.PRODUCT_PATHS;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 6, 12, 24])
  ttlHours: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metricsSnapshot?: Record<string, unknown>;
}

export class IgnoreTrafficCandidateDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  target: string;

  @IsOptional()
  @IsString()
  @IsIn([TrafficBlockScope.PRODUCT_PATHS])
  scope?: TrafficBlockScope = TrafficBlockScope.PRODUCT_PATHS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([6, 12, 24])
  ttlHours?: number = 6;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metricsSnapshot?: Record<string, unknown>;
}
