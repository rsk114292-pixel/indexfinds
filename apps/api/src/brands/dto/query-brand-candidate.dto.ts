import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';

export class QueryBrandCandidateDto {
  @IsOptional()
  @Transform(({ value }) => Number(value) || 1)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value) || 20)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'pending',
    'reviewing',
    'approved_alias',
    'approved_child',
    'approved_canonical',
    'classified_unknown',
    'classified_inspired',
    'classified_invalid',
    'rejected',
  ])
  status?: string;
}
