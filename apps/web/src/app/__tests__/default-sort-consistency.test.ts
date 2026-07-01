/**
 * 验证所有页面的默认排序统一为 'popular'
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = join(__dirname, '..', '[locale]', '(shop)');

const FILES_EXPECT_POPULAR = [
  'products/ProductsPageClient.tsx',
  'products/components/mobile/MobileProductList.tsx',
  'products/components/mobile/MobileSortBar.tsx',
  'brands/[slug]/BrandPageClient.tsx',
  'brands/[slug]/components/mobile/MobileBrandDetail.tsx',
  'categories/[slug]/CategoryPageClient.tsx',
  'categories/[slug]/components/mobile/MobileCategoryDetail.tsx',
  'search/SearchPageClient.tsx',
  'search/components/mobile/MobileSearchPage.tsx',
  'search/components/mobile/MobileSearchSortBar.tsx',
];

const SEARCH_PAGE_FILE = join(PAGES_DIR, 'search/page.tsx');

describe('默认排序一致性', () => {
  FILES_EXPECT_POPULAR.forEach((relPath) => {
    it(`${relPath} 默认排序为 popular`, () => {
      const filePath = join(PAGES_DIR, relPath);
      const content = readFileSync(filePath, 'utf-8');

      if (relPath === 'search/SearchPageClient.tsx') {
        const pageContent = readFileSync(SEARCH_PAGE_FILE, 'utf-8');
        expect(pageContent).toMatch(
          /const sortBy = getSearchParamValue\(resolvedSearchParams\.sortBy\) \?\? 'popular';/,
        );
        expect(pageContent).toMatch(/initialSortBy=\{sortBy\}/);
        expect(content).toMatch(/const sortBy = initialSortBy;/);
        return;
      }

      // 匹配 sortBy') || 'xxx' 或 sortBy") || "xxx" 模式
      const matches = content.match(/sortBy['"]\)?\s*\|\|\s*['"](\w+)['"]/g);
      expect(matches).not.toBeNull();
      for (const match of matches!) {
        const value = match.match(/\|\|\s*['"](\w+)['"]/)?.[1];
        expect(value).toBe('popular');
      }
    });
  });
});
