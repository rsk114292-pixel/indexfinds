import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductSourcingRequestStatus } from '../entities/product-sourcing-request.entity';

export class QueryAdminProductSourcingRequestDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProductSourcingRequestStatus)
  status?: ProductSourcingRequestStatus;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasImages?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
