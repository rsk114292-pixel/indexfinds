import {
  IsArray,
  IsOptional,
  IsEnum,
  IsUrl,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { BatchJobType } from '../entities/batch-job.entity';

export class CreateBatchJobDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个 URL' })
  @IsUrl({}, { each: true })
  @ArrayMaxSize(1000)
  urls: string[];

  @IsOptional()
  @IsEnum(BatchJobType)
  type?: BatchJobType;
}
