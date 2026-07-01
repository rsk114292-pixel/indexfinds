import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoriesService } from '../categories/categories.service';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function addCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoriesService = app.get(CategoriesService);
  const categoryRepo = app.get<Repository<Category>>(
    getRepositoryToken(Category),
  );

  try {
    // 找到 Clothing 的 ID
    const clothing = await categoryRepo.findOne({
      where: { slug: 'clothing' },
    });
    if (!clothing) {
      console.error('❌ 找不到 Clothing 分类');
      return;
    }

    // 添加 Socks
    const existingSocks = await categoryRepo.findOne({
      where: { slug: 'socks' },
    });
    if (!existingSocks) {
      await categoriesService.create({
        name: 'Socks',
        slug: 'socks',
        parentId: clothing.id,
        translations: {
          en: { name: 'Socks' },
          zh: { name: '袜子' },
        },
      });
      console.log('✅ 创建分类: Socks');
    } else {
      console.log('⏭️  Socks 已存在，跳过');
    }

    // 添加 Jerseys
    const existingJerseys = await categoryRepo.findOne({
      where: { slug: 'jerseys' },
    });
    if (!existingJerseys) {
      await categoriesService.create({
        name: 'Jerseys',
        slug: 'jerseys',
        parentId: clothing.id,
        translations: {
          en: { name: 'Jerseys' },
          zh: { name: '球衣' },
        },
      });
      console.log('✅ 创建分类: Jerseys');
    } else {
      console.log('⏭️  Jerseys 已存在，跳过');
    }

    console.log('\n🎉 完成！');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 失败:', message);
  } finally {
    await app.close();
  }
}

addCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
