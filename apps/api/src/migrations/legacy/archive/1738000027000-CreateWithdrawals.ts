import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWithdrawals1738000027000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS point_withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        amount INT NOT NULL,
        "cashAmount" NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "paymentMethod" VARCHAR(30) NOT NULL,
        "paymentAccount" VARCHAR(500) NOT NULL,
        "adminNote" VARCHAR(500),
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pw_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pw_user
        ON point_withdrawals("userId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pw_status
        ON point_withdrawals(status, "createdAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pw_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pw_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_withdrawals;`);
  }
}
