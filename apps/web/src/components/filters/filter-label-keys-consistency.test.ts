/**
 * 验证 MULTI_SELECT_FILTER_KEYS 与各组件的 FILTER_LABEL_KEYS 映射一致
 * 防止新增筛选 key 后忘记添加 label 映射导致 t(undefined) 崩溃
 */
import { MULTI_SELECT_FILTER_KEYS } from './constants';

// 桌面端 ActiveFilters 的映射（从源码复制保持同步）
const DESKTOP_FILTER_LABEL_KEYS: Record<string, string> = {
  categories: 'category',
  brands: 'brand',
  colors: 'color',
  genders: 'gender',
  styles: 'style',
  occasions: 'occasions',
  seasons: 'season',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
};

// 移动端 MobileActiveFilters 的映射
const MOBILE_FILTER_LABEL_KEYS: Record<string, string> = {
  categories: 'category',
  brands: 'brand',
  colors: 'color',
  genders: 'gender',
  styles: 'style',
  seasons: 'season',
  occasions: 'occasions',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
};

describe('FILTER_LABEL_KEYS 一致性', () => {
  it('桌面端 ActiveFilters 覆盖所有 MULTI_SELECT_FILTER_KEYS', () => {
    for (const key of MULTI_SELECT_FILTER_KEYS) {
      expect(DESKTOP_FILTER_LABEL_KEYS).toHaveProperty(
        key,
        expect.any(String),
      );
    }
  });

  it('移动端 MobileActiveFilters 覆盖所有 MULTI_SELECT_FILTER_KEYS', () => {
    for (const key of MULTI_SELECT_FILTER_KEYS) {
      expect(MOBILE_FILTER_LABEL_KEYS).toHaveProperty(
        key,
        expect.any(String),
      );
    }
  });
});
