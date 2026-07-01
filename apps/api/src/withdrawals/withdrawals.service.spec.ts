import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import {
  PointWithdrawal,
  WithdrawalStatus,
  PaymentMethod,
} from './entities/point-withdrawal.entity';
import { PointsService } from '../points/points.service';
import { WITHDRAWAL_RULES } from '../points/points.constants';

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;
  let withdrawalRepo: any;
  let pointsService: any;

  const mockWithdrawal = {
    id: 'w-1',
    userId: 'user-1',
    amount: 100,
    cashAmount: 10,
    status: WithdrawalStatus.PENDING,
    paymentMethod: PaymentMethod.PAYPAL,
    paymentAccount: 'test@example.com',
    adminNote: null,
    proofImage: null,
    reviewedBy: null,
    reviewedAt: null,
  };

  beforeEach(async () => {
    const mockQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getCount: jest.fn().mockResolvedValue(0),
    };

    withdrawalRepo = {
      findOne: jest.fn().mockResolvedValue({ ...mockWithdrawal }),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn((data) => ({ id: 'w-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({ ...mockQb })),
    };

    pointsService = {
      deductPoints: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      refundPoints: jest.fn().mockResolvedValue({ id: 'tx-2' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        {
          provide: getRepositoryToken(PointWithdrawal),
          useValue: withdrawalRepo,
        },
        { provide: PointsService, useValue: pointsService },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
  });

  describe('createWithdrawal', () => {
    it('should reject first withdrawal below 50 points', async () => {
      await expect(
        service.createWithdrawal('user-1', {
          amount: WITHDRAWAL_RULES.FIRST_MIN_AMOUNT - 10,
          paymentMethod: PaymentMethod.PAYPAL,
          paymentAccount: 'test@example.com',
        }),
      ).rejects.toThrow(
        `First withdrawal minimum is ${WITHDRAWAL_RULES.FIRST_MIN_AMOUNT} points`,
      );

      expect(pointsService.deductPoints).not.toHaveBeenCalled();
    });

    it('should allow first withdrawal at 50 points', async () => {
      const result = await service.createWithdrawal('user-1', {
        amount: WITHDRAWAL_RULES.FIRST_MIN_AMOUNT,
        paymentMethod: PaymentMethod.PAYPAL,
        paymentAccount: 'test@example.com',
      });

      expect(pointsService.deductPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: WITHDRAWAL_RULES.FIRST_MIN_AMOUNT,
          action: 'withdrawal_request',
        }),
      );
      expect(result.amount).toBe(WITHDRAWAL_RULES.FIRST_MIN_AMOUNT);
      expect(result.cashAmount).toBe(WITHDRAWAL_RULES.FIRST_MIN_AMOUNT / 10);
      expect(result.status).toBe(WithdrawalStatus.PENDING);
    });
  });

  // ── approveWithdrawal ──────────────────────────────

  describe('approveWithdrawal', () => {
    it('should approve pending withdrawal atomically', async () => {
      // findOne after update returns the approved record
      withdrawalRepo.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.APPROVED,
      });

      const result = await service.approveWithdrawal(
        'admin-1',
        'w-1',
        'proof.jpg',
        'Looks good',
      );

      expect(result.status).toBe(WithdrawalStatus.APPROVED);
      // 不应调用 refundPoints
      expect(pointsService.refundPoints).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if withdrawal does not exist', async () => {
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      withdrawalRepo.createQueryBuilder.mockReturnValue(mockQb);
      withdrawalRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveWithdrawal('admin-1', 'nonexistent', 'proof.jpg'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already processed by another admin', async () => {
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      withdrawalRepo.createQueryBuilder.mockReturnValue(mockQb);
      withdrawalRepo.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.REJECTED,
      });

      await expect(
        service.approveWithdrawal('admin-2', 'w-1', 'proof.jpg'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── rejectWithdrawal ──────────────────────────────

  describe('rejectWithdrawal', () => {
    it('should reject pending withdrawal atomically then refund points', async () => {
      withdrawalRepo.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.REJECTED,
      });

      const result = await service.rejectWithdrawal(
        'admin-1',
        'w-1',
        'Suspicious activity',
      );

      expect(result.status).toBe(WithdrawalStatus.REJECTED);
      // refundPoints 必须在原子更新成功后才调用
      expect(pointsService.refundPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 100,
          action: 'withdrawal_rejected',
        }),
      );
    });

    it('should NOT refund points if withdrawal already processed', async () => {
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      withdrawalRepo.createQueryBuilder.mockReturnValue(mockQb);
      withdrawalRepo.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: WithdrawalStatus.APPROVED,
      });

      await expect(
        service.rejectWithdrawal('admin-2', 'w-1', 'Too late'),
      ).rejects.toThrow(BadRequestException);

      // 关键断言：不应退回积分
      expect(pointsService.refundPoints).not.toHaveBeenCalled();
    });
  });

  // ── cancelWithdrawal ──────────────────────────────

  describe('cancelWithdrawal', () => {
    it('should cancel own pending withdrawal and refund', async () => {
      // 第一次查询：权限校验
      withdrawalRepo.findOne
        .mockResolvedValueOnce({ ...mockWithdrawal })
        // 第二次查询：返回最新状态
        .mockResolvedValueOnce({
          ...mockWithdrawal,
          status: WithdrawalStatus.CANCELLED,
        });

      const result = await service.cancelWithdrawal('user-1', 'w-1');

      expect(result.status).toBe(WithdrawalStatus.CANCELLED);
      expect(pointsService.refundPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 100,
          action: 'withdrawal_cancelled',
        }),
      );
    });

    it('should throw ForbiddenException if not own withdrawal', async () => {
      await expect(
        service.cancelWithdrawal('user-other', 'w-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(pointsService.refundPoints).not.toHaveBeenCalled();
    });

    it('should NOT refund if withdrawal already processed concurrently', async () => {
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      withdrawalRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.cancelWithdrawal('user-1', 'w-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(pointsService.refundPoints).not.toHaveBeenCalled();
    });
  });
});
