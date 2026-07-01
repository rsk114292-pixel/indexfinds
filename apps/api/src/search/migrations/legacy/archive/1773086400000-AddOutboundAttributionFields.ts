import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutboundAttributionFields1773086400000 implements MigrationInterface {
  name = 'AddOutboundAttributionFields1773086400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "pageType" varchar(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "pagePath" varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "query" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "buttonVariant" varchar(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "locale" varchar(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" ADD "viewportDeviceType" varchar(20)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_pageType_createdAt" ON "outbound_clicks" ("pageType", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_locale_createdAt" ON "outbound_clicks" ("locale", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_viewportDeviceType_createdAt" ON "outbound_clicks" ("viewportDeviceType", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_buttonVariant_createdAt" ON "outbound_clicks" ("buttonVariant", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbound_clicks_query_createdAt" ON "outbound_clicks" ("query", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbound_clicks_query_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbound_clicks_buttonVariant_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbound_clicks_viewportDeviceType_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbound_clicks_locale_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbound_clicks_pageType_createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "viewportDeviceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "locale"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "buttonVariant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "query"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "pagePath"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outbound_clicks" DROP COLUMN "pageType"`,
    );
  }
}
