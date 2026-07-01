import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductInteractionEvents1782825600000 implements MigrationInterface {
  name = 'CreateProductInteractionEvents1782825600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."product_interaction_events_eventtype_enum" AS ENUM('view', 'click')
    `);
    await queryRunner.query(`
      CREATE TABLE "product_interaction_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "eventType" "public"."product_interaction_events_eventtype_enum" NOT NULL,
        "trustedVisitorId" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_interaction_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_interaction_events_product" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_interaction_events_product_type_createdAt"
      ON "product_interaction_events" ("productId", "eventType", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_interaction_events_visitor_type_createdAt"
      ON "product_interaction_events" ("trustedVisitorId", "eventType", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_product_interaction_events_visitor_type_createdAt"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_product_interaction_events_product_type_createdAt"
    `);
    await queryRunner.query(`DROP TABLE "product_interaction_events"`);
    await queryRunner.query(`
      DROP TYPE "public"."product_interaction_events_eventtype_enum"
    `);
  }
}
