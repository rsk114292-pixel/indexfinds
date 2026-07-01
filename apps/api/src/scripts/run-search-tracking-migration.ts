/**
 * 运行搜索追踪表迁移
 * 使用方法: node scripts/migrations/run-search-tracking-migration.js
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
    // 检查表是否已存在
    const impressionsExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'search_impressions'
      );
    `);

    if (impressionsExists[0].exists) {
      console.log('Tables already exist, skipping migration');
      await dataSource.destroy();
      return;
    }

    console.log('Creating search_impressions table...');
    await dataSource.query(`
      CREATE TABLE "search_impressions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "searchLogId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "position" integer NOT NULL,
        "page" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_impressions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_search_impressions_searchLog" FOREIGN KEY ("searchLogId")
          REFERENCES "search_logs"("id") ON DELETE CASCADE
      )
    `);

    console.log('Creating indexes for search_impressions...');
    await dataSource.query(
      `CREATE INDEX "IDX_search_impressions_searchLogId" ON "search_impressions" ("searchLogId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_impressions_productId" ON "search_impressions" ("productId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_impressions_searchLogId_productId" ON "search_impressions" ("searchLogId", "productId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_impressions_productId_createdAt" ON "search_impressions" ("productId", "createdAt")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_impressions_createdAt" ON "search_impressions" ("createdAt")`,
    );

    console.log('Creating search_clicks table...');
    await dataSource.query(`
      CREATE TABLE "search_clicks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "searchLogId" uuid NOT NULL,
        "query" varchar(255) NOT NULL,
        "productId" uuid NOT NULL,
        "position" integer NOT NULL,
        "page" integer NOT NULL DEFAULT 1,
        "userId" uuid,
        "sessionId" varchar(255),
        "converted" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_clicks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_search_clicks_searchLog" FOREIGN KEY ("searchLogId")
          REFERENCES "search_logs"("id") ON DELETE CASCADE
      )
    `);

    console.log('Creating indexes for search_clicks...');
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_searchLogId" ON "search_clicks" ("searchLogId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_productId" ON "search_clicks" ("productId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_query" ON "search_clicks" ("query")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_searchLogId_productId" ON "search_clicks" ("searchLogId", "productId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_productId_createdAt" ON "search_clicks" ("productId", "createdAt")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_query_productId" ON "search_clicks" ("query", "productId")`,
    );
    await dataSource.query(
      `CREATE INDEX "IDX_search_clicks_createdAt" ON "search_clicks" ("createdAt")`,
    );

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runMigration().catch(console.error);
