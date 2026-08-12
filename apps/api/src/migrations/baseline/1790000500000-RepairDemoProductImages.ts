import type { MigrationInterface, QueryRunner } from 'typeorm';

const PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';

export class RepairDemoProductImages1790000500000 implements MigrationInterface {
  name = 'RepairDemoProductImages1790000500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "products"
       SET "mainImage" = $1, "images" = '[]'
       WHERE "mainImage" IN (
         'https://si.geilicdn.com/open1708516832-main.jpg',
         'https://si.geilicdn.com/adidas-main.jpg'
       )`,
      [PLACEHOLDER_IMAGE],
    );

    await queryRunner.query(
      `UPDATE "skus"
       SET "image" = $1
       WHERE "image" IN (
         'https://si.geilicdn.com/white-m.jpg',
         'https://si.geilicdn.com/white-l.jpg',
         'https://si.geilicdn.com/black-m.jpg',
         'https://si.geilicdn.com/adidas-black-40.jpg'
       )`,
      [PLACEHOLDER_IMAGE],
    );

    await queryRunner.query(
      `UPDATE "products"
       SET "viewCount" = 0,
           "salesCount" = 0,
           "clickCount" = 0,
           "favoriteCount" = 0,
           "popularityScore" = 0
       WHERE "id" IN (
         'aaaa1111-1111-1111-1111-111111111111',
         'bbbb2222-2222-2222-2222-222222222222'
       )`,
    );
  }

  async down(): Promise<void> {
    // Deliberately do not restore known-broken demo URLs.
  }
}
