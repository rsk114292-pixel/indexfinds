import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSkuDto } from './create-sku.dto';

describe('CreateSkuDto', () => {
  const validDto = {
    productId: '550e8400-e29b-41d4-a716-446655440000',
    attributes: { 颜色: '黑色' },
    price: 99.9,
  };

  it('应通过：有效 SKU 数据', async () => {
    const dto = plainToInstance(CreateSkuDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('应失败：price = 0', async () => {
    const dto = plainToInstance(CreateSkuDto, {
      ...validDto,
      price: 0,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('应失败：price 为负数', async () => {
    const dto = plainToInstance(CreateSkuDto, {
      ...validDto,
      price: -10,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors.length).toBeGreaterThan(0);
  });

  it('应失败：price 超过上限', async () => {
    const dto = plainToInstance(CreateSkuDto, {
      ...validDto,
      price: 1000000,
    });
    const errors = await validate(dto);
    const priceErrors = errors.filter((e) => e.property === 'price');
    expect(priceErrors.length).toBeGreaterThan(0);
  });
});
