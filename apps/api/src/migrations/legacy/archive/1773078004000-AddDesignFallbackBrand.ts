import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDesignFallbackBrand1773078004000 implements MigrationInterface {
  name = 'AddDesignFallbackBrand1773078004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 "Design" 兜底品牌（仅当 AI 识别不到品牌时使用）
    await queryRunner.query(`
      INSERT INTO brands (id, name, slug, status, tier, aliases, metadata, "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'Design',
        'design',
        'active',
        3,
        '["design"]',
        '{"aiSource": "system-default", "description": "Fallback brand for products where AI cannot identify the brand"}',
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM brands WHERE slug = 'design' AND metadata::text LIKE '%system-default%'`,
    );
  }
}
