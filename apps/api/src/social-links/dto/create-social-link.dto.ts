import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSocialLinkDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  icon: string;

  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
