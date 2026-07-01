import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialLinks1738000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "platform" character varying(50) NOT NULL,
        "label" character varying(100) NOT NULL,
        "url" character varying(500) NOT NULL,
        "icon" character varying(50) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_links" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "social_links";`);
  }
}
