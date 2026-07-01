import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointsSystem1738000025000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 积分账户表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS point_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        balance INT NOT NULL DEFAULT 0,
        "totalEarned" INT NOT NULL DEFAULT 0,
        "totalSpent" INT NOT NULL DEFAULT 0,
        "totalWithdrawn" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pa_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pa_user_id
        ON point_accounts("userId");
    `);

    // 积分流水表
    await queryRunner.query(`
      CREATE TYPE point_transaction_type AS ENUM ('earn', 'spend', 'withdraw', 'expire', 'admin_adjust');
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" UUID NOT NULL,
        "userId" UUID NOT NULL,
        type point_transaction_type NOT NULL,
        action VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        "balanceAfter" INT NOT NULL,
        "referenceType" VARCHAR(50),
        "referenceId" VARCHAR(100),
        description VARCHAR(200),
        metadata JSONB,
        "expiresAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pt_account FOREIGN KEY ("accountId") REFERENCES point_accounts(id) ON DELETE CASCADE,
        CONSTRAINT fk_pt_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pt_user_created
        ON point_transactions("userId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pt_account_created
        ON point_transactions("accountId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pt_action_created
        ON point_transactions(action, "createdAt" DESC);
    `);

    // 防重复唯一索引：同一用户同一动作同一引用只记一次
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_dedup
        ON point_transactions("userId", action, "referenceId")
        WHERE "referenceId" IS NOT NULL;
    `);

    // 过期积分查询索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pt_expires
        ON point_transactions("expiresAt")
        WHERE "expiresAt" IS NOT NULL AND type = 'earn';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pt_expires;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pt_dedup;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pt_action_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pt_account_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pt_user_created;`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_transactions;`);
    await queryRunner.query(`DROP TYPE IF EXISTS point_transaction_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pa_user_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_accounts;`);
  }
}
