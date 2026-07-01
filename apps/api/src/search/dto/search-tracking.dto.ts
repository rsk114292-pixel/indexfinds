import {
  IsString,
  IsUUID,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OutboundPageType,
  OutboundSource,
  OutboundViewportDeviceType,
} from '../entities/outbound-click.entity';

/**
 * 单个曝光商品
 */
export class ImpressionItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0)
  position: number;
}

/**
 * 记录搜索曝光
 */
export class RecordImpressionsDto {
  @IsUUID()
  searchLogId: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImpressionItemDto)
  impressions: ImpressionItemDto[];

  @IsInt()
  @IsOptional()
  page?: number = 1;
}

/**
 * 记录搜索点击
 */
export class RecordSearchClickDto {
  @IsUUID()
  searchLogId: string;

  @IsString()
  @MaxLength(500)
  query: string;

  @IsUUID()
  productId: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  position: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  deviceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  visitId?: string;
}

/**
 * 标记转化
 */
export class MarkConversionDto {
  @IsUUID()
  searchClickId: string;
}

/**
 * 搜索日志响应（包含 searchLogId）
 */
export class SearchLogResponseDto {
  searchLogId: string;
}

/**
 * 记录外跳点击
 */
export class RecordOutboundClickDto {
  @IsUUID()
  productId: string;

  @IsString()
  platformType: string; // weidian, taobao, 1688 等

  @IsString()
  @IsOptional()
  platformUrl?: string;

  @IsEnum(OutboundSource)
  @IsOptional()
  source?: OutboundSource = OutboundSource.DIRECT;

  @IsUUID()
  @IsOptional()
  searchClickId?: string; // 如果来源是搜索

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  deviceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  visitId?: string;

  @IsEnum(OutboundPageType)
  @IsOptional()
  pageType?: OutboundPageType;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  pagePath?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  query?: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  buttonVariant?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  locale?: string;

  @IsEnum(OutboundViewportDeviceType)
  @IsOptional()
  viewportDeviceType?: OutboundViewportDeviceType;
}
