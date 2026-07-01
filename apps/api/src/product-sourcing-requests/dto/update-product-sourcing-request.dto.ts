import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProductSourcingRequestStatus } from '../entities/product-sourcing-request.entity';

export class UpdateProductSourcingRequestDto {
  @IsOptional()
  @IsEnum(ProductSourcingRequestStatus)
  status?: ProductSourcingRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;

  @IsOptional()
  @IsUUID()
  linkedProductId?: string | null;
}
