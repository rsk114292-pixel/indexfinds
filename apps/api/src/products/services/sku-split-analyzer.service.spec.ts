import {
  SINGLE_VARIANT_ATTR_ID,
  SINGLE_VARIANT_VALUE,
  SkuSplitAnalyzerService,
} from './sku-split-analyzer.service';
import type { WeidianNormalizedData } from '../../weidian/interfaces/thor-api.interface';

describe('SkuSplitAnalyzerService', () => {
  let service: SkuSplitAnalyzerService;

  beforeEach(() => {
    service = new SkuSplitAnalyzerService();
  });

  const buildNormalizedData = (
    overrides?: Partial<WeidianNormalizedData>,
  ): WeidianNormalizedData => ({
    itemId: '12345',
    title: '测试商品',
    mainImage: 'https://img.com/main-default.jpg',
    images: [],
    detailImages: [],
    attributes: [
      {
        name: '颜色',
        values: [
          { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
          { id: 101, value: '白色', image: 'https://img.com/white.jpg' },
          { id: 102, value: '红色', image: 'https://img.com/red.jpg' },
        ],
      },
      {
        name: '尺码',
        values: [
          { id: 200, value: 'S' },
          { id: 201, value: 'M' },
          { id: 202, value: 'L' },
        ],
      },
    ],
    skus: [
      // 黑色 × 3 尺码
      {
        attrIds: [100, 200],
        attributes: { 颜色: '黑色', 尺码: 'S' },
        skuKey: '尺码=S;颜色=黑色',
        price: 99,
        stock: 10,
        weidianSkuId: 'sku1',
      },
      {
        attrIds: [100, 201],
        attributes: { 颜色: '黑色', 尺码: 'M' },
        skuKey: '尺码=M;颜色=黑色',
        price: 99,
        stock: 5,
        weidianSkuId: 'sku2',
      },
      {
        attrIds: [100, 202],
        attributes: { 颜色: '黑色', 尺码: 'L' },
        skuKey: '尺码=L;颜色=黑色',
        price: 109,
        stock: 3,
        weidianSkuId: 'sku3',
      },
      // 白色 × 3 尺码
      {
        attrIds: [101, 200],
        attributes: { 颜色: '白色', 尺码: 'S' },
        skuKey: '尺码=S;颜色=白色',
        price: 89,
        stock: 8,
        weidianSkuId: 'sku4',
      },
      {
        attrIds: [101, 201],
        attributes: { 颜色: '白色', 尺码: 'M' },
        skuKey: '尺码=M;颜色=白色',
        price: 89,
        stock: 6,
        weidianSkuId: 'sku5',
      },
      {
        attrIds: [101, 202],
        attributes: { 颜色: '白色', 尺码: 'L' },
        skuKey: '尺码=L;颜色=白色',
        price: 89,
        stock: 2,
        weidianSkuId: 'sku6',
      },
      // 红色 × 3 尺码
      {
        attrIds: [102, 200],
        attributes: { 颜色: '红色', 尺码: 'S' },
        skuKey: '尺码=S;颜色=红色',
        price: 119,
        stock: 4,
        weidianSkuId: 'sku7',
      },
      {
        attrIds: [102, 201],
        attributes: { 颜色: '红色', 尺码: 'M' },
        skuKey: '尺码=M;颜色=红色',
        price: 119,
        stock: 7,
        weidianSkuId: 'sku8',
      },
      {
        attrIds: [102, 202],
        attributes: { 颜色: '红色', 尺码: 'L' },
        skuKey: '尺码=L;颜色=红色',
        price: 129,
        stock: 1,
        weidianSkuId: 'sku9',
      },
    ],
    ...overrides,
  });

  describe('analyzeSplitPlan', () => {
    it('检测到 3 个颜色变体', () => {
      const data = buildNormalizedData();
      const plan = service.analyzeSplitPlan(data);

      expect(plan).not.toBeNull();
      expect(plan!.splitDimension).toBe('颜色');
      expect(plan!.variants).toHaveLength(3);
      expect(plan!.weidianItemId).toBe('12345');
    });

    it('每个变体包含正确的图片和价格', () => {
      const data = buildNormalizedData();
      const plan = service.analyzeSplitPlan(data)!;

      const black = plan.variants.find((v) => v.value === '黑色')!;
      expect(black.imageUrl).toBe('https://img.com/black.jpg');
      expect(black.price).toBe(99); // 最低价（99, 99, 109 中的最低）
      expect(black.skuCount).toBe(3);
      expect(black.sizes).toEqual(['S', 'M', 'L']);
    });

    it('红色变体取最低价 119', () => {
      const data = buildNormalizedData();
      const plan = service.analyzeSplitPlan(data)!;

      const red = plan.variants.find((v) => v.value === '红色')!;
      expect(red.price).toBe(119); // 119, 119, 129 中的最低
    });

    it('过滤仍有属性图但已没有可购买 SKU 的款式', () => {
      const data = buildNormalizedData();
      data.skus = data.skus.filter((sku) => !sku.attrIds.includes(102));

      const plan = service.analyzeSplitPlan(data);

      expect(plan).not.toBeNull();
      expect(plan!.variants.map((variant) => variant.value)).toEqual([
        '黑色',
        '白色',
      ]);
      expect(plan!.variants.every((variant) => variant.price > 0)).toBe(true);
      expect(plan!.variants.every((variant) => variant.skuCount > 0)).toBe(
        true,
      );
    });

    it('所有款式都没有有效价格或可购买 SKU 时返回 null', () => {
      const data = buildNormalizedData({ skus: [] });

      expect(service.analyzeSplitPlan(data)).toBeNull();
    });

    it('多颜色无属性图时按颜色维度拆分并用主图兜底', () => {
      const data = buildNormalizedData({
        mainImage: 'https://img.com/main.jpg',
        attributes: [
          {
            name: '颜色',
            values: [
              { id: 100, value: '黑色' },
              { id: 101, value: '白色' },
            ],
          },
          {
            name: '尺码',
            values: [
              { id: 200, value: 'S' },
              { id: 201, value: 'M' },
            ],
          },
        ],
        skus: [
          {
            attrIds: [100, 200],
            attributes: { 颜色: '黑色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=黑色',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
          {
            attrIds: [100, 201],
            attributes: { 颜色: '黑色', 尺码: 'M' },
            skuKey: '尺码=M;颜色=黑色',
            price: 99,
            stock: 5,
            weidianSkuId: 'sku2',
          },
          {
            attrIds: [101, 200],
            attributes: { 颜色: '白色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=白色',
            price: 89,
            stock: 8,
            weidianSkuId: 'sku3',
          },
          {
            attrIds: [101, 201],
            attributes: { 颜色: '白色', 尺码: 'M' },
            skuKey: '尺码=M;颜色=白色',
            price: 89,
            stock: 6,
            weidianSkuId: 'sku4',
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);

      expect(plan).not.toBeNull();
      expect(plan!.splitDimension).toBe('颜色');
      expect(plan!.variants).toHaveLength(2);
      expect(plan!.variants[0]).toMatchObject({
        attrId: 100,
        value: '黑色',
        imageUrl: 'https://img.com/main.jpg',
        imageSource: 'main_fallback',
        imageConfidence: 'low',
        skuCount: 2,
        sizes: ['S', 'M'],
      });
      expect(plan!.variants[1]).toMatchObject({
        attrId: 101,
        value: '白色',
        imageUrl: 'https://img.com/main.jpg',
        imageSource: 'main_fallback',
        imageConfidence: 'low',
        skuCount: 2,
        sizes: ['S', 'M'],
      });
    });

    it('只有尺码维度时生成单款式变体并保留全部尺码', () => {
      const data = buildNormalizedData({
        attributes: [
          {
            name: '尺码',
            values: [
              { id: 200, value: 'S' },
              { id: 201, value: 'M' },
            ],
          },
        ],
        skus: [
          {
            attrIds: [200],
            attributes: { 尺码: 'S' },
            skuKey: '尺码=S',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
          {
            attrIds: [201],
            attributes: { 尺码: 'M' },
            skuKey: '尺码=M',
            price: 109,
            stock: 6,
            weidianSkuId: 'sku2',
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);
      expect(plan).not.toBeNull();
      expect(plan!.splitDimension).toBe(SINGLE_VARIANT_VALUE);
      expect(plan!.variants).toHaveLength(1);
      expect(plan!.variants[0]).toMatchObject({
        attrId: SINGLE_VARIANT_ATTR_ID,
        value: SINGLE_VARIANT_VALUE,
        imageUrl: 'https://img.com/main-default.jpg',
        price: 99,
        skuCount: 2,
        sizes: ['S', 'M'],
      });
    });

    it('无属性图且没有任何可用商品图时返回 null', () => {
      const data = buildNormalizedData({
        mainImage: undefined,
        images: [],
        detailImages: [],
        attributes: [
          {
            name: '颜色',
            values: [
              { id: 100, value: '黑色' },
              { id: 101, value: '白色' },
            ],
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);
      expect(plan).toBeNull();
    });

    it('单变体也允许拆分', () => {
      const data = buildNormalizedData({
        attributes: [
          {
            name: '颜色',
            values: [
              { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
            ],
          },
        ],
        skus: [
          {
            attrIds: [100, 200],
            attributes: { 颜色: '黑色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=黑色',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);
      expect(plan).not.toBeNull();
      expect(plan!.variants).toHaveLength(1);
      expect(plan!.variants[0].value).toBe('黑色');
    });

    it('无图片变体回退到主图', () => {
      const data = buildNormalizedData({
        mainImage: 'https://img.com/main.jpg',
        attributes: [
          {
            name: '颜色',
            values: [
              { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
              { id: 101, value: '白色' }, // 无图片
            ],
          },
        ],
        skus: [
          {
            attrIds: [100, 200],
            attributes: { 颜色: '黑色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=黑色',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
          {
            attrIds: [101, 200],
            attributes: { 颜色: '白色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=白色',
            price: 89,
            stock: 8,
            weidianSkuId: 'sku2',
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);
      expect(plan).not.toBeNull();
      expect(plan!.variants).toHaveLength(2);
      expect(plan!.variants[0].imageUrl).toBe('https://img.com/black.jpg');
      expect(plan!.variants[1].imageUrl).toBe('https://img.com/main.jpg'); // 回退到主图
    });

    it('不用详情图做回退，用 images[0]', () => {
      const data = buildNormalizedData({
        mainImage: undefined,
        images: ['https://img.com/cover.jpg'],
        detailImages: ['https://img.com/detail1.jpg'],
        attributes: [
          {
            name: '颜色',
            values: [
              { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
              { id: 101, value: '白色' },
            ],
          },
        ],
        skus: [
          {
            attrIds: [100, 200],
            attributes: { 颜色: '黑色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=黑色',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
          {
            attrIds: [101, 200],
            attributes: { 颜色: '白色', 尺码: 'S' },
            skuKey: '尺码=S;颜色=白色',
            price: 89,
            stock: 8,
            weidianSkuId: 'sku2',
          },
        ],
      });

      const plan = service.analyzeSplitPlan(data);
      expect(plan!.variants[1].imageUrl).toBe('https://img.com/cover.jpg');
      // 不应该用 detailImages
      expect(plan!.variants[1].imageUrl).not.toBe(
        'https://img.com/detail1.jpg',
      );
    });

    it('空 attributes 返回 null', () => {
      const data = buildNormalizedData({ attributes: [] });
      const plan = service.analyzeSplitPlan(data);
      expect(plan).toBeNull();
    });
  });

  describe('extractVariantSizeSkus', () => {
    it('黑色变体提取 3 个尺码 SKU', () => {
      const data = buildNormalizedData();
      const skus = service.extractVariantSizeSkus(data, 100, '颜色', 99);

      expect(skus).toHaveLength(3);
      expect(skus[0].attributes).toEqual({ 尺码: 'S' });
      expect(skus[0].price).toBe(99); // 统一用变体价格
      expect(skus[0].stock).toBe(0); // 不追踪库存
    });

    it('尺码 SKU 的 skuKey 不包含颜色维度', () => {
      const data = buildNormalizedData();
      const skus = service.extractVariantSizeSkus(data, 100, '颜色', 99);

      expect(skus[0].skuKey).toBe('尺码=S');
      expect(skus[1].skuKey).toBe('尺码=M');
    });

    it('不存在的 attrId 返回空数组', () => {
      const data = buildNormalizedData();
      const skus = service.extractVariantSizeSkus(data, 999, '颜色', 0);
      expect(skus).toHaveLength(0);
    });

    it('单款式变体提取全部 SKU，保留尺码属性', () => {
      const data = buildNormalizedData({
        attributes: [
          {
            name: '尺码',
            values: [
              { id: 200, value: 'S' },
              { id: 201, value: 'M' },
            ],
          },
        ],
        skus: [
          {
            attrIds: [200],
            attributes: { 尺码: 'S' },
            skuKey: '尺码=S',
            price: 99,
            stock: 10,
            weidianSkuId: 'sku1',
          },
          {
            attrIds: [201],
            attributes: { 尺码: 'M' },
            skuKey: '尺码=M',
            price: 109,
            stock: 6,
            weidianSkuId: 'sku2',
          },
        ],
      });

      const skus = service.extractVariantSizeSkus(
        data,
        SINGLE_VARIANT_ATTR_ID,
        SINGLE_VARIANT_VALUE,
        99,
      );

      expect(skus).toHaveLength(2);
      expect(skus[0].attributes).toEqual({ 尺码: 'S' });
      expect(skus[0].skuKey).toBe('尺码=S');
      expect(skus[1].attributes).toEqual({ 尺码: 'M' });
      expect(skus[1].skuKey).toBe('尺码=M');
    });
  });
});
