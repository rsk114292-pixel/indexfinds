import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoloBuyRuntimeEmptyTables1790000300000 implements MigrationInterface {
  name = 'LoloBuyRuntimeEmptyTables1790000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "product_id" uuid, CONSTRAINT "UQ_d5394f21b0d6fe0e0f9f0c0e94e" UNIQUE ("user_id", "product_id"), CONSTRAINT "PK_6c472a19a7423cfbbf6b7c75939" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_oauth_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "provider" character varying(20) NOT NULL, "provider_account_id" character varying(255) NOT NULL, "email" character varying(255), "name" character varying(255), "avatar" character varying(500), "access_token" text, "refresh_token" text, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ad572f641bc3e9d46211788bacc" UNIQUE ("provider", "provider_account_id"), CONSTRAINT "PK_9458665223e7b768f5e632efe49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a093a39110ecd3602d87f0e814" ON "user_oauth_accounts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin', 'partner')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying, "username" character varying, "avatar" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP, "failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP, "password_changed_at" TIMESTAMP, "preferred_currency" character varying(3), "preferred_platform" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "point_withdrawals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "amount" integer NOT NULL, "cashAmount" numeric(10,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "paymentMethod" character varying(30) NOT NULL, "paymentAccount" character varying(500) NOT NULL, "adminNote" character varying(500), "proofImage" character varying(500), "reviewedBy" uuid, "reviewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5fc8bfbc6b34b2e3aa62f7ce7b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9275342c86c48fbdfab8aacc93" ON "point_withdrawals" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd0b9d9ec3c2fbad0eb9caa51e" ON "point_withdrawals" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "traffic_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "target_type" character varying(20) NOT NULL, "target" character varying(64) NOT NULL, "scope" character varying(30) NOT NULL DEFAULT 'product_paths', "status" character varying(30) NOT NULL, "reason" text, "metrics_snapshot" jsonb, "created_by" uuid, "expires_at" TIMESTAMP WITH TIME ZONE, "applied_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a03b8d18bd5b9f461b51dfe94d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3e27bd488e48712ec1a6d570b" ON "traffic_blocks" ("status", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d3b324335ad7321001c854cdb" ON "traffic_blocks" ("target", "scope", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_search_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "query" character varying(200) NOT NULL, "searched_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_3628fe7607121da05bf51f73119" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb576ff7e571b1e4f2a6152b5a" ON "user_search_history" ("user_id", "searched_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0566d12913a3cdaa8c9de2c3f8" ON "user_search_history" ("user_id", "query") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_collections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "UQ_728ea7df86904d7169109cf6e1b" UNIQUE ("user_id", "name"), CONSTRAINT "PK_0f50c79662214ef4d0f14956980" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "collection_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "added_at" TIMESTAMP NOT NULL DEFAULT now(), "collection_id" uuid, "favorite_id" uuid, CONSTRAINT "UQ_332ef20ad6f83c6b8ca58bb0ccd" UNIQUE ("collection_id", "favorite_id"), CONSTRAINT "PK_5f299da96958a920ab58871ea57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_browsing_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brand_id" character varying, "category_id" character varying, "viewed_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "product_id" uuid, CONSTRAINT "PK_25f35cb6932f2696b4c880faaea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61de937830f029f927846f866d" ON "user_browsing_history" ("user_id", "viewed_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f4cd4a26a0b979792f55fc7efb" ON "user_browsing_history" ("user_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "outbound_clicks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "platformType" character varying(50) NOT NULL, "platformUrl" character varying(1000), "source" character varying(20) NOT NULL DEFAULT 'direct', "searchClickId" uuid, "pageType" character varying(40), "pagePath" character varying(500), "query" character varying(255), "buttonVariant" character varying(80), "locale" character varying(10), "viewportDeviceType" character varying(20), "userId" uuid, "sessionId" character varying(255), "device_id" character varying(255), "visit_id" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c16c49c4091e6700810a696a088" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4cdd825f21793333a6928cbf0" ON "outbound_clicks" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba2fbf297959d3f07ade5f826b" ON "outbound_clicks" ("platformType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5f8e9878d7145c07d278ba6fe" ON "outbound_clicks" ("source") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc18615d18cd9c41815f687f0b" ON "outbound_clicks" ("device_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ecf66584db9fa57d16b86e330" ON "outbound_clicks" ("visit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8099d87e1e5735159f0ea8e99" ON "outbound_clicks" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de5300d39d957836885a509d82" ON "outbound_clicks" ("query", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb6b89657d10242b9c45c6dd0d" ON "outbound_clicks" ("buttonVariant", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66e779667f703f7fa35f0adf1d" ON "outbound_clicks" ("viewportDeviceType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_07b527be00ff5ac3f3edf42b11" ON "outbound_clicks" ("locale", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c3338ce0c33c8df497b206a8a" ON "outbound_clicks" ("pageType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0e3417e292b1c98d974d9d632" ON "outbound_clicks" ("platformType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_238879c6f851c4577371dc0f3e" ON "outbound_clicks" ("source", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37cecf586de881e5638e6c9fd9" ON "outbound_clicks" ("productId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "hot_search_experiments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "status" character varying(20) NOT NULL DEFAULT 'draft', "variants" jsonb NOT NULL DEFAULT '[]', "start_at" TIMESTAMP WITH TIME ZONE, "end_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a4b3df0646eef2ebf04da1577b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hot_search_experiment_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "experiment_id" uuid NOT NULL, "variant_id" character varying(50) NOT NULL, "event_type" character varying(20) NOT NULL, "keyword" character varying(255), "session_id" character varying(255), "user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3e760b2da263dfdee363be54fdb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_hsee_experiment" ON "hot_search_experiment_events" ("experiment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_hsee_variant" ON "hot_search_experiment_events" ("variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_hsee_event_type" ON "hot_search_experiment_events" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_experiment_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "experimentKey" character varying(60) NOT NULL, "userId" uuid NOT NULL, "variantId" character varying(30) NOT NULL, "eventType" character varying(40) NOT NULL, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d014b831bf3227bd3162ef2b765" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b8cb4c979dc7b2c50b2ba30ee" ON "referral_experiment_events" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cabf15875c95bdb04b4e1545a3" ON "referral_experiment_events" ("eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_228cac6be37634ac17208df85c" ON "referral_experiment_events" ("variantId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_908b300d1220b7cb3fc816d97b" ON "referral_experiment_events" ("experimentKey", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referral_codes_ownertype_enum" AS ENUM('user', 'shop', 'campaign')`,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(6) NOT NULL, "ownerType" "public"."referral_codes_ownertype_enum" NOT NULL DEFAULT 'user', "ownerId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "totalClicks" integer NOT NULL DEFAULT '0', "totalConversions" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_adda7b9deda346ff710695f4968" UNIQUE ("code"), CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_adda7b9deda346ff710695f496" ON "referral_codes" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_clicks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referralCodeId" uuid NOT NULL, "sessionId" character varying NOT NULL, "landingPage" character varying, "redirectTo" character varying, "userAgent" character varying, "ip" character varying(45), "referer" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3253edfd59fa81bd5f465401794" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0f348f08d27a62c8586c61043" ON "referral_clicks" ("sessionId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_59d1f18771f22a2d7f51ccb22d" ON "referral_clicks" ("referralCodeId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referral_attributions_eventtype_enum" AS ENUM('registration', 'purchase_click', 'favorite', 'product_view')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referral_attributions_status_enum" AS ENUM('pending', 'valid', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_attributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referralCodeId" uuid NOT NULL, "referralClickId" uuid NOT NULL, "eventType" "public"."referral_attributions_eventtype_enum" NOT NULL, "userId" uuid, "eventData" jsonb, "status" "public"."referral_attributions_status_enum" NOT NULL DEFAULT 'pending', "rejectReason" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_25a9b4c6513db62b7b36e66d94c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77c26b6fff10d29e3c84b819ab" ON "referral_attributions" ("userId", "eventType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6fec036d19f40dc7ef6fd9c918" ON "referral_attributions" ("referralCodeId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."weidian_cache_status_enum" AS ENUM('success', 'partial', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "weidian_cache" ("itemId" character varying NOT NULL, "title" text, "mainImage" character varying, "images" text, "skuInfo" jsonb, "detailDesc" jsonb, "detailImages" text, "shopId" character varying, "shopName" character varying, "priceMin" numeric(10,2), "priceMax" numeric(10,2), "status" "public"."weidian_cache_status_enum" NOT NULL DEFAULT 'success', "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastFetchedAt" TIMESTAMP, CONSTRAINT "PK_7efa68f28c30e19a11b893467c7" PRIMARY KEY ("itemId"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sku_split_jobs_status_enum" AS ENUM('pending', 'analyzing', 'processing', 'completed', 'partial_failed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sku_split_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."sku_split_jobs_status_enum" NOT NULL DEFAULT 'pending', "weidianItemId" character varying NOT NULL, "weidianTitle" text, "splitDimension" character varying NOT NULL, "totalVariantCount" integer NOT NULL DEFAULT '0', "processedCount" integer NOT NULL DEFAULT '0', "successCount" integer NOT NULL DEFAULT '0', "failedCount" integer NOT NULL DEFAULT '0', "duplicateCount" integer NOT NULL DEFAULT '0', "productGroupId" uuid NOT NULL, "sourceUrl" character varying, "shopId" character varying, "createdBy" character varying, "batchId" uuid, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, CONSTRAINT "PK_4a56b56528f9f69162d86ee3b2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_11dfb9f553d92930673d92a40f" ON "sku_split_jobs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aeb21e7d09184c0313ddf4deca" ON "sku_split_jobs" ("productGroupId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0df55e0e05bde3472409fc17a8" ON "sku_split_jobs" ("batchId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sku_split_items_status_enum" AS ENUM('pending', 'processing', 'success', 'failed', 'duplicate')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sku_split_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_id" uuid NOT NULL, "attrId" bigint NOT NULL, "variantValue" character varying NOT NULL, "imageUrl" character varying, "price" numeric(10,2), "skuCount" integer NOT NULL DEFAULT '0', "status" "public"."sku_split_items_status_enum" NOT NULL DEFAULT 'pending', "productId" uuid, "errorMessage" text, "processingLog" jsonb DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3efed529c294139984b1b6d81b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91cd6d60aab310559921fa4925" ON "sku_split_items" ("job_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sku_split_batches_status_enum" AS ENUM('pending', 'processing', 'paused', 'cancelled', 'completed', 'partial_failed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sku_split_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."sku_split_batches_status_enum" NOT NULL DEFAULT 'pending', "totalUrls" integer NOT NULL, "processedUrls" integer NOT NULL DEFAULT '0', "successUrls" integer NOT NULL DEFAULT '0', "failedUrls" integer NOT NULL DEFAULT '0', "skippedUrls" integer NOT NULL DEFAULT '0', "cancelledUrls" integer NOT NULL DEFAULT '0', "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, CONSTRAINT "PK_bdb90aed886e585ea5ec6ef6fb0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_473cefd081a54616aff766b7d2" ON "sku_split_batches" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sku_split_batch_items_status_enum" AS ENUM('pending', 'analyzing', 'creating_job', 'waiting_job', 'completed', 'failed', 'skipped', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sku_split_batch_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batch_id" uuid NOT NULL, "status" "public"."sku_split_batch_items_status_enum" NOT NULL DEFAULT 'pending', "sourceUrl" text NOT NULL, "weidianItemId" character varying, "splitJobId" uuid, "selectedCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "processingLog" jsonb DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "processedAt" TIMESTAMP, CONSTRAINT "PK_b2a41d69211cb2aa4a66b8be511" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ab07dd212170eb67b39eb57e4" ON "sku_split_batch_items" ("batch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71a894be924320b43bfa97594c" ON "sku_split_batch_items" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c5b9d0d5f4c0da79f522f0b20" ON "sku_split_batch_items" ("splitJobId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_split_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sourceProductId" uuid NOT NULL, "sourceWeidianItemId" character varying(64) NOT NULL, "sourceUrl" text NOT NULL, "resultProductIds" uuid array NOT NULL, "aiAnalysisData" jsonb NOT NULL, "splitStrategy" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "rolledBackAt" TIMESTAMP, "rolledBackReason" text, "operatorId" uuid, CONSTRAINT "PK_049dedf61e8628afd9b03a10c31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf0fd7e2bd21a671ef9b8fcea8" ON "product_split_history" ("sourceProductId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f84bea5e9cc3a471eb5db5be44" ON "product_split_history" ("sourceWeidianItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b9bfbafc599372729182466589" ON "product_split_history" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4cfb20e1c84dd93e521bb8c0bf" ON "product_split_history" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_interaction_events_eventtype_enum" AS ENUM('view', 'click')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_interaction_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "eventType" "public"."product_interaction_events_eventtype_enum" NOT NULL, "trustedVisitorId" character varying(255), "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e13405bda6586b688014a85249" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_interaction_events_user_type_createdAt" ON "product_interaction_events" ("userId", "eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_interaction_events_visitor_type_createdAt" ON "product_interaction_events" ("trustedVisitorId", "eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_interaction_events_product_type_createdAt" ON "product_interaction_events" ("productId", "eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_sourcing_requests_status_enum" AS ENUM('new', 'reviewing', 'planned', 'fulfilled', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_sourcing_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "search_query" character varying(255), "product_name" character varying(255) NOT NULL, "description" text, "reference_url" character varying(1000), "image_urls" text array, "budget_min" numeric(10,2), "budget_max" numeric(10,2), "locale" character varying(10), "search_log_id" uuid, "filters_snapshot" jsonb, "status" "public"."product_sourcing_requests_status_enum" NOT NULL DEFAULT 'new', "admin_notes" text, "linked_product_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba9960802643b4c43e8438150d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2662c31d5746a22b28cc727163" ON "product_sourcing_requests" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_162235c7b9a60bc0843be86fc3" ON "product_sourcing_requests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "point_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "balance" integer NOT NULL DEFAULT '0', "totalEarned" integer NOT NULL DEFAULT '0', "totalSpent" integer NOT NULL DEFAULT '0', "totalWithdrawn" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_ffe605ac943f28fb8c54d0f2f2" UNIQUE ("userId"), CONSTRAINT "PK_54ea5782e82bd464a1f7b6024dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ffe605ac943f28fb8c54d0f2f2" ON "point_accounts" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."point_transactions_type_enum" AS ENUM('earn', 'spend', 'withdraw', 'expire', 'admin_adjust')`,
    );
    await queryRunner.query(
      `CREATE TABLE "point_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accountId" uuid NOT NULL, "userId" uuid NOT NULL, "type" "public"."point_transactions_type_enum" NOT NULL, "action" character varying(50) NOT NULL, "amount" integer NOT NULL, "balanceAfter" integer NOT NULL, "referenceType" character varying(50), "referenceId" character varying(100), "description" character varying(200), "metadata" jsonb, "expiresAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ceb5185b63f070e23d65509b0a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13e91723afe230ae0c953beb59" ON "point_transactions" ("action", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4907cedb28f3c29bcafa6cdea4" ON "point_transactions" ("accountId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_649681c84688d7c74208117d85" ON "point_transactions" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_checkins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "checkinDate" date NOT NULL, "streakCount" integer NOT NULL DEFAULT '1', "pointsEarned" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1979ecae928f294134cd8930387" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uc_user_recent" ON "user_checkins" ("userId", "checkinDate") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_uc_user_date" ON "user_checkins" ("userId", "checkinDate") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."batch_jobs_type_enum" AS ENUM('import', 'update')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."batch_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'partial', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "batch_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."batch_jobs_type_enum" NOT NULL, "status" "public"."batch_jobs_status_enum" NOT NULL DEFAULT 'pending', "totalItems" integer NOT NULL, "processedItems" integer NOT NULL DEFAULT '0', "successItems" integer NOT NULL DEFAULT '0', "failedItems" integer NOT NULL DEFAULT '0', "inProgressItems" integer NOT NULL DEFAULT '0', "created_by_id" uuid NOT NULL, "metadata" jsonb, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, CONSTRAINT "PK_5e14ec2ea28d6eec97d9c7bdb0c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."batch_job_items_status_enum" AS ENUM('pending', 'fetching', 'fetched', 'generating', 'review', 'approved', 'published', 'failed', 'skipped', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "batch_job_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batch_job_id" uuid NOT NULL, "status" "public"."batch_job_items_status_enum" NOT NULL DEFAULT 'pending', "sourceUrl" character varying NOT NULL, "sourceData" jsonb, "aiGeneratedData" jsonb, "finalData" jsonb, "weidianItemId" character varying, "productId" character varying, "errorMessage" text, "retryCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "processedAt" TIMESTAMP, "processingLog" jsonb DEFAULT '[]', CONSTRAINT "PK_00a3b9e1d25eddf7d96cc423208" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce2cf613056346516f3026e1b5" ON "batch_job_items" ("batch_job_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "device_info" character varying(255), "ip_address" character varying(45), "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "replaced_by_token_hash" character varying(64), "last_used_at" TIMESTAMP, "revoked_at" TIMESTAMP, CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "login_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "event_type" character varying(20) NOT NULL, "provider" character varying(20), "ip_address" character varying(45), "geo_location" character varying(100), "user_agent" text, "email" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_15f7b02ad55d5ba905b2962ebab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e2dffa109d0d3dbd94a0a51669" ON "login_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_078394cac46d63df7607eb2f8a" ON "login_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "click_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" character varying NOT NULL, "platform" character varying(50) NOT NULL, "weidianItemId" character varying, "skuInfo" jsonb, "userId" character varying, "sessionId" character varying NOT NULL, "referralCode" character varying(20), "userAgent" character varying, "ip" character varying(45), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2e3b14f5049a9fdbd8c9b1b10bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4838fc17624f34a581391f6b4" ON "click_events" ("referralCode", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d6f5a649844e6c7e415d54c0b" ON "click_events" ("productId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorites" ADD CONSTRAINT "FK_5238ce0a21cc77dc16c8efe3d36" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_favorites" ADD CONSTRAINT "FK_450f345c2e8eb1b4b38a6bc6be4" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_oauth_accounts" ADD CONSTRAINT "FK_a093a39110ecd3602d87f0e814b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_withdrawals" ADD CONSTRAINT "FK_7f006ba4fc110e0e09ddc3d965a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_search_history" ADD CONSTRAINT "FK_1994a941cf2100dba32dafb9c80" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_collections" ADD CONSTRAINT "FK_64c12326d36a9ead157b3757d43" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_items" ADD CONSTRAINT "FK_21bf61f8ce7e69b7bcaee625676" FOREIGN KEY ("collection_id") REFERENCES "user_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_items" ADD CONSTRAINT "FK_0bbb06e0493ee5ea5f0e709ac5d" FOREIGN KEY ("favorite_id") REFERENCES "user_favorites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_browsing_history" ADD CONSTRAINT "FK_7fe4f40b510e57bf31e4cacacc9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_browsing_history" ADD CONSTRAINT "FK_0fed503f929ca8930e775ef1281" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hot_search_experiment_events" ADD CONSTRAINT "FK_37eeabbb1f4b1aa870f97248dfc" FOREIGN KEY ("experiment_id") REFERENCES "hot_search_experiments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_codes" ADD CONSTRAINT "FK_52235f01dcb5638e0630181f561" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_clicks" ADD CONSTRAINT "FK_491448cdb77311547862c7fc50b" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_attributions" ADD CONSTRAINT "FK_7555d77a27844d87401a19b8ac1" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_attributions" ADD CONSTRAINT "FK_d0af79ea6147b2c658159621f6a" FOREIGN KEY ("referralClickId") REFERENCES "referral_clicks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_attributions" ADD CONSTRAINT "FK_db3a1aaea2bf6397ea06fab2bd5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sku_split_items" ADD CONSTRAINT "FK_91cd6d60aab310559921fa4925f" FOREIGN KEY ("job_id") REFERENCES "sku_split_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sku_split_batch_items" ADD CONSTRAINT "FK_0ab07dd212170eb67b39eb57e44" FOREIGN KEY ("batch_id") REFERENCES "sku_split_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_interaction_events" ADD CONSTRAINT "FK_9966ac4e1e6a644e12f3284bf25" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sourcing_requests" ADD CONSTRAINT "FK_162235c7b9a60bc0843be86fc3f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_accounts" ADD CONSTRAINT "FK_ffe605ac943f28fb8c54d0f2f2f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "point_transactions" ADD CONSTRAINT "FK_f895a0664bba0f810ad5606371d" FOREIGN KEY ("accountId") REFERENCES "point_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_checkins" ADD CONSTRAINT "FK_23464403d4f2afb7f1f28924613" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "batch_jobs" ADD CONSTRAINT "FK_e11fb56496c9f7bad5c1dfb35fc" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "batch_job_items" ADD CONSTRAINT "FK_ce2cf613056346516f3026e1b5d" FOREIGN KEY ("batch_job_id") REFERENCES "batch_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "login_logs" ADD CONSTRAINT "FK_e2dffa109d0d3dbd94a0a51669c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "click_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "login_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batch_job_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batch_jobs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_checkins" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "point_transactions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "point_accounts" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_sourcing_requests" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_interaction_events" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_split_history" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "sku_split_batch_items" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sku_split_batches" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sku_split_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sku_split_jobs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "weidian_cache" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "referral_attributions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_clicks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_codes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "referral_experiment_events" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "hot_search_experiment_events" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "hot_search_experiments" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outbound_clicks" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_browsing_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "collection_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_collections" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_search_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "traffic_blocks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "point_withdrawals" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_oauth_accounts" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_favorites" CASCADE`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."batch_job_items_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."batch_jobs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."batch_jobs_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."point_transactions_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."product_sourcing_requests_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."product_interaction_events_eventtype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."sku_split_batch_items_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."sku_split_batches_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."sku_split_items_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."sku_split_jobs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."weidian_cache_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."referral_attributions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."referral_attributions_eventtype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."referral_codes_ownertype_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
