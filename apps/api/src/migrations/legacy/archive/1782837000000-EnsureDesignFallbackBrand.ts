import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureDesignFallbackBrand1782837000000 implements MigrationInterface {
  name = 'EnsureDesignFallbackBrand1782837000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO brands (
        id,
        name,
        slug,
        aliases,
        tier,
        "brandType",
        "displayMode",
        "governanceStatus",
        "canonicalKey",
        status,
        description,
        metadata,
        "isIndependent",
        "isFeatured",
        "featuredSort",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        uuid_generate_v4(),
        'Design',
        'design',
        'design',
        3,
        'canonical',
        'independent',
        'approved',
        'design',
        'active',
        'Fallback brand for products where AI cannot identify the brand',
        '{"aiSource":"system-default","seedSource":"brands-cold-start-v2"}',
        false,
        false,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        aliases = EXCLUDED.aliases,
        tier = EXCLUDED.tier,
        "brandType" = EXCLUDED."brandType",
        "displayMode" = EXCLUDED."displayMode",
        "governanceStatus" = EXCLUDED."governanceStatus",
        "canonicalKey" = EXCLUDED."canonicalKey",
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        "updatedAt" = NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM brands
      WHERE slug = 'design'
        AND (
          metadata LIKE '%"aiSource":"system-default"%'
          OR metadata LIKE '%"seedSource":"brands-cold-start-v2"%'
        )
    `);
  }
}
