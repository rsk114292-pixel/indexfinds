import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSynonymGroupDto } from './create-synonym-group.dto';

export class BatchImportSynonymDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSynonymGroupDto)
  @ArrayMinSize(1)
  groups: CreateSynonymGroupDto[];
}
