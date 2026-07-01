import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/entities/category.entity';

const SHUTDOWN_TIMEOUT_MS = Number(
  process.env.SCRIPT_SHUTDOWN_TIMEOUT_MS ?? 10_000,
);

async function closeApplicationContext(app: INestApplicationContext) {
  let shutdownTimer: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      app.close(),
      new Promise<never>((_, reject) => {
        shutdownTimer = setTimeout(() => {
          reject(
            new Error(
              `Nest application shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms`,
            ),
          );
        }, SHUTDOWN_TIMEOUT_MS);
        shutdownTimer.unref();
      }),
    ]);
  } finally {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
    }
  }
}

async function backfillCategoryCoverImages() {
  let app: INestApplicationContext | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const categoriesService = app.get(CategoriesService);
    const categoryRepo = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );

    console.log('🖼️  开始回填分类封面图...\n');

    const [activeCategories, stats] = await Promise.all([
      categoryRepo.find({
        where: {
          isActive: true,
        },
        order: {
          level: 'ASC',
          sortOrder: 'ASC',
          name: 'ASC',
        },
      }),
      categoriesService.getCategoryStats(),
    ]);

    let updated = 0;
    let skippedHasCover = 0;
    let skippedNoHero = 0;

    for (const category of activeCategories) {
      const normalizedCover = category.coverImage?.trim() || null;
      const heroImage = stats.get(category.id)?.heroImage?.trim() || null;

      if (normalizedCover) {
        skippedHasCover++;
        console.log(`⏭️  ${category.slug}: 已有 coverImage，跳过`);
        continue;
      }

      if (!heroImage) {
        skippedNoHero++;
        console.log(`⚠️  ${category.slug}: 无可用 heroImage，无法回填`);
        continue;
      }

      await categoryRepo.update(category.id, { coverImage: heroImage });
      updated++;
      console.log(`✅ ${category.slug}: 已回填 coverImage`);
    }

    categoriesService.invalidateCache();

    console.log('\n========== 回填完成 ==========');
    console.log(`更新: ${updated}`);
    console.log(`跳过(已有封面): ${skippedHasCover}`);
    console.log(`跳过(无可用图片): ${skippedNoHero}`);
    console.log(`总计: ${activeCategories.length}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 分类封面回填失败:', message);
    process.exitCode = 1;
  } finally {
    if (app) {
      try {
        await closeApplicationContext(app);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ 分类封面回填关闭资源失败:', message);
        process.exitCode = 1;
      }
    }
  }
}

backfillCategoryCoverImages()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
