import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateSynonymGroupDto } from './create-synonym-group.dto';

export class UpdateSynonymGroupDto extends PartialType(CreateSynonymGroupDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
