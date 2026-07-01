import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { User } from '../users/entities/user.entity';
import { PointAccount } from './entities/point-account.entity';
import {
  PointTransaction,
  PointTransactionType,
} from './entities/point-transaction.entity';
import { UserCheckin } from '../checkin/entities/user-checkin.entity';
import { ReferralCode } from '../referral/entities/referral-code.entity';
import { ReferralClick } from '../referral/entities/referral-click.entity';
import {
  AttributionEventType,
  ReferralAttribution,
} from '../referral/entities/referral-attribution.entity';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from '../products/entities/product-interaction-event.entity';
import {
  POINT_REWARDS,
  DAILY_REWARDS,
  REFERRAL_TIERS,
  REFERRAL_MILESTONES,
  POINTS_EXPIRY_MONTHS,
  SHARE_REWARD_CHANNELS,
  WITHDRAWAL_RULES,
  isShareRewardChannel,
  type ShareRewardChannel,
} from './points.constants';
import { PointsEvents } from './points.events';
import type {
  EarnPointsRequestEvent,
  PointsEarnedEvent,
} from './points.events';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PointAccount)
    private readonly accountRepo: Repository<PointAccount>,
    @InjectRepository(PointTransaction)
    private readonly transactionRepo: Repository<PointTransaction>,
    @InjectRepository(UserCheckin)
    private readonly checkinRepo: Repository<UserCheckin>,
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralClick)
    private readonly referralClickRepo: Repository<ReferralClick>,
    @InjectRepository(ReferralAttribution)
    private readonly referralAttrRepo: Repository<ReferralAttribution>,
    @InjectRepository(ProductInteractionEvent)
    private readonly productInteractionEventRepo: Repository<ProductInteractionEvent>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── 账户管理 ──────────────────────────────────────────

  async getOrCreateAccount(userId: string): Promise<PointAccount> {
    let account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) {
      account = this.accountRepo.create({ userId });
      try {
        account = await this.accountRepo.save(account);
      } catch (err: any) {
        // 并发创建时唯一索引冲突，重新查询
        if (err.code === '23505') {
          account = await this.accountRepo.findOneOrFail({
            where: { userId },
          });
        } else {
          throw err;
        }
      }
    }
    return account;
  }

  async getBalance(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalWithdrawn: number;
  }> {
    const account = await this.getOrCreateAccount(userId);
    return {
      balance: account.balance,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
      totalWithdrawn: account.totalWithdrawn,
    };
  }

  async getTransactions(
    userId: string,
    options: { page: number; limit: number; type?: PointTransactionType },
  ): Promise<{ items: PointTransaction[]; total: number }> {
    const where: any = { userId };
    if (options.type) where.type = options.type;

    const [items, total] = await this.transactionRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return { items, total };
  }

  async getWaysToEarn(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const [
      user,
      balance,
      taskActions,
      todayCheckin,
      referralCode,
      shareChannels,
      dailyBrowseCount,
      dailyFavoriteReward,
      completeProfileReward,
      firstShareReward,
    ] = await Promise.all([
      this.userRepo.findOne({
        where: { id: userId },
        select: {
          id: true,
          emailVerified: true,
        },
      }),
      this.getBalance(userId),
      this.transactionRepo.find({
        where: {
          userId,
          type: PointTransactionType.EARN,
          action: In(['first_favorite', 'first_intent_action']),
        },
        select: {
          action: true,
        },
      }),
      this.checkinRepo.findOne({
        where: {
          userId,
          checkinDate: today,
        },
      }),
      this.referralCodeRepo.findOne({
        where: { ownerId: userId, ownerType: 'user' },
        select: {
          id: true,
          totalConversions: true,
        },
      }),
      this.getTodayShareRewardChannels(userId),
      this.getTodayDistinctProductViewCount(userId),
      this.getEarnTransaction(userId, 'daily_favorite_product', today),
      this.getEarnTransaction(userId, 'complete_profile', userId),
      this.getEarnTransaction(userId, 'first_share', userId),
    ]);

    const earnedActions = new Set(taskActions.map((tx) => tx.action));
    const shareCountToday = shareChannels.length;

    const referralRegistrations = referralCode?.id
      ? await this.referralAttrRepo.count({
          where: {
            referralCodeId: referralCode.id,
            eventType: AttributionEventType.REGISTRATION,
          },
        })
      : 0;
    const referralTrustedClicks = referralCode?.id
      ? await this.getTrustedReferralClickCount(referralCode.id)
      : 0;

    const starterTasks = [
      {
        id: 'verify_email',
        status: user?.emailVerified ? 'done' : 'available',
      },
      {
        id: 'complete_profile',
        status: completeProfileReward ? 'done' : 'available',
      },
      {
        id: 'first_intent_action',
        status:
          earnedActions.has('first_favorite') ||
          earnedActions.has('first_intent_action')
            ? 'done'
            : 'available',
      },
      {
        id: 'first_share',
        status: firstShareReward ? 'done' : 'available',
      },
      {
        id: 'daily_checkin',
        status: todayCheckin ? 'done' : 'today',
        streakCount: todayCheckin?.streakCount ?? 0,
      },
    ];

    const moreWays = [
      {
        id: 'daily_browse_5_products',
        status:
          dailyBrowseCount >= 5
            ? 'done'
            : dailyBrowseCount > 0
              ? 'in_progress'
              : 'available',
        dailyCount: Math.min(dailyBrowseCount, 5),
        dailyTarget: 5,
      },
      {
        id: 'daily_favorite_product',
        status: dailyFavoriteReward ? 'done' : 'available',
        dailyCount: dailyFavoriteReward ? 1 : 0,
        dailyTarget: 1,
      },
      {
        id: 'share_product',
        status:
          shareCountToday >= DAILY_REWARDS.SHARE_DAILY_LIMIT
            ? 'done'
            : shareCountToday > 0
              ? 'in_progress'
              : 'available',
        dailyCount: shareCountToday,
        dailyLimit: SHARE_REWARD_CHANNELS.length,
      },
      {
        id: 'invite_friend',
        status:
          referralTrustedClicks > 0 || (referralCode?.totalConversions ?? 0) > 0
            ? 'in_progress'
            : 'open',
        clicks: referralTrustedClicks,
        registrations: referralRegistrations,
        conversions: referralCode?.totalConversions ?? 0,
      },
    ];

    return {
      summary: {
        completedStarterTasks: starterTasks.filter(
          (task) => task.status === 'done',
        ).length,
        totalStarterTasks: starterTasks.length,
        pointsBalance: balance.balance,
        pointsToCashout: Math.max(
          0,
          WITHDRAWAL_RULES.FIRST_MIN_AMOUNT - balance.balance,
        ),
      },
      starterTasks,
      moreWays,
    };
  }

  async getShareRewardStatus(userId: string) {
    const claimedChannels = await this.getTodayShareRewardChannels(userId);
    return {
      claimedChannels,
      dailyCount: claimedChannels.length,
      dailyLimit: SHARE_REWARD_CHANNELS.length,
    };
  }

  private async getTodayShareRewardChannels(
    userId: string,
  ): Promise<ShareRewardChannel[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const transactions = await this.transactionRepo.find({
      where: {
        userId,
        type: PointTransactionType.EARN,
        action: 'share_product',
      },
      select: {
        createdAt: true,
        referenceId: true,
        metadata: true,
      },
    });

    const channels = new Set<ShareRewardChannel>();

    for (const tx of transactions) {
      if (new Date(tx.createdAt).getTime() < todayStart.getTime()) continue;

      const metadataChannel =
        typeof tx.metadata?.channel === 'string'
          ? tx.metadata.channel.trim().toLowerCase()
          : null;
      const referenceChannel = tx.referenceId?.split('_').pop()?.toLowerCase();
      const channel = metadataChannel || referenceChannel;

      if (channel && isShareRewardChannel(channel)) {
        channels.add(channel);
      }
    }

    return Array.from(channels);
  }

  private getDayKey(date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  private getTodayStart(): Date {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return todayStart;
  }

  private async getEarnTransaction(
    userId: string,
    action: string,
    referenceId: string,
  ): Promise<Pick<PointTransaction, 'id'> | null> {
    return this.transactionRepo.findOne({
      where: {
        userId,
        type: PointTransactionType.EARN,
        action,
        referenceId,
      },
      select: {
        id: true,
      },
    });
  }

  private async getTodayDistinctProductViewCount(
    userId: string,
  ): Promise<number> {
    const row = await this.productInteractionEventRepo
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event."productId")', 'count')
      .where('event."userId" = :userId', { userId })
      .andWhere('event."eventType" = :eventType', {
        eventType: ProductInteractionEventType.VIEW,
      })
      .andWhere('event."createdAt" >= :todayStart', {
        todayStart: this.getTodayStart(),
      })
      .getRawOne<{ count?: string }>();

    return parseInt(row?.count || '0', 10) || 0;
  }

  private async getTrustedReferralClickCount(
    referralCodeId: string,
  ): Promise<number> {
    const row = await this.referralClickRepo
      .createQueryBuilder('click')
      .select(
        `COUNT(DISTINCT CONCAT_WS('|',
          click."referralCodeId"::text,
          COALESCE(NULLIF(click."sessionId", ''), NULLIF(click.ip, ''), click."referralCodeId"::text),
          COALESCE(NULLIF(click."landingPage", ''), NULLIF(click."redirectTo", ''), '/'),
          FLOOR(EXTRACT(EPOCH FROM click."createdAt") / 1800)::bigint
        ))`,
        'trustedClicks',
      )
      .where('click.referralCodeId = :referralCodeId', { referralCodeId })
      .getRawOne<{ trustedClicks?: string }>();

    return parseInt(row?.trustedClicks || '0', 10) || 0;
  }

  /** 查询某用户在指定 action 列表下的累计收益 */
  async getTotalEarningsByActions(
    userId: string,
    actions: string[],
  ): Promise<number> {
    if (!actions.length) return 0;
    const result = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'total')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.action IN (:...actions)', { actions })
      .andWhere('tx.type = :type', { type: PointTransactionType.EARN })
      .getRawOne();
    return parseInt(result?.total ?? '0', 10);
  }

  // ── 积分发放（原子操作） ──────────────────────────────

  async addPoints(params: {
    userId: string;
    type: PointTransactionType;
    action: string;
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PointTransaction | null> {
    if (params.amount <= 0) {
      this.logger.warn(
        `addPoints called with non-positive amount: ${params.amount}`,
      );
      return null;
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(params.userId);
      const transactionRepo = manager.getRepository(PointTransaction);

      // 先占用去重键，重复事件直接返回，不再进入已失败事务里的补偿 SQL
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRY_MONTHS);

      let transactionId: string;
      try {
        const insertResult = await transactionRepo.insert({
          accountId: account.id,
          userId: params.userId,
          type: params.type,
          action: params.action,
          amount: params.amount,
          balanceAfter: 0,
          referenceType: params.referenceType || null,
          referenceId: params.referenceId || null,
          description: params.description || null,
          metadata: params.metadata || null,
          expiresAt,
        });
        transactionId = insertResult.identifiers[0]?.id;
        if (!transactionId) {
          throw new Error('Failed to create point transaction placeholder');
        }
      } catch (err: any) {
        if (err.code === '23505') {
          this.logger.warn(
            `Duplicate points prevented: userId=${params.userId}, action=${params.action}, ref=${params.referenceId}`,
          );
          return null;
        }
        throw err;
      }

      // 原子更新余额（只有 earn 类型才计入 totalEarned）
      const isEarn = params.type === PointTransactionType.EARN;
      const result = await manager.query(
        `UPDATE point_accounts
         SET balance = balance + $1,
             "totalEarned" = "totalEarned" + CASE WHEN $3 THEN $1 ELSE 0 END,
             "updatedAt" = NOW()
         WHERE id = $2
         RETURNING balance`,
        [params.amount, account.id, isEarn],
      );

      // manager.query() 对 UPDATE RETURNING 返回 [[rows], rowCount]
      const rows = Array.isArray(result[0]) ? result[0] : result;
      const newBalance = rows[0].balance;

      await transactionRepo.update(transactionId, {
        balanceAfter: newBalance,
      });

      const saved = await transactionRepo.findOneByOrFail({
        id: transactionId,
      });
      this.logger.log(
        `Points added: userId=${params.userId}, action=${params.action}, amount=+${params.amount}, balance=${newBalance}`,
      );
      return saved;
    });
  }

  // ── 积分扣减（原子操作） ──────────────────────────────

  async deductPoints(params: {
    userId: string;
    type: PointTransactionType;
    action: string;
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PointTransaction | null> {
    if (params.amount <= 0) {
      this.logger.warn(
        `deductPoints called with non-positive amount: ${params.amount}`,
      );
      return null;
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(params.userId);

      // 原子扣减，余额不足时 affected=0
      const result = await manager.query(
        `UPDATE point_accounts
         SET balance = balance - $1,
             "totalSpent" = CASE WHEN $3 = 'spend' THEN "totalSpent" + $1 ELSE "totalSpent" END,
             "totalWithdrawn" = CASE WHEN $3 = 'withdraw' THEN "totalWithdrawn" + $1 ELSE "totalWithdrawn" END,
             "updatedAt" = NOW()
         WHERE id = $2 AND balance >= $1
         RETURNING balance`,
        [params.amount, account.id, params.type],
      );

      // manager.query() 对 UPDATE RETURNING 返回 [[rows], rowCount]
      const rows = Array.isArray(result[0]) ? result[0] : result;
      if (!rows.length || rows[0] === undefined) {
        this.logger.warn(
          `Insufficient balance: userId=${params.userId}, requested=${params.amount}, available=${account.balance}`,
        );
        return null;
      }

      const newBalance = rows[0].balance;

      const transaction = manager.create(PointTransaction, {
        accountId: account.id,
        userId: params.userId,
        type: params.type,
        action: params.action,
        amount: -params.amount,
        balanceAfter: newBalance,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        description: params.description || null,
        metadata: params.metadata || null,
        expiresAt: null,
      });

      const saved = await manager.save(PointTransaction, transaction);
      this.logger.log(
        `Points deducted: userId=${params.userId}, action=${params.action}, amount=-${params.amount}, balance=${newBalance}`,
      );
      return saved;
    });
  }

  /** 退回积分（提现被拒绝/取消等场景） */
  async refundPoints(params: {
    userId: string;
    amount: number;
    action: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
  }): Promise<PointTransaction | null> {
    if (params.amount <= 0) return null;

    return this.dataSource.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(params.userId);

      // 退回余额，同时回扣 totalWithdrawn（提现退回）或 totalSpent（消费退回）
      const isWithdrawalRefund =
        params.action === 'withdrawal_rejected' ||
        params.action === 'withdrawal_cancelled';
      const result = await manager.query(
        `UPDATE point_accounts
         SET balance = balance + $1,
             "totalWithdrawn" = "totalWithdrawn" - CASE WHEN $3 THEN $1 ELSE 0 END,
             "totalSpent" = "totalSpent" - CASE WHEN NOT $3 AND $4 = 'spend_refund' THEN $1 ELSE 0 END,
             "updatedAt" = NOW()
         WHERE id = $2
         RETURNING balance`,
        [params.amount, account.id, isWithdrawalRefund, params.action],
      );

      const rows = Array.isArray(result[0]) ? result[0] : result;
      const newBalance = rows[0].balance;

      const transaction = manager.create(PointTransaction, {
        accountId: account.id,
        userId: params.userId,
        type: PointTransactionType.ADMIN_ADJUST,
        action: params.action,
        amount: params.amount,
        balanceAfter: newBalance,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        description: params.description || null,
        metadata: null,
        expiresAt: null,
      });

      const saved = await manager.save(PointTransaction, transaction);
      this.logger.log(
        `Points refunded: userId=${params.userId}, action=${params.action}, amount=+${params.amount}, balance=${newBalance}`,
      );
      return saved;
    });
  }

  // ── 推荐阶梯奖励计算 ─────────────────────────────────

  /**
   * 根据推荐人的累计转化数计算本次应得积分
   */
  calculateReferralReward(totalConversions: number): number {
    if (totalConversions <= 0) return 0;
    for (const tier of REFERRAL_TIERS) {
      if (totalConversions >= tier.min && totalConversions <= tier.max) {
        return tier.reward;
      }
    }
    return REFERRAL_TIERS[REFERRAL_TIERS.length - 1].reward;
  }

  /**
   * 检查并发放里程碑奖励
   * @returns 发放的 bonus 积分数，0 表示未触发
   */
  async checkAndAwardMilestoneBonus(
    userId: string,
    newTotalConversions: number,
  ): Promise<number> {
    for (const milestone of REFERRAL_MILESTONES) {
      if (newTotalConversions === milestone.threshold) {
        const tx = await this.addPoints({
          userId,
          type: PointTransactionType.EARN,
          action: 'referral_milestone',
          amount: milestone.bonus,
          referenceType: 'milestone',
          referenceId: `milestone_${milestone.threshold}`,
          description: `Milestone bonus: ${milestone.threshold} referrals`,
        });
        if (tx) {
          this.logger.log(
            `Milestone bonus awarded: userId=${userId}, threshold=${milestone.threshold}, bonus=${milestone.bonus}`,
          );
          return milestone.bonus;
        }
        // tx === null means already awarded (dedup index)
        return 0;
      }
    }
    return 0;
  }

  // ── 事件监听：统一积分发放入口 ────────────────────────

  @OnEvent(PointsEvents.EARN_REQUEST)
  async handleEarnRequest(event: EarnPointsRequestEvent): Promise<void> {
    const { userId, action, referenceType, referenceId, metadata } = event;

    // 根据 action 查找对应积分值
    let amount: number;
    let description: string;

    switch (action) {
      case 'registration':
        amount = POINT_REWARDS.REGISTRATION;
        description = 'New user registration bonus';
        break;
      case 'email_verification':
        amount = POINT_REWARDS.EMAIL_VERIFICATION;
        description = 'Email verification bonus';
        break;
      case 'referred_registration':
        amount = POINT_REWARDS.REFERRED_REGISTRATION;
        description = 'Referral registration bonus';
        break;
      case 'referred_email_verification':
        amount = POINT_REWARDS.REFERRED_EMAIL_VERIFICATION;
        description = 'Referral email verification bonus';
        break;
      case 'complete_profile':
        amount = POINT_REWARDS.COMPLETE_PROFILE;
        description = 'Profile completion bonus';
        break;
      case 'first_favorite':
      case 'first_intent_action':
        amount = POINT_REWARDS.FIRST_FAVORITE;
        description = 'First intent action bonus';
        break;
      case 'first_share':
        amount = POINT_REWARDS.FIRST_SHARE;
        description = 'First share bonus';
        break;
      case 'daily_browse_5_products':
        amount = DAILY_REWARDS.BROWSE_5_PRODUCTS;
        description = 'Daily browse 5 products reward';
        break;
      case 'daily_favorite_product':
        amount = DAILY_REWARDS.FAVORITE_PRODUCT;
        description = 'Daily favorite product reward';
        break;
      case 'daily_checkin':
        // 签到模块直接调用 addPoints，不走事件
        return;
      case 'share_product':
        amount = DAILY_REWARDS.SHARE_PRODUCT;
        description = 'Product share reward';
        break;
      default:
        this.logger.warn(`Unknown earn action: ${action}`);
        return;
    }

    const tx = await this.addPoints({
      userId,
      type: PointTransactionType.EARN,
      action,
      amount,
      referenceType,
      referenceId:
        referenceId ||
        (action === 'daily_browse_5_products' ||
        action === 'daily_favorite_product'
          ? this.getDayKey()
          : undefined),
      description,
      metadata,
    });

    if (tx) {
      this.eventEmitter.emit(PointsEvents.EARNED, {
        userId,
        action,
        amount,
        newBalance: tx.balanceAfter,
      } as PointsEarnedEvent);
    }
  }
}
