import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandStatusIndex1738000030000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_brands_status"
      ON brands ("status")
    `);
    console.log('  ✅ Created index IDX_brands_status on brands.status');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_brands_status"
    `);
    console.log('  ✅ Dropped index IDX_brands_status');
  }
}
