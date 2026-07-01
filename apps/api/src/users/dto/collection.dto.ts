import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}

export class UpdateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}

export class AddCollectionItemsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  favoriteIds: string[];
}

export class QueryFavoritesDto {
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

  @IsOptional()
  @IsUUID('4')
  collectionId?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'priceMin'])
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
