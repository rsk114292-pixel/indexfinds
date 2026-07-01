import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandGovernanceTables1782825700000 implements MigrationInterface {
  name = 'AddBrandGovernanceTables1782825700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brands
      ADD COLUMN "brandType" varchar(32) NOT NULL DEFAULT 'canonical',
      ADD COLUMN "displayMode" varchar(32) NOT NULL DEFAULT 'independent',
      ADD COLUMN "governanceStatus" varchar(32) NOT NULL DEFAULT 'approved',
      ADD COLUMN "canonicalKey" varchar(255)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_brands_canonical_key"
      ON brands ("canonicalKey")
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_aliases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brandId" uuid NOT NULL,
        "alias" varchar(255) NOT NULL,
        "normalizedAlias" varchar(255) NOT NULL,
        "aliasType" varchar(32) NOT NULL DEFAULT 'common_variant',
        "source" varchar(32) NOT NULL DEFAULT 'manual',
        "isPreferred" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brand_aliases_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_brand_aliases_normalized_alias" UNIQUE ("normalizedAlias"),
        CONSTRAINT "FK_brand_aliases_brand" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_brand_aliases_brand_id"
      ON "brand_aliases" ("brandId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_brand_aliases_brand_alias"
      ON "brand_aliases" ("brandId", "alias")
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_relations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "parentBrandId" uuid NOT NULL,
        "childBrandId" uuid NOT NULL,
        "relationType" varchar(32) NOT NULL DEFAULT 'parent_child',
        "effectiveFrom" TIMESTAMP,
        "effectiveTo" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brand_relations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_brand_relations_parent_child_type" UNIQUE ("parentBrandId", "childBrandId", "relationType"),
        CONSTRAINT "FK_brand_relations_parent" FOREIGN KEY ("parentBrandId") REFERENCES "brands"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_brand_relations_child" FOREIGN KEY ("childBrandId") REFERENCES "brands"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_brand_relations_parent_id"
      ON "brand_relations" ("parentBrandId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_brand_relations_child_id"
      ON "brand_relations" ("childBrandId")
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "rawBrandName" varchar(255) NOT NULL,
        "normalizedBrandName" varchar(255) NOT NULL,
        "candidateKey" varchar(255) NOT NULL,
        "reviewStatus" varchar(32) NOT NULL DEFAULT 'pending',
        "suggestedBrandId" uuid,
        "suggestedRelationType" varchar(32),
        "confidence" double precision,
        "hitCount" integer NOT NULL DEFAULT 1,
        "sampleProductCount" integer NOT NULL DEFAULT 0,
        "lastSeenAt" TIMESTAMP,
        "source" varchar(32) NOT NULL DEFAULT 'import_ai',
        "reviewedBy" varchar(255),
        "reviewedAt" TIMESTAMP,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brand_candidates_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_brand_candidates_candidate_key" UNIQUE ("candidateKey"),
        CONSTRAINT "FK_brand_candidates_suggested_brand" FOREIGN KEY ("suggestedBrandId") REFERENCES "brands"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_brand_candidates_review_status"
      ON "brand_candidates" ("reviewStatus")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_brand_candidates_suggested_brand_id"
      ON "brand_candidates" ("suggestedBrandId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_brand_candidates_review_status_hit_count"
      ON "brand_candidates" ("reviewStatus", "hitCount" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_candidate_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidateId" uuid NOT NULL,
        "productId" uuid,
        "rawBrandName" varchar(255) NOT NULL,
        "normalizedBrandName" varchar(255) NOT NULL,
        "matchConfidence" double precision,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brand_candidate_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_brand_candidate_items_candidate_product" UNIQUE ("candidateId", "productId"),
        CONSTRAINT "FK_brand_candidate_items_candidate" FOREIGN KEY ("candidateId") REFERENCES "brand_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_brand_candidate_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_brand_candidate_items_candidate_id"
      ON "brand_candidate_items" ("candidateId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_brand_candidate_items_product_id"
      ON "brand_candidate_items" ("productId")
    `);

    await queryRunner.query(`
      CREATE TABLE "product_brand_facts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" uuid NOT NULL,
        "rawBrandName" varchar(255) NOT NULL,
        "normalizedBrandName" varchar(255) NOT NULL,
        "matchedBrandId" uuid,
        "candidateId" uuid,
        "classification" varchar(32) NOT NULL DEFAULT 'unknown',
        "matchMethod" varchar(32) NOT NULL DEFAULT 'manual',
        "matchConfidence" double precision,
        "reviewStatus" varchar(32) NOT NULL DEFAULT 'pending_review',
        "resolverType" varchar(32),
        "resolverId" varchar(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_brand_facts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_brand_facts_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_brand_facts_brand" FOREIGN KEY ("matchedBrandId") REFERENCES "brands"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_product_brand_facts_candidate" FOREIGN KEY ("candidateId") REFERENCES "brand_candidates"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_product_brand_facts_product_id"
      ON "product_brand_facts" ("productId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_brand_facts_matched_brand_id"
      ON "product_brand_facts" ("matchedBrandId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_brand_facts_candidate_id"
      ON "product_brand_facts" ("candidateId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_brand_facts_candidate_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_brand_facts_matched_brand_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_brand_facts_product_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "product_brand_facts"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_candidate_items_product_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_candidate_items_candidate_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_candidate_items"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_candidates_review_status_hit_count"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_candidates_suggested_brand_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_candidates_review_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_candidates"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_relations_child_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_relations_parent_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_relations"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_aliases_brand_alias"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_brand_aliases_brand_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_aliases"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brands_canonical_key"`);
    await queryRunner.query(`
      ALTER TABLE brands
      DROP COLUMN "canonicalKey",
      DROP COLUMN "governanceStatus",
      DROP COLUMN "displayMode",
      DROP COLUMN "brandType"
    `);
  }
}
