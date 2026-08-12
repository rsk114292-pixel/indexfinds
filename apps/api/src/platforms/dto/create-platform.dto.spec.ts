import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePlatformDto } from './create-platform.dto';

describe('CreatePlatformDto', () => {
  const baseDto = {
    key: 'loongbuy',
    name: 'Loongbuy',
    baseUrl: 'https://www.loongbuy.com/product-details',
  };

  it('passes with valid translations locales', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      translations: {
        en: {
          name: 'Loongbuy',
          description: 'Loongbuy proxy purchase platform',
        },
        fr: { description: "Plateforme d'achat assisté Loongbuy" },
      },
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when translations contains unsupported locale', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      translations: {
        en: { description: 'Loongbuy proxy purchase platform' },
        ja: { description: 'ロングバイ購入代行プラットフォーム' },
      },
    });
    const errors = await validate(dto);
    const translationErrors = errors.filter(
      (e) => e.property === 'translations',
    );
    expect(translationErrors.length).toBeGreaterThan(0);
  });

  it('fails when translation field is not a string', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      translations: {
        en: { description: 123 },
      },
    });
    const errors = await validate(dto);
    const translationErrors = errors.filter(
      (e) => e.property === 'translations',
    );
    expect(translationErrors.length).toBeGreaterThan(0);
  });

  it('fails when translation object has unsupported keys', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      translations: {
        en: { title: 'Loongbuy' },
      },
    });
    const errors = await validate(dto);
    const translationErrors = errors.filter(
      (e) => e.property === 'translations',
    );
    expect(translationErrors.length).toBeGreaterThan(0);
  });

  it('passes with valid agent comparison data', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      comparisonData: {
        serviceFee: 'Confirm the latest fee on the official site',
        freeStorageDays: 90,
        shippingBaseFeeUsd: 8,
        shippingRatePerKgUsd: 12.5,
        dataUpdatedAt: '2026-08-11',
      },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported agent comparison fields', async () => {
    const dto = plainToInstance(CreatePlatformDto, {
      ...baseDto,
      comparisonData: {
        ranking: 1,
      },
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'comparisonData')).toBe(
      true,
    );
  });
});
