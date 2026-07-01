import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMixedSplitNullMetadata1773078006000 implements MigrationInterface {
  name = 'FixMixedSplitNullMetadata1773078006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 修复 19 条混合拆分产品缺失的去重元数据
    // splitSourceWeidianId 用 weidianItemId 填充（来源链接）
    // skuVariantKey 用产品 id 作为唯一标识（历史数据无 groupKey）
    await queryRunner.query(`
      UPDATE products
      SET
        "splitSourceWeidianId" = "weidianItemId",
        "skuVariantKey" = id::text
      WHERE "isFromSplit" = true
        AND "splitSourceWeidianId" IS NULL
        AND "weidianItemId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 还原：将这批记录的字段重置为 NULL
    // 只针对 skuVariantKey = id 的记录（即本次迁移修复的）
    await queryRunner.query(`
      UPDATE products
      SET
        "splitSourceWeidianId" = NULL,
        "skuVariantKey" = NULL
      WHERE "isFromSplit" = true
        AND "skuVariantKey" = id::text
    `);
  }
}
