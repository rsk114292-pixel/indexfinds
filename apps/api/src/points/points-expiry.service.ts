import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PointAccount } from './entities/point-account.entity';
import {
  PointTransaction,
  PointTransactionType,
} from './entities/point-transaction.entity';

@Injectable()
export class PointsExpiryService {
  private readonly logger = new Logger(PointsExpiryService.name);

  /** 每批处理的最大用户数，避免长事务 */
  private readonly BATCH_SIZE = 100;

  constructor(
    @InjectRepository(PointTransaction)
    private readonly transactionRepo: Repository<PointTransaction>,
    @InjectRepository(PointAccount)
    private readonly accountRepo: Repository<PointAccount>,
    private readonly dataSource: DataSource,
  ) {}

  /** 每天凌晨 4 点执行过期积分处理 */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleExpiry(): Promise<void> {
    this.logger.log('定时任务：处理过期积分...');
    const result = await this.processExpiredPoints();
    this.logger.log(
      `过期积分处理完成：${result.usersProcessed} 个用户，共扣减 ${result.totalExpired} 积分`,
    );
  }

  /**
   * 扫描并处理所有已过期的 EARN 交易
   * 利用 idx_pt_expires 索引高效查询
   */
  async processExpiredPoints(): Promise<{
    usersProcessed: number;
    totalExpired: number;
  }> {
    const now = new Date();
    let usersProcessed = 0;
    let totalExpired = 0;

    // 按用户分组汇总过期积分（利用 idx_pt_expires 部分索引）
    const expiredByUser: { userId: string; total: string }[] =
      await this.transactionRepo
        .createQueryBuilder('tx')
        .select('tx.userId', 'userId')
        .addSelect('SUM(tx.amount)', 'total')
        .where('tx.type = :type', { type: PointTransactionType.EARN })
        .andWhere('tx.expiresAt IS NOT NULL')
        .andWhere('tx.expiresAt < :now', { now })
        .groupBy('tx.userId')
        .limit(this.BATCH_SIZE)
        .getRawMany();

    for (const row of expiredByUser) {
      const expiredAmount = parseInt(row.total, 10);
      if (expiredAmount <= 0) continue;

      try {
        await this.expireUserPoints(row.userId, expiredAmount, now);
        usersProcessed++;
        totalExpired += expiredAmount;
      } catch (err) {
        this.logger.error(
          `Failed to expire points for user ${row.userId}: ${err.message}`,
        );
      }
    }

    return { usersProcessed, totalExpired };
  }

  /**
   * 在事务中为单个用户处理过期积分：
   * 1. 将过期交易的 expiresAt 置 null（标记为已处理）
   * 2. 扣减账户余额（不低于 0）
   * 3. 写入 EXPIRE 类型的流水记录
   */
  private async expireUserPoints(
    userId: string,
    expiredAmount: number,
    now: Date,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 1. 标记过期交易为已处理（expiresAt → null）
      await manager
        .createQueryBuilder()
        .update(PointTransaction)
        .set({ expiresAt: null })
        .where('userId = :userId', { userId })
        .andWhere('type = :type', { type: PointTransactionType.EARN })
        .andWhere('expiresAt IS NOT NULL')
        .andWhere('expiresAt < :now', { now })
        .execute();

      // 2. 原子扣减余额（balance 不低于 0）
      const result = await manager.query(
        `UPDATE point_accounts
         SET balance = GREATEST(balance - $1, 0),
             "updatedAt" = NOW()
         WHERE "userId" = $2
         RETURNING id, balance`,
        [expiredAmount, userId],
      );

      const rows = Array.isArray(result[0]) ? result[0] : result;
      if (!rows.length) return;

      const accountId = rows[0].id;
      const newBalance = rows[0].balance;

      // 3. 写入 EXPIRE 流水
      const transaction = manager.create(PointTransaction, {
        accountId,
        userId,
        type: PointTransactionType.EXPIRE,
        action: 'points_expired',
        amount: -expiredAmount,
        balanceAfter: newBalance,
        description: `${expiredAmount} points expired`,
        metadata: { expiredAt: now.toISOString() },
        expiresAt: null,
      });
      await manager.save(PointTransaction, transaction);
    });

    this.logger.log(`Expired ${expiredAmount} points for user ${userId}`);
  }
}
