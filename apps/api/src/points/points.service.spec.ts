import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { PointsService } from './points.service';
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
import { ProductInteractionEvent } from '../products/entities/product-interaction-event.entity';
import { DAILY_REWARDS } from './points.constants';

describe('PointsService', () => {
  let service: PointsService;
  let dataSource: { transaction: jest.Mock };

  const userRepo = {
    findOne: jest.fn(),
  };
  const accountRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const transactionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const checkinRepo = {
    findOne: jest.fn(),
  };
  const referralCodeRepo = {
    findOne: jest.fn(),
  };
  const referralClickQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };
  const referralClickRepo = {
    createQueryBuilder: jest.fn(() => referralClickQb),
  };
  const referralAttrRepo = {
    count: jest.fn(),
  };
  const productInteractionQb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };
  const productInteractionEventRepo = {
    createQueryBuilder: jest.fn(() => productInteractionQb),
  };
  const transactionManagerRepo = {
    insert: jest.fn(),
    update: jest.fn(),
    findOneByOrFail: jest.fn(),
  };
  const transactionManager = {
    getRepository: jest.fn(() => transactionManagerRepo),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dataSource = {
      transaction: jest.fn((callback) =>
        Promise.resolve(callback(transactionManager)),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(PointAccount),
          useValue: accountRepo,
        },
        {
          provide: getRepositoryToken(PointTransaction),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(UserCheckin),
          useValue: checkinRepo,
        },
        {
          provide: getRepositoryToken(ReferralCode),
          useValue: referralCodeRepo,
        },
        {
          provide: getRepositoryToken(ReferralClick),
          useValue: referralClickRepo,
        },
        {
          provide: getRepositoryToken(ReferralAttribution),
          useValue: referralAttrRepo,
        },
        {
          provide: getRepositoryToken(ProductInteractionEvent),
          useValue: productInteractionEventRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
    transactionRepo.findOne.mockResolvedValue(null);
    productInteractionQb.getRawOne.mockResolvedValue({ count: '0' });
  });

  describe('addPoints', () => {
    it('should return null on duplicate reward without updating balance', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'account-1',
        userId: 'user-1',
      });
      transactionManagerRepo.insert.mockRejectedValue({ code: '23505' });

      const result = await service.addPoints({
        userId: 'user-1',
        type: PointTransactionType.EARN,
        action: 'share_product',
        amount: 2,
        referenceType: 'share',
        referenceId: 'share_2026-04-18_whatsapp',
        description: 'Product share reward',
      });

      expect(result).toBeNull();
      expect(transactionManager.query).not.toHaveBeenCalled();
      expect(transactionManagerRepo.update).not.toHaveBeenCalled();
    });

    it('should persist placeholder first, then update balance and balanceAfter', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'account-1',
        userId: 'user-1',
      });
      transactionManagerRepo.insert.mockResolvedValue({
        identifiers: [{ id: 'tx-1' }],
      });
      transactionManager.query.mockResolvedValue([[{ balance: 12 }], 1]);
      transactionManagerRepo.findOneByOrFail.mockResolvedValue({
        id: 'tx-1',
        balanceAfter: 12,
      });

      const result = await service.addPoints({
        userId: 'user-1',
        type: PointTransactionType.EARN,
        action: 'share_product',
        amount: 2,
        referenceType: 'share',
        referenceId: 'share_2026-04-18_email',
        description: 'Product share reward',
      });

      expect(transactionManagerRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          balanceAfter: 0,
          userId: 'user-1',
          action: 'share_product',
        }),
      );
      expect(transactionManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE point_accounts'),
        [2, 'account-1', true],
      );
      expect(transactionManagerRepo.update).toHaveBeenCalledWith('tx-1', {
        balanceAfter: 12,
      });
      expect(result).toEqual({
        id: 'tx-1',
        balanceAfter: 12,
      });
    });
  });

  describe('getWaysToEarn', () => {
    it('should use trusted referral clicks instead of legacy totalClicks', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        emailVerified: true,
      });
      accountRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        balance: 18,
        totalEarned: 30,
        totalSpent: 12,
        totalWithdrawn: 0,
      });
      transactionRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          action: 'share_product',
          createdAt: new Date(),
          type: PointTransactionType.EARN,
          referenceId: 'share_2099-01-01_whatsapp',
          metadata: { channel: 'whatsapp' },
        },
      ]);
      checkinRepo.findOne.mockResolvedValue(null);
      referralCodeRepo.findOne.mockResolvedValue({
        id: 'ref-code-1',
        totalConversions: 0,
        totalClicks: 999,
      });
      referralAttrRepo.count.mockImplementation(({ where }) => {
        if (where?.eventType === AttributionEventType.REGISTRATION) {
          return Promise.resolve(2);
        }
        return Promise.resolve(0);
      });
      referralClickQb.getRawOne.mockResolvedValue({ trustedClicks: '3' });

      const result = await service.getWaysToEarn('user-1');

      const shareTask = result.moreWays.find(
        (task) => task.id === 'share_product',
      );
      expect(shareTask).toMatchObject({
        status: 'in_progress',
        dailyCount: 1,
        dailyLimit: DAILY_REWARDS.SHARE_DAILY_LIMIT,
      });

      const inviteTask = result.moreWays.find(
        (task) => task.id === 'invite_friend',
      );
      expect(inviteTask).toMatchObject({
        status: 'in_progress',
        clicks: 3,
        registrations: 2,
        conversions: 0,
      });
      expect(referralClickRepo.createQueryBuilder).toHaveBeenCalledWith(
        'click',
      );
    });

    it('should stay open when trusted referral clicks are zero', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
      });
      accountRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalWithdrawn: 0,
      });
      transactionRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      checkinRepo.findOne.mockResolvedValue(null);
      referralCodeRepo.findOne.mockResolvedValue({
        id: 'ref-code-1',
        totalConversions: 0,
        totalClicks: 999,
      });
      referralAttrRepo.count.mockResolvedValue(0);
      referralClickQb.getRawOne.mockResolvedValue({ trustedClicks: '0' });

      const result = await service.getWaysToEarn('user-1');

      const inviteTask = result.moreWays.find(
        (task) => task.id === 'invite_friend',
      );
      expect(inviteTask).toMatchObject({
        status: 'open',
        clicks: 0,
        registrations: 0,
        conversions: 0,
      });
    });

    it('should mark share task done after all daily channel rewards are claimed', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        emailVerified: false,
      });
      accountRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        balance: 8,
        totalEarned: 8,
        totalSpent: 0,
        totalWithdrawn: 0,
      });
      transactionRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce(
        Array.from({ length: DAILY_REWARDS.SHARE_DAILY_LIMIT }, (_, index) => ({
          action: 'share_product',
          createdAt: new Date(),
          type: PointTransactionType.EARN,
          referenceId: `share_2099-01-01_${DAILY_REWARDS.SHARE_DAILY_LIMIT - index}`,
          metadata: {
            channel: [
              'whatsapp',
              'telegram',
              'twitter',
              'reddit',
              'email',
              'pinterest',
              'discord',
              'tiktok',
            ][index],
          },
        })),
      );
      checkinRepo.findOne.mockResolvedValue(null);
      referralCodeRepo.findOne.mockResolvedValue(null);
      referralAttrRepo.count.mockResolvedValue(0);
      referralClickQb.getRawOne.mockResolvedValue({ trustedClicks: '0' });

      const result = await service.getWaysToEarn('user-1');

      const shareTask = result.moreWays.find(
        (task) => task.id === 'share_product',
      );
      expect(shareTask).toMatchObject({
        status: 'done',
        dailyCount: DAILY_REWARDS.SHARE_DAILY_LIMIT,
        dailyLimit: DAILY_REWARDS.SHARE_DAILY_LIMIT,
      });
    });
  });
});
