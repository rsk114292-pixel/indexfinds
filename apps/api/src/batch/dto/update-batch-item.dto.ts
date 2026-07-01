import { IsObject, IsOptional } from 'class-validator';

export class UpdateBatchItemDto {
  @IsOptional()
  @IsObject()
  finalData?: Record<string, any>;
}
