import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ResolveBrandCandidateDto {
  @IsString()
  @IsIn([
    'bind_existing',
    'create_child',
    'create_canonical',
    'classify_unknown',
    'classify_inspired',
    'classify_invalid',
  ])
  action: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  parentBrandId?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  @IsIn(['parent_child', 'brand_line'])
  relationType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
