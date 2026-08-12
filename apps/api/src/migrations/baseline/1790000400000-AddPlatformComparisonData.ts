import type { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_PLATFORM_COMPARISON_DATA } from '../../platforms/constants/platform-comparison-defaults';

export class AddPlatformComparisonData1790000400000 implements MigrationInterface {
  name = 'AddPlatformComparisonData1790000400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "platforms" ADD COLUMN IF NOT EXISTS "comparisonData" text',
    );

    for (const [key, comparisonData] of Object.entries(
      DEFAULT_PLATFORM_COMPARISON_DATA,
    )) {
      await queryRunner.query(
        `UPDATE "platforms"
         SET "comparisonData" = $1
         WHERE "key" = $2
           AND ("comparisonData" IS NULL OR BTRIM("comparisonData") IN ('', '{}'))`,
        [JSON.stringify(comparisonData), key],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "platforms" DROP COLUMN IF EXISTS "comparisonData"',
    );
  }
}
