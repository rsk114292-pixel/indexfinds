import type { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_PLATFORM_COMPARISON_DATA } from '../../platforms/constants/platform-comparison-defaults';

export class BackfillPlatformComparisonData1790000600000 implements MigrationInterface {
  name = 'BackfillPlatformComparisonData1790000600000';

  async up(queryRunner: QueryRunner): Promise<void> {
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
    for (const [key, comparisonData] of Object.entries(
      DEFAULT_PLATFORM_COMPARISON_DATA,
    )) {
      await queryRunner.query(
        `UPDATE "platforms"
         SET "comparisonData" = NULL
         WHERE "key" = $1 AND "comparisonData" = $2`,
        [key, JSON.stringify(comparisonData)],
      );
    }
  }
}
