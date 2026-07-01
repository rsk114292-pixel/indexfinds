import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoriesService } from '../categories/categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import {
  collectSeedSlugs,
  loadCategorySeedData,
  rebuildCategoryClosureTable,
  upsertCategoryTree,
} from './category-seed-utils';

async function seedCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoriesService = app.get(CategoriesService);
  const categoryRepo = app.get<Repository<Category>>(
    getRepositoryToken(Category),
  );

  console.log('🌱 开始同步分类数据...\n');

  try {
    const seedNodes = await loadCategorySeedData();
    const existingCategories = await categoryRepo.find({
      select: ['slug'],
      order: { level: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
    const existingSlugs = new Set(existingCategories.map((category) => category.slug));

    const { created, updated } = await upsertCategoryTree(categoryRepo, seedNodes);
    await rebuildCategoryClosureTable(categoryRepo);
    categoriesService.invalidateCache();

    const seedSlugs = new Set(collectSeedSlugs(seedNodes));
    const legacySlugs = [...existingSlugs].filter((slug) => !seedSlugs.has(slug));

    console.log(`✅ 分类同步完成：新增 ${created}，更新 ${updated}`);
    console.log(`📦 种子分类总数：${seedSlugs.size}`);

    if (legacySlugs.length > 0) {
      console.log('\n⚠️  检测到数据库中仍存在未纳入 categories.json 的旧分类：');
      for (const slug of legacySlugs) {
        console.log(`  - ${slug}`);
      }
      console.log('   如需完全重建分类树，请运行 reset-and-seed-categories 脚本。');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 分类同步失败:', message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seedCategories().catch((error) => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});
