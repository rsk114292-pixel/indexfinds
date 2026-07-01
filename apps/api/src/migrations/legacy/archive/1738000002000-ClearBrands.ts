import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 一次性数据迁移：清空品牌库
 * 注意：down() 无法恢复已删除的品牌数据，仅为占位
 */
export class ClearBrands1738000002000 implements MigrationInterface {
  name = 'ClearBrands1738000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 清空商品表中的 brandId 关联（避免外键约束错误）
    await queryRunner.query(
      `UPDATE products SET "brandId" = NULL WHERE "brandId" IS NOT NULL`,
    );
    // 删除所有品牌
    await queryRunner.query(`DELETE FROM brands`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 数据迁移不可逆 — 已删除的品牌数据无法恢复
    // 如需恢复，请使用 seed 脚本重新导入品牌
  }
}
