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
import type { PlatformComparisonData } from '../entities/platform.entity';

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

const COMPARISON_STRING_FIELDS = new Set([
  'serviceFee',
  'shippingCoverage',
  'qcService',
  'paymentMethods',
  'returnPolicy',
]);
const COMPARISON_NUMBER_FIELDS = new Set([
  'freeStorageDays',
  'shippingBaseFeeUsd',
  'shippingRatePerKgUsd',
]);

@ValidatorConstraint({ name: 'platformComparisonDataValid', async: false })
class PlatformComparisonDataValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value == null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;

    for (const [key, fieldValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (COMPARISON_STRING_FIELDS.has(key)) {
        if (
          fieldValue != null &&
          (typeof fieldValue !== 'string' || fieldValue.length > 500)
        ) {
          return false;
        }
        continue;
      }
      if (COMPARISON_NUMBER_FIELDS.has(key)) {
        if (
          fieldValue != null &&
          (typeof fieldValue !== 'number' ||
            !Number.isFinite(fieldValue) ||
            fieldValue < 0)
        ) {
          return false;
        }
        continue;
      }
      if (key === 'dataUpdatedAt') {
        if (
          fieldValue != null &&
          (typeof fieldValue !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(fieldValue))
        ) {
          return false;
        }
        continue;
      }
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'comparisonData contains unsupported or invalid comparison fields';
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

  @IsObject()
  @IsOptional()
  @Validate(PlatformComparisonDataValidator)
  comparisonData?: PlatformComparisonData;
}
