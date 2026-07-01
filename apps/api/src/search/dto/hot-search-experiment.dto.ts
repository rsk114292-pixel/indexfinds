import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExperimentVariantDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  id: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  strategy?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;
}

export class CreateExperimentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants: ExperimentVariantDto[];

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class UpdateExperimentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants?: ExperimentVariantDto[];

  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;
}

export class TrackExperimentEventDto {
  @IsNotEmpty()
  @IsString()
  experimentId: string;

  @IsNotEmpty()
  @IsString()
  variantId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['impression', 'click', 'search'])
  eventType: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
