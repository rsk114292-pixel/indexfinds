import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsIn,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateSynonymGroupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  canonicalTerm: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  synonyms: string[];

  @IsOptional()
  @IsString()
  @IsIn(['general', 'brand', 'style', 'material', 'locale'])
  category?: string;
}
