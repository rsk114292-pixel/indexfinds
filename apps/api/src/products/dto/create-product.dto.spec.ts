import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  const validDto = {
    title: 'Test Product',
    primaryCategoryId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('应通过：最小有效数据', async () => {
    const dto = plainToInstance(CreateProductDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('应通过：priceMin <= priceMax', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validDto,
      priceMin: 50,
      priceMax: 100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('应失败：priceMax < priceMin', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validDto,
      priceMin: 100,
      priceMax: 50,
    });
    const errors = await validate(dto);
    const priceMaxErrors = errors.filter((e) => e.property === 'priceMax');
    expect(priceMaxErrors.length).toBeGreaterThan(0);
  });

  it('应失败：priceMin 超过上限', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validDto,
      priceMin: 1000000,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'priceMin');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('应失败：priceMin 为负数', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validDto,
      priceMin: -10,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'priceMin');
    expect(priceErrors.length).toBeGreaterThan(0);
  });
});
