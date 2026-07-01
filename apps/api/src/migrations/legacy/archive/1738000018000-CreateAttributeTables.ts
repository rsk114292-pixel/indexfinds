import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttributeTables1738000018000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'multi_select',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE attribute_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
        value VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        ref_color_id UUID REFERENCES colors(id) ON DELETE SET NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(attribute_id, slug)
      );

      CREATE TABLE product_attribute_values (
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, attribute_value_id)
      );

      CREATE INDEX idx_pav_product ON product_attribute_values(product_id);
      CREATE INDEX idx_pav_attribute_value ON product_attribute_values(attribute_value_id);
      CREATE INDEX idx_av_attribute ON attribute_values(attribute_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS product_attribute_values;
      DROP TABLE IF EXISTS attribute_values;
      DROP TABLE IF EXISTS attributes;
    `);
  }
}
