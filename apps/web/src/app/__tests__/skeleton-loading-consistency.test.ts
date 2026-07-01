/**
 * 验证所有列表页的加载状态统一使用 SkeletonCard，而非 Spinner
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = join(__dirname, '..', '[locale]', '(shop)');

const FILES_EXPECT_SKELETON = [
  'products/ProductsPageClient.tsx',
  'brands/[slug]/BrandPageClient.tsx',
  'categories/[slug]/CategoryPageClient.tsx',
  'search/SearchPageClient.tsx',
];

describe('列表页加载状态使用 SkeletonCard', () => {
  FILES_EXPECT_SKELETON.forEach((relPath) => {
    it(`${relPath} 导入 SkeletonCard 而非 Spinner`, () => {
      const filePath = join(PAGES_DIR, relPath);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('SkeletonCard');
    });
  });
});
