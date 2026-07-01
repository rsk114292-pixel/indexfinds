import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function resetCategories() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🗑️  清空现有分类数据...\n');

  try {
    // 删除所有分类数据（按顺序删除外键关联表）
    await dataSource.query('TRUNCATE TABLE category_closure CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE product_secondary_categories CASCADE',
    );
    await dataSource.query('TRUNCATE TABLE category CASCADE');

    console.log('✅ 分类数据已清空\n');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 清空失败:', message);
  } finally {
    await app.close();
  }
}

resetCategories()
  .then(() => {
    console.log('🎉 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
