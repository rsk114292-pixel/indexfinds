/**
 * 混合商品功能迁移脚本 (v2.1)
 *
 * 添加内容：
 * 1. products 表新增混合商品相关字段
 * 2. 创建 product_split_history 表
 *
 * 使用方法:
 * npx ts-node -r tsconfig-paths/register src/scripts/migrate-mixed-product-fields.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('Database connected');

  try {
    // ========== 1. 检查并添加 products 表字段 ==========
    console.log('\n=== Adding mixed product fields to products table ===\n');

    // 检查 mixednessScore 字段是否存在
    const mixednessScoreExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'mixednessScore'
      );
    `);

    if (mixednessScoreExists[0].exists) {
      console.log('Mixed product fields already exist, skipping...');
    } else {
      console.log('Adding mixedness evaluation fields...');

      // 混合度评估字段
      await dataSource.query(`
        ALTER TABLE "products"
        ADD COLUMN "mixednessScore" DECIMAL(3, 2),
        ADD COLUMN "mixednessEvaluated" BOOLEAN DEFAULT FALSE,
        ADD COLUMN "potentialMixedProduct" BOOLEAN DEFAULT FALSE
      `);

      console.log('Adding split support fields...');

      // 拆分支持字段
      await dataSource.query(`
        ALTER TABLE "products"
        ADD COLUMN "productGroupId" UUID,
        ADD COLUMN "isFromSplit" BOOLEAN DEFAULT FALSE,
        ADD COLUMN "splitSourceUrl" TEXT,
        ADD COLUMN "splitMetadata" JSONB
      `);

      console.log('Adding variant support fields...');

      // 变体支持字段
      await dataSource.query(`
        ALTER TABLE "products"
        ADD COLUMN "parentProductId" UUID,
        ADD COLUMN "hasVariants" BOOLEAN DEFAULT FALSE,
        ADD COLUMN "variantAttributes" JSONB
      `);

      console.log('Creating indexes...');

      // 创建索引
      await dataSource.query(`
        CREATE INDEX "IDX_products_potentialMixedProduct"
        ON "products" ("potentialMixedProduct")
        WHERE "potentialMixedProduct" = TRUE
      `);

      await dataSource.query(`
        CREATE INDEX "IDX_products_productGroupId"
        ON "products" ("productGroupId")
        WHERE "productGroupId" IS NOT NULL
      `);

      await dataSource.query(`
        CREATE INDEX "IDX_products_parentProductId"
        ON "products" ("parentProductId")
        WHERE "parentProductId" IS NOT NULL
      `);

      console.log('Products table fields added successfully!');
    }

    // ========== 2. 创建 product_split_history 表 ==========
    console.log('\n=== Creating product_split_history table ===\n');

    const splitHistoryExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'product_split_history'
      );
    `);

    if (splitHistoryExists[0].exists) {
      console.log('product_split_history table already exists, skipping...');
    } else {
      console.log('Creating product_split_history table...');

      await dataSource.query(`
        CREATE TABLE "product_split_history" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "sourceWeidianItemId" VARCHAR(64) NOT NULL,
          "sourceUrl" TEXT NOT NULL,
          "resultProductIds" UUID[] NOT NULL,
          "aiAnalysisData" JSONB NOT NULL,
          "splitStrategy" VARCHAR(20) NOT NULL,
          "status" VARCHAR(20) DEFAULT 'active',
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "rolledBackAt" TIMESTAMP,
          "rolledBackReason" TEXT,
          "operatorId" UUID,
          CONSTRAINT "PK_product_split_history" PRIMARY KEY ("id")
        )
      `);

      console.log('Creating indexes for product_split_history...');

      await dataSource.query(`
        CREATE INDEX "IDX_product_split_history_weidianItemId"
        ON "product_split_history" ("sourceWeidianItemId")
      `);

      await dataSource.query(`
        CREATE INDEX "IDX_product_split_history_status"
        ON "product_split_history" ("status")
      `);

      await dataSource.query(`
        CREATE INDEX "IDX_product_split_history_createdAt"
        ON "product_split_history" ("createdAt")
      `);

      console.log('product_split_history table created successfully!');
    }

    console.log('\n=== Migration completed successfully! ===\n');

    // 显示统计信息
    const productCount = await dataSource.query(
      `SELECT COUNT(*) FROM "products"`,
    );
    console.log(`Total products in database: ${productCount[0].count}`);

    const potentialMixedCount = await dataSource.query(`
      SELECT COUNT(*) FROM "products" WHERE "potentialMixedProduct" = TRUE
    `);
    console.log(
      `Products marked as potential mixed: ${potentialMixedCount[0].count}`,
    );
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runMigration().catch(console.error);
