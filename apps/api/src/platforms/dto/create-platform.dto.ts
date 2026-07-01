import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PLATFORM_TRANSLATION_LOCALE_SET } from '../constants/platform-translation-locales';

@ValidatorConstraint({ name: 'platformTranslationsValid', async: false })
class PlatformTranslationsValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value == null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;

    const translations = value as Record<string, unknown>;
    for (const [locale, fields] of Object.entries(translations)) {
      if (!PLATFORM_TRANSLATION_LOCALE_SET.has(locale)) return false;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return false;
      }

      const translation = fields as Record<string, unknown>;
      for (const fieldKey of Object.keys(translation)) {
        if (fieldKey !== 'name' && fieldKey !== 'description') return false;
        const fieldValue = translation[fieldKey];
        if (
          fieldValue !== undefined &&
          fieldValue !== null &&
          typeof fieldValue !== 'string'
        ) {
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(): string {
    return 'translations must use locales en/zh/fr/de/es/it/pt/ar and only include string name/description';
  }
}

export class CreatePlatformDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  @Validate(PlatformTranslationsValidator)
  translations?: Record<string, { name?: string; description?: string }>;

  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsString()
  @IsOptional()
  inviteCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  urlTemplate?: string;
}
