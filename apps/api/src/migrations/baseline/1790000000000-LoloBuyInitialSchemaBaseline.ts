import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoloBuyInitialSchemaBaseline1790000000000 implements MigrationInterface {
  name = 'LoloBuyInitialSchemaBaseline1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brands_status_enum') THEN
          CREATE TYPE "public"."brands_status_enum" AS ENUM (
            'active',
            'inactive',
            'pending_review',
            'merged',
            'rejected'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'products_status_enum') THEN
          CREATE TYPE "public"."products_status_enum" AS ENUM (
            'draft',
            'pending_review',
            'active',
            'inactive',
            'out_of_stock',
            'split'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skus_status_enum') THEN
          CREATE TYPE "public"."skus_status_enum" AS ENUM (
            'available',
            'out_of_stock',
            'discontinued'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_qc_media_type_enum') THEN
          CREATE TYPE "public"."product_qc_media_type_enum" AS ENUM ('image', 'video');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "category" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "nameEn" character varying,
        "slug" character varying NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "aliases" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "translations" text,
        "coverImage" character varying,
        "parentId" uuid,
        CONSTRAINT "UQ_category_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_category_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "brands" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "aliases" text,
        "tier" integer NOT NULL DEFAULT 0,
        "brandType" character varying(32) NOT NULL DEFAULT 'canonical',
        "displayMode" character varying(32) NOT NULL DEFAULT 'independent',
        "governanceStatus" character varying(32) NOT NULL DEFAULT 'approved',
        "canonicalKey" character varying(255),
        "status" "public"."brands_status_enum" NOT NULL DEFAULT 'pending_review',
        "logoUrl" character varying,
        "description" text,
        "mergedIntoId" uuid,
        "metadata" text,
        "parentId" uuid,
        "isIndependent" boolean NOT NULL DEFAULT false,
        "isFeatured" boolean NOT NULL DEFAULT false,
        "featuredSort" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_brands_name" UNIQUE ("name"),
        CONSTRAINT "UQ_brands_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_brands_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_aliases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "brandId" uuid NOT NULL,
        "alias" character varying(255) NOT NULL,
        "normalizedAlias" character varying(255) NOT NULL,
        "aliasType" character varying(32) NOT NULL DEFAULT 'common_variant',
        "source" character varying(32) NOT NULL DEFAULT 'manual',
        "isPreferred" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_brand_aliases_normalized_alias" UNIQUE ("normalizedAlias"),
        CONSTRAINT "PK_brand_aliases_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_relations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "parentBrandId" uuid NOT NULL,
        "childBrandId" uuid NOT NULL,
        "relationType" character varying(32) NOT NULL DEFAULT 'parent_child',
        "effectiveFrom" timestamp,
        "effectiveTo" timestamp,
        "isActive" boolean NOT NULL DEFAULT true,
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_brand_relations_parent_child_type" UNIQUE ("parentBrandId", "childBrandId", "relationType"),
        CONSTRAINT "PK_brand_relations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_candidates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "rawBrandName" character varying(255) NOT NULL,
        "normalizedBrandName" character varying(255) NOT NULL,
        "candidateKey" character varying(255) NOT NULL,
        "reviewStatus" character varying(32) NOT NULL DEFAULT 'pending',
        "suggestedBrandId" uuid,
        "suggestedRelationType" character varying(32),
        "confidence" double precision,
        "hitCount" integer NOT NULL DEFAULT 1,
        "sampleProductCount" integer NOT NULL DEFAULT 0,
        "lastSeenAt" timestamp,
        "source" character varying(32) NOT NULL DEFAULT 'import_ai',
        "reviewedBy" character varying(255),
        "reviewedAt" timestamp,
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_brand_candidates_candidate_key" UNIQUE ("candidateKey"),
        CONSTRAINT "PK_brand_candidates_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "originalTitle" text,
        "originalDescription" text,
        "weidianItemId" character varying,
        "weidianShopId" character varying,
        "weidianShopName" character varying,
        "brandId" uuid,
        "aiBrandName" character varying(255),
        "brandConfidence" double precision,
        "primaryCategoryId" uuid NOT NULL,
        "priceMin" numeric(10,2),
        "priceMax" numeric(10,2),
        "currency" character varying(3) NOT NULL DEFAULT 'CNY',
        "mainImage" character varying,
        "images" text,
        "detailImages" text,
        "aiAttributes" text,
        "attributes" text,
        "weidianRawData" text,
        "sourceUrl" character varying,
        "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft',
        "isFeatured" boolean NOT NULL DEFAULT false,
        "featuredSort" integer NOT NULL DEFAULT 0,
        "viewCount" integer NOT NULL DEFAULT 0,
        "salesCount" integer NOT NULL DEFAULT 0,
        "clickCount" integer NOT NULL DEFAULT 0,
        "ctr" numeric(5,4) NOT NULL DEFAULT 0,
        "favoriteCount" integer NOT NULL DEFAULT 0,
        "popularityScore" numeric(10,6) NOT NULL DEFAULT 0,
        "mixednessScore" numeric(3,2),
        "mixednessEvaluated" boolean NOT NULL DEFAULT false,
        "potentialMixedProduct" boolean NOT NULL DEFAULT false,
        "productGroupId" uuid,
        "isFromSplit" boolean NOT NULL DEFAULT false,
        "splitSourceUrl" text,
        "skuVariantKey" character varying,
        "splitSourceWeidianId" character varying,
        "splitMetadata" text,
        "parentProductId" uuid,
        "hasVariants" boolean NOT NULL DEFAULT false,
        "variantAttributes" text,
        "weidianDeadLinkAt" timestamp,
        "weidianDeadLinkReason" text,
        "weidianDeadLinkAttempts" integer NOT NULL DEFAULT 0,
        "translations" text,
        "embedding" vector(512),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_slug" UNIQUE ("slug"),
        CONSTRAINT "UQ_products_weidianItemId" UNIQUE ("weidianItemId"),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "skus" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "skuCode" character varying,
        "productId" uuid NOT NULL,
        "weidianSkuId" character varying,
        "weidianAttrIds" text,
        "attributes" text NOT NULL,
        "skuKey" character varying,
        "price" numeric(10,2),
        "stock" integer NOT NULL DEFAULT 0,
        "image" character varying,
        "status" "public"."skus_status_enum" NOT NULL DEFAULT 'available',
        "weidianRawData" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_skus_skuCode" UNIQUE ("skuCode"),
        CONSTRAINT "PK_skus_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "brand_candidate_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidateId" uuid NOT NULL,
        "productId" uuid,
        "rawBrandName" character varying(255) NOT NULL,
        "normalizedBrandName" character varying(255) NOT NULL,
        "matchConfidence" double precision,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_brand_candidate_items_candidate_product" UNIQUE ("candidateId", "productId"),
        CONSTRAINT "PK_brand_candidate_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_brand_facts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "rawBrandName" character varying(255) NOT NULL,
        "normalizedBrandName" character varying(255) NOT NULL,
        "matchedBrandId" uuid,
        "candidateId" uuid,
        "classification" character varying(32) NOT NULL DEFAULT 'unknown',
        "matchMethod" character varying(32) NOT NULL DEFAULT 'manual',
        "matchConfidence" double precision,
        "reviewStatus" character varying(32) NOT NULL DEFAULT 'pending_review',
        "resolverType" character varying(32),
        "resolverId" character varying(255),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_brand_facts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "colors" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "nameEn" character varying,
        "aliases" text,
        "aliasesEn" text,
        "hexCode" character varying,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_colors_name" UNIQUE ("name"),
        CONSTRAINT "UQ_colors_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_colors_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attributes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(50) NOT NULL,
        "display_name" character varying(100) NOT NULL,
        "type" character varying(20) NOT NULL DEFAULT 'multi_select',
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_attributes_name" UNIQUE ("name"),
        CONSTRAINT "PK_attributes_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "attribute_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "value" character varying(100) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "attribute_id" uuid NOT NULL,
        "ref_color_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_attribute_values_attribute_slug" UNIQUE ("attribute_id", "slug"),
        CONSTRAINT "PK_attribute_values_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_attribute_values" (
        "product_id" uuid NOT NULL,
        "attribute_value_id" uuid NOT NULL,
        CONSTRAINT "PK_product_attribute_values" PRIMARY KEY ("product_id", "attribute_value_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_secondary_categories" (
        "productId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        CONSTRAINT "PK_product_secondary_categories" PRIMARY KEY ("productId", "categoryId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "category_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        CONSTRAINT "PK_category_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_qc_media" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "type" "public"."product_qc_media_type_enum" NOT NULL DEFAULT 'image',
        "url" text NOT NULL,
        "poster_url" text,
        "mime_type" character varying(100),
        "duration" numeric(10,2),
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_qc_media_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "platforms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "translations" text,
        "baseUrl" character varying NOT NULL,
        "inviteCode" character varying(100),
        "isActive" boolean NOT NULL DEFAULT true,
        "logoUrl" character varying,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "urlTemplate" character varying,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_platforms_key" UNIQUE ("key"),
        CONSTRAINT "PK_platforms_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "settings" (
        "key" character varying(100) NOT NULL,
        "value" text NOT NULL,
        "description" character varying(255),
        "isSecret" boolean NOT NULL DEFAULT false,
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settings_key" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "social_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platform" character varying(50) NOT NULL,
        "label" character varying(100) NOT NULL,
        "url" character varying(500) NOT NULL,
        "icon" character varying(50) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_links_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "synonym_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "canonical_term" character varying(100) NOT NULL,
        "synonyms" text array NOT NULL,
        "category" character varying(50) NOT NULL DEFAULT 'general',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_synonym_groups_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_text_embeddings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "source_text" text NOT NULL,
        "text_hash" character varying(64) NOT NULL,
        "embedding" vector(384),
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_text_embeddings_product_id" UNIQUE ("product_id"),
        CONSTRAINT "PK_product_text_embeddings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product_image_embeddings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "image_index" integer NOT NULL DEFAULT 0,
        "embedding" vector(512),
        "embedding_failure_code" character varying(50),
        "embedding_failure_reason" text,
        "embedding_failed_at" timestamp with time zone,
        "embedding_failure_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_image_embeddings_product_url" UNIQUE ("product_id", "image_url"),
        CONSTRAINT "PK_product_image_embeddings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "category"
      ADD CONSTRAINT "FK_category_parent"
      FOREIGN KEY ("parentId") REFERENCES "category"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brands"
      ADD CONSTRAINT "FK_brands_parent"
      FOREIGN KEY ("parentId") REFERENCES "brands"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_aliases"
      ADD CONSTRAINT "FK_brand_aliases_brand"
      FOREIGN KEY ("brandId") REFERENCES "brands"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_relations"
      ADD CONSTRAINT "FK_brand_relations_parent"
      FOREIGN KEY ("parentBrandId") REFERENCES "brands"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_relations"
      ADD CONSTRAINT "FK_brand_relations_child"
      FOREIGN KEY ("childBrandId") REFERENCES "brands"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_candidates"
      ADD CONSTRAINT "FK_brand_candidates_suggested_brand"
      FOREIGN KEY ("suggestedBrandId") REFERENCES "brands"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_brand"
      FOREIGN KEY ("brandId") REFERENCES "brands"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_primary_category"
      FOREIGN KEY ("primaryCategoryId") REFERENCES "category"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "skus"
      ADD CONSTRAINT "FK_skus_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_candidate_items"
      ADD CONSTRAINT "FK_brand_candidate_items_candidate"
      FOREIGN KEY ("candidateId") REFERENCES "brand_candidates"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "brand_candidate_items"
      ADD CONSTRAINT "FK_brand_candidate_items_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_brand_facts"
      ADD CONSTRAINT "FK_product_brand_facts_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_brand_facts"
      ADD CONSTRAINT "FK_product_brand_facts_brand"
      FOREIGN KEY ("matchedBrandId") REFERENCES "brands"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_brand_facts"
      ADD CONSTRAINT "FK_product_brand_facts_candidate"
      FOREIGN KEY ("candidateId") REFERENCES "brand_candidates"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_qc_media"
      ADD CONSTRAINT "FK_product_qc_media_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attribute_values"
      ADD CONSTRAINT "FK_attribute_values_attribute"
      FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "attribute_values"
      ADD CONSTRAINT "FK_attribute_values_color"
      FOREIGN KEY ("ref_color_id") REFERENCES "colors"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_attribute_values"
      ADD CONSTRAINT "FK_product_attribute_values_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_attribute_values"
      ADD CONSTRAINT "FK_product_attribute_values_attribute_value"
      FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_secondary_categories"
      ADD CONSTRAINT "FK_product_secondary_categories_product"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "product_secondary_categories"
      ADD CONSTRAINT "FK_product_secondary_categories_category"
      FOREIGN KEY ("categoryId") REFERENCES "category"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "category_closure"
      ADD CONSTRAINT "FK_category_closure_ancestor"
      FOREIGN KEY ("id_ancestor") REFERENCES "category"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "category_closure"
      ADD CONSTRAINT "FK_category_closure_descendant"
      FOREIGN KEY ("id_descendant") REFERENCES "category"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_text_embeddings"
      ADD CONSTRAINT "FK_product_text_embeddings_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "product_image_embeddings"
      ADD CONSTRAINT "FK_product_image_embeddings_product"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_category_parent" ON "category" ("parentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_category_closure_ancestor" ON "category_closure" ("id_ancestor")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_category_closure_descendant" ON "category_closure" ("id_descendant")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brands_canonical_key" ON "brands" ("canonicalKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brands_status" ON "brands" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brands_parent" ON "brands" ("parentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_aliases_brand_id" ON "brand_aliases" ("brandId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_aliases_brand_alias" ON "brand_aliases" ("brandId", "alias")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_relations_parent_id" ON "brand_relations" ("parentBrandId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_relations_child_id" ON "brand_relations" ("childBrandId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_candidates_candidate_key" ON "brand_candidates" ("candidateKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_candidates_review_status" ON "brand_candidates" ("reviewStatus")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_candidates_suggested_brand_id" ON "brand_candidates" ("suggestedBrandId")`,
    );
    await queryRunner.query(`
      CREATE INDEX "idx_brand_candidates_review_status_hit_count"
      ON "brand_candidates" ("reviewStatus", "hitCount" DESC)
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_products_weidian_item_id" ON "products" ("weidianItemId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_brand_id" ON "products" ("brandId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_primary_category_id" ON "products" ("primaryCategoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_status" ON "products" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_popularity_score" ON "products" ("popularityScore")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_potential_mixed" ON "products" ("potentialMixedProduct")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_product_group_id" ON "products" ("productGroupId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_split_source_weidian_id" ON "products" ("splitSourceWeidianId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_parent_product_id" ON "products" ("parentProductId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_created_at" ON "products" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_brand_status" ON "products" ("brandId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_category_status" ON "products" ("primaryCategoryId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_skus_product_id" ON "skus" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_candidate_items_candidate_id" ON "brand_candidate_items" ("candidateId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_brand_candidate_items_product_id" ON "brand_candidate_items" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_brand_facts_product_id" ON "product_brand_facts" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_brand_facts_matched_brand_id" ON "product_brand_facts" ("matchedBrandId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_brand_facts_candidate_id" ON "product_brand_facts" ("candidateId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_qc_media_product_sort" ON "product_qc_media" ("product_id", "sort_order")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_attribute_values_attribute_id" ON "attribute_values" ("attribute_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_attribute_values_ref_color_id" ON "attribute_values" ("ref_color_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_attribute_values_product_id" ON "product_attribute_values" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_attribute_values_attribute_value_id" ON "product_attribute_values" ("attribute_value_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_secondary_categories_product_id" ON "product_secondary_categories" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_secondary_categories_category_id" ON "product_secondary_categories" ("categoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_platforms_key" ON "platforms" ("key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_synonym_groups_canonical_term" ON "synonym_groups" ("canonical_term")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_synonym_groups_category" ON "synonym_groups" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_synonym_groups_is_active" ON "synonym_groups" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_social_links_active_sort" ON "social_links" ("isActive", "sortOrder", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_text_embeddings_product_id" ON "product_text_embeddings" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_image_embeddings_product_id" ON "product_image_embeddings" ("product_id")`,
    );
    await queryRunner.query(`
      CREATE INDEX "idx_product_image_embeddings_failure_code"
      ON "product_image_embeddings" ("embedding_failure_code")
      WHERE "embedding_failure_code" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_products_embedding_hnsw"
      ON "products"
      USING hnsw ("embedding" vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_text_embeddings_hnsw"
      ON "product_text_embeddings"
      USING hnsw ("embedding" vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_image_embeddings_hnsw"
      ON "product_image_embeddings"
      USING hnsw ("embedding" vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_image_embeddings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_text_embeddings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "synonym_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platforms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_qc_media"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category_closure"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_secondary_categories"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "product_attribute_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attribute_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "colors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_brand_facts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_candidate_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "skus"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_candidates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_relations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_aliases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."product_qc_media_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."skus_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."products_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."brands_status_enum"`,
    );
  }
}
