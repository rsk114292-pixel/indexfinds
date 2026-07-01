import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PointsExpiryService } from './points-expiry.service';
import { PointAccount } from './entities/point-account.entity';
import {
  PointTransaction,
  PointTransactionType,
} from './entities/point-transaction.entity';

describe('PointsExpiryService', () => {
  let service: PointsExpiryService;
  let transactionRepo: any;
  let accountRepo: any;
  let dataSource: any;

  // 事务内的 mock manager
  let manager: any;

  beforeEach(async () => {
    manager = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      })),
      query: jest.fn().mockResolvedValue([[{ id: 'account-1', balance: 50 }]]),
      create: jest.fn((_, data) => data),
      save: jest.fn((_, entity) => Promise.resolve({ id: 'tx-1', ...entity })),
    };

    dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
    };

    const mockQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    transactionRepo = {
      createQueryBuilder: jest.fn(() => mockQb),
    };

    accountRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsExpiryService,
        {
          provide: getRepositoryToken(PointTransaction),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(PointAccount),
          useValue: accountRepo,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PointsExpiryService>(PointsExpiryService);
  });

  describe('processExpiredPoints', () => {
    it('should return zeros when no expired points', async () => {
      const result = await service.processExpiredPoints();

      expect(result).toEqual({ usersProcessed: 0, totalExpired: 0 });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should process expired points for each user', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user-1', total: '30' },
          { userId: 'user-2', total: '50' },
        ]),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.processExpiredPoints();

      expect(result).toEqual({ usersProcessed: 2, totalExpired: 80 });
      expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    });

    it('should skip users with zero or negative expired amount', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'user-1', total: '0' }]),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.processExpiredPoints();

      expect(result).toEqual({ usersProcessed: 0, totalExpired: 0 });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should continue processing if one user fails', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user-fail', total: '10' },
          { userId: 'user-ok', total: '20' },
        ]),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      // First transaction fails, second succeeds
      dataSource.transaction
        .mockRejectedValueOnce(new Error('DB error'))
        .mockImplementationOnce((cb: any) => cb(manager));

      const result = await service.processExpiredPoints();

      expect(result).toEqual({ usersProcessed: 1, totalExpired: 20 });
    });
  });

  describe('expireUserPoints (via processExpiredPoints)', () => {
    it('should mark expired transactions, deduct balance, and write EXPIRE record', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'user-1', total: '25' }]),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.processExpiredPoints();

      // 验证事务内调用顺序
      // 1. 标记过期交易
      expect(manager.createQueryBuilder).toHaveBeenCalled();

      // 2. 扣减余额（GREATEST(balance - 25, 0)）
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST(balance - $1, 0)'),
        [25, 'user-1'],
      );

      // 3. 写入 EXPIRE 流水
      expect(manager.create).toHaveBeenCalledWith(
        PointTransaction,
        expect.objectContaining({
          userId: 'user-1',
          type: PointTransactionType.EXPIRE,
          action: 'points_expired',
          amount: -25,
          balanceAfter: 50,
        }),
      );
      expect(manager.save).toHaveBeenCalled();
    });
  });
});
