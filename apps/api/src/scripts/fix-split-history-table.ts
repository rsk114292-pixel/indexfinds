import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

/**
 * 检查并修复 product_split_history 表结构
 */
async function fixSplitHistoryTable() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 检查 product_split_history 表结构...\n');

  // 1. 检查表是否存在
  const tableExists = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'product_split_history'
    );
  `);

  if (!tableExists[0].exists) {
    console.log('⚠️ 表不存在，正在创建...\n');

    // 创建表
    await dataSource.query(`
      CREATE TABLE product_split_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sourceProductId" UUID NOT NULL,
        "sourceWeidianItemId" VARCHAR(64) NOT NULL,
        "sourceUrl" TEXT NOT NULL,
        "resultProductIds" UUID[] NOT NULL,
        "aiAnalysisData" JSONB NOT NULL,
        "splitStrategy" VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "rolledBackAt" TIMESTAMP,
        "rolledBackReason" TEXT,
        "operatorId" UUID
      );

      CREATE INDEX idx_split_history_source_product ON product_split_history("sourceProductId");
      CREATE INDEX idx_split_history_weidian_item ON product_split_history("sourceWeidianItemId");
      CREATE INDEX idx_split_history_status ON product_split_history(status);
      CREATE INDEX idx_split_history_created ON product_split_history("createdAt");
    `);

    console.log('✅ 表创建成功！\n');
  } else {
    console.log('✅ 表已存在\n');

    // 2. 检查列结构
    const columns = await dataSource.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'product_split_history'
      ORDER BY ordinal_position;
    `);

    console.log('📋 当前列结构:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 检查是否缺少必要的列
    const columnNames = columns.map((c: any) => c.column_name);
    const requiredColumns = [
      'id',
      'sourceProductId',
      'sourceWeidianItemId',
      'sourceUrl',
      'resultProductIds',
      'aiAnalysisData',
      'splitStrategy',
      'status',
      'createdAt',
      'rolledBackAt',
      'rolledBackReason',
      'operatorId',
    ];

    const missingColumns = requiredColumns.filter(
      (col) => !columnNames.includes(col),
    );

    if (missingColumns.length > 0) {
      console.log(`\n⚠️ 缺少列: ${missingColumns.join(', ')}`);
      console.log('正在添加缺失的列...\n');

      for (const col of missingColumns) {
        try {
          let alterSql = '';
          switch (col) {
            case 'sourceProductId':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "sourceProductId" UUID`;
              break;
            case 'sourceWeidianItemId':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "sourceWeidianItemId" VARCHAR(64)`;
              break;
            case 'sourceUrl':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "sourceUrl" TEXT`;
              break;
            case 'resultProductIds':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "resultProductIds" UUID[]`;
              break;
            case 'aiAnalysisData':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "aiAnalysisData" JSONB`;
              break;
            case 'splitStrategy':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "splitStrategy" VARCHAR(20)`;
              break;
            case 'status':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN status VARCHAR(20) DEFAULT 'active'`;
              break;
            case 'createdAt':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "createdAt" TIMESTAMP DEFAULT NOW()`;
              break;
            case 'rolledBackAt':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "rolledBackAt" TIMESTAMP`;
              break;
            case 'rolledBackReason':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "rolledBackReason" TEXT`;
              break;
            case 'operatorId':
              alterSql = `ALTER TABLE product_split_history ADD COLUMN "operatorId" UUID`;
              break;
          }

          if (alterSql) {
            await dataSource.query(alterSql);
            console.log(`  ✅ 添加列: ${col}`);
          }
        } catch (error) {
          console.error(`  ❌ 添加列 ${col} 失败:`, error.message);
        }
      }
    } else {
      console.log('\n✅ 所有必要列都存在');
    }
  }

  // 3. 检查数据
  console.log('\n📊 表数据统计:');
  const stats = await dataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'rolled_back' THEN 1 END) as rolled_back
    FROM product_split_history
  `);

  console.log(`  总记录数: ${stats[0].total}`);
  console.log(`  活跃记录: ${stats[0].active}`);
  console.log(`  已回滚: ${stats[0].rolled_back}`);

  console.log('\n✅ 检查完成！');
  await app.close();
}

fixSplitHistoryTable().catch(console.error);
