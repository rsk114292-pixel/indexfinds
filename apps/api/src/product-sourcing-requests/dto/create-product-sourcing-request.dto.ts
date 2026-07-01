import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductSourcingRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  searchQuery?: string;

  @IsString()
  @MaxLength(255)
  productName: string;

  @ValidateIf(
    (_, value) => value !== null && value !== undefined && value !== '',
  )
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  referenceUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl(
    {
      require_protocol: true,
      protocols: ['http', 'https'],
      require_tld: false,
    },
    { each: true },
  )
  imageUrls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsUUID()
  searchLogId?: string;

  @IsOptional()
  @IsObject()
  filtersSnapshot?: Record<string, string>;
}
