import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSearchTrackingTables1706540000000 implements MigrationInterface {
  name = 'CreateSearchTrackingTables1706540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建搜索曝光表
    await queryRunner.query(`
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

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX "IDX_search_impressions_searchLogId" ON "search_impressions" ("searchLogId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_impressions_productId" ON "search_impressions" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_impressions_searchLogId_productId" ON "search_impressions" ("searchLogId", "productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_impressions_productId_createdAt" ON "search_impressions" ("productId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_impressions_createdAt" ON "search_impressions" ("createdAt")`,
    );

    // 创建搜索点击表
    await queryRunner.query(`
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

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_searchLogId" ON "search_clicks" ("searchLogId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_productId" ON "search_clicks" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_query" ON "search_clicks" ("query")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_searchLogId_productId" ON "search_clicks" ("searchLogId", "productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_productId_createdAt" ON "search_clicks" ("productId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_query_productId" ON "search_clicks" ("query", "productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_search_clicks_createdAt" ON "search_clicks" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "search_clicks"`);
    await queryRunner.query(`DROP TABLE "search_impressions"`);
  }
}
