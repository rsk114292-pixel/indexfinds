import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CategoriesService } from '../categories/categories.service';
import {
  loadCategorySeedData,
  rebuildCategoryClosureTable,
  upsertCategoryTree,
} from './category-seed-utils';

async function resetAndSeedCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoryRepo = app.get<Repository<Category>>(
    getRepositoryToken(Category),
  );
  const categoriesService = app.get(CategoriesService);

  console.log('🗑️  正在重建分类树...\n');

  try {
    await categoryRepo.query('TRUNCATE TABLE product_secondary_categories CASCADE');
    await categoryRepo.query('TRUNCATE TABLE category_closure CASCADE');
    await categoryRepo.query('TRUNCATE TABLE category CASCADE');

    const seedNodes = await loadCategorySeedData();
    const { created } = await upsertCategoryTree(categoryRepo, seedNodes);
    await rebuildCategoryClosureTable(categoryRepo);
    categoriesService.invalidateCache();

    console.log(`✅ 分类树重建完成，共写入 ${created} 个分类`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 重建分类树失败:', message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

resetAndSeedCategories().catch((error) => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});
