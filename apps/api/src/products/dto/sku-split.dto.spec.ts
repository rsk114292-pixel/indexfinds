import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SkuSplitPreviewDto, SkuSplitExecuteDto } from './sku-split.dto';

const toPreviewDto = (data: Record<string, any>) =>
  plainToInstance(SkuSplitPreviewDto, data);

const toExecuteDto = (data: Record<string, any>) =>
  plainToInstance(SkuSplitExecuteDto, data);

describe('SkuSplitPreviewDto validation', () => {
  it('应通过：有效的微店链接', async () => {
    const dto = toPreviewDto({
      weidianUrl: 'https://weidian.com/item.html?itemID=123456',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('应通过：纯 itemId 字符串', async () => {
    const dto = toPreviewDto({ weidianUrl: '123456' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('应失败：weidianUrl 为空', async () => {
    const dto = toPreviewDto({});
    const errors = await validate(dto);
    const urlErrors = errors.filter((e) => e.property === 'weidianUrl');
    expect(urlErrors.length).toBeGreaterThan(0);
  });

  it('应失败：weidianUrl 为空字符串', async () => {
    const dto = toPreviewDto({ weidianUrl: '' });
    const errors = await validate(dto);
    const urlErrors = errors.filter((e) => e.property === 'weidianUrl');
    expect(urlErrors.length).toBeGreaterThan(0);
  });
});

describe('SkuSplitExecuteDto validation', () => {
  it('应通过：最小有效数据', async () => {
    const dto = toExecuteDto({ weidianItemId: '123456' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('应通过：包含所有可选字段', async () => {
    const dto = toExecuteDto({
      weidianItemId: '123456',
      shopId: 'shop-001',
      selectedAttrIds: [9602911215, 9602911216],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('应失败：weidianItemId 为空', async () => {
    const dto = toExecuteDto({});
    const errors = await validate(dto);
    const idErrors = errors.filter((e) => e.property === 'weidianItemId');
    expect(idErrors.length).toBeGreaterThan(0);
  });

  it('应通过：selectedAttrIds 为空数组', async () => {
    const dto = toExecuteDto({
      weidianItemId: '123456',
      selectedAttrIds: [],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('应失败：selectedAttrIds 包含非数字', async () => {
    const dto = toExecuteDto({
      weidianItemId: '123456',
      selectedAttrIds: ['abc'],
    });
    const errors = await validate(dto);
    const attrErrors = errors.filter((e) => e.property === 'selectedAttrIds');
    expect(attrErrors.length).toBeGreaterThan(0);
  });
});
