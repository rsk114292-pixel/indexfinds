import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuProductIdIndex1773078000000 implements MigrationInterface {
  name = 'AddSkuProductIdIndex1773078000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_skus_productId" ON "skus" ("productId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_skus_productId"`);
  }
}
