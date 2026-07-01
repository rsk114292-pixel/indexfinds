import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboundClicksTable1706550000000 implements MigrationInterface {
  name = 'CreateOutboundClicksTable1706550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建外跳点击表
    await queryRunner.query(`
      CREATE TABLE "outbound_clicks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "platformType" varchar(50) NOT NULL,
        "platformUrl" varchar(1000),
        "source" varchar(20) NOT NULL DEFAULT 'direct',
        "searchClickId" uuid,
        "userId" uuid,
        "sessionId" varchar(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbound_clicks" PRIMARY KEY ("id")
      )
    `);

    // 创建索引（分批执行）
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_productId" ON "outbound_clicks" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_source" ON "outbound_clicks" ("source")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_platformType" ON "outbound_clicks" ("platformType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_createdAt" ON "outbound_clicks" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_productId_createdAt" ON "outbound_clicks" ("productId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_source_createdAt" ON "outbound_clicks" ("source", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_platformType_createdAt" ON "outbound_clicks" ("platformType", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbound_clicks"`);
  }
}
