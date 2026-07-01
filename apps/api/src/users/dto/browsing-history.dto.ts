import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecordViewDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

class BulkSyncItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsNumber()
  viewedAt: number;
}

export class BulkSyncBrowsingHistoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSyncItemDto)
  items: BulkSyncItemDto[];
}
