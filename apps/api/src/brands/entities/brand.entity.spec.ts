import { getMetadataArgsStorage } from 'typeorm';
import { Brand } from './brand.entity';

describe('Brand entity', () => {
  it('status 列应该有 @Index 装饰器', () => {
    // 触发装饰器注册
    new Brand();

    const indices = getMetadataArgsStorage().indices.filter(
      (index) => index.target === Brand,
    );

    // @Index() 在属性上使用时，列名存储在 columns 数组中
    const statusIndex = indices.find(
      (index) =>
        Array.isArray(index.columns) && index.columns.includes('status'),
    );

    expect(statusIndex).toBeDefined();
  });
});
