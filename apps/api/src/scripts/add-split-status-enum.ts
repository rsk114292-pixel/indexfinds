import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function addSplitStatusEnum() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // 检查当前枚举值
    const currentEnums = await dataSource.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'products_status_enum'::regtype
      ORDER BY enumsortorder
    `);
    console.log(
      '当前枚举值:',
      currentEnums.map((e: any) => e.enumlabel),
    );

    // 检查是否已存在 'split'
    const hasSplit = currentEnums.some((e: any) => e.enumlabel === 'split');

    if (hasSplit) {
      console.log('\n✅ "split" 枚举值已存在，无需添加');
    } else {
      // 添加 'split' 枚举值
      await dataSource.query(`
        ALTER TYPE products_status_enum ADD VALUE 'split'
      `);
      console.log('\n✅ 成功添加 "split" 枚举值到 products_status_enum');

      // 验证添加结果
      const updatedEnums = await dataSource.query(`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = 'products_status_enum'::regtype
        ORDER BY enumsortorder
      `);
      console.log(
        '更新后枚举值:',
        updatedEnums.map((e: any) => e.enumlabel),
      );
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 添加枚举值失败:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

addSplitStatusEnum();
