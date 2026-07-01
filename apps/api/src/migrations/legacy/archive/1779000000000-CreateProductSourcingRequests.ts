import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductSourcingRequests1779000000000 implements MigrationInterface {
  name = 'CreateProductSourcingRequests1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."product_sourcing_requests_status_enum"
      AS ENUM('new', 'reviewing', 'planned', 'fulfilled', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "product_sourcing_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "search_query" character varying(255),
        "product_name" character varying(255) NOT NULL,
        "description" text,
        "reference_url" character varying(1000),
        "image_urls" text array,
        "budget_min" numeric(10,2),
        "budget_max" numeric(10,2),
        "locale" character varying(10),
        "search_log_id" uuid,
        "filters_snapshot" jsonb,
        "status" "public"."product_sourcing_requests_status_enum" NOT NULL DEFAULT 'new',
        "admin_notes" text,
        "linked_product_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_sourcing_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_sourcing_requests_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_sourcing_requests_user_id"
      ON "product_sourcing_requests" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_sourcing_requests_status_created_at"
      ON "product_sourcing_requests" ("status", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_sourcing_requests_status_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_sourcing_requests_user_id"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "product_sourcing_requests"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."product_sourcing_requests_status_enum"
    `);
  }
}
