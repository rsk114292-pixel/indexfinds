import { isScrollHideHeaderPath, computeHotThreshold } from './utils';

describe('isScrollHideHeaderPath', () => {
  it.each([
    // 首页（locale 根路径）
    ['/en', true],
    ['/zh', true],
    ['/en/', true],
    ['/zh/', true],
    ['/fr', true],
    // /products 列表页
    ['/products', true],
    ['/en/products', true],
    ['/zh/products', true],
    ['/en/products/', true],
  ])('should return true for %s', (path, expected) => {
    expect(isScrollHideHeaderPath(path)).toBe(expected);
  });

  it.each([
    // 品牌列表/详情
    ['/en/brands', false],
    ['/en/brands/nike', false],
    // 分类详情
    ['/en/categories/shoes', false],
    // 商品详情
    ['/en/products/some-slug', false],
    // 搜索页
    ['/en/search', false],
    // 账户页
    ['/en/account', false],
  ])('should return false for %s', (path, expected) => {
    expect(isScrollHideHeaderPath(path)).toBe(expected);
  });
});

describe('computeHotThreshold', () => {
  it('空数组返回 Infinity', () => {
    expect(computeHotThreshold([])).toBe(Infinity);
  });

  it('全为 0 时返回 Infinity', () => {
    expect(computeHotThreshold([0, 0, 0])).toBe(Infinity);
  });

  it('10 个分数取前 20% 分界值（第 2 名的分数）', () => {
    // 排序后: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]
    // floor(10 * 0.2) = index 2 → 80
    const scores = [50, 30, 100, 10, 70, 90, 40, 20, 80, 60];
    expect(computeHotThreshold(scores)).toBe(80);
  });

  it('5 个分数取前 20% 分界值（第 1 名的分数）', () => {
    // 排序后: [50, 40, 30, 20, 10]
    // floor(5 * 0.2) = index 1 → 40
    const scores = [10, 50, 30, 20, 40];
    expect(computeHotThreshold(scores)).toBe(40);
  });

  it('只有 1 个正分数时该分数即为阈值', () => {
    // floor(1 * 0.2) = index 0 → 42
    expect(computeHotThreshold([0, 0, 42, 0])).toBe(42);
  });

  it('忽略 0 分只看正分数', () => {
    // 正分数: [80, 60, 40, 20] → floor(4 * 0.2) = index 0 → 80
    expect(computeHotThreshold([0, 80, 0, 60, 40, 20, 0])).toBe(80);
  });
});
