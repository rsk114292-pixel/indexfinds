import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHotSearchDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  keyword: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsDateString()
  displayStartAt?: string;

  @IsOptional()
  @IsDateString()
  displayEndAt?: string;
}

export class UpdateHotSearchDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number | null;

  @IsOptional()
  @IsDateString()
  displayStartAt?: string | null;

  @IsOptional()
  @IsDateString()
  displayEndAt?: string | null;
}

export class QueryHotSearchDto {
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
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'manual'])
  source?: string;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isPinned?: string;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isBlocked?: string;
}
