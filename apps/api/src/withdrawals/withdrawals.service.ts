import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PointWithdrawal,
  WithdrawalStatus,
} from './entities/point-withdrawal.entity';
import { PointsService } from '../points/points.service';
import { PointTransactionType } from '../points/entities/point-transaction.entity';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WITHDRAWAL_RULES } from '../points/points.constants';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    @InjectRepository(PointWithdrawal)
    private readonly withdrawalRepo: Repository<PointWithdrawal>,
    private readonly pointsService: PointsService,
  ) {}

  // ── 用户端 ──────────────────────────────────────────

  async createWithdrawal(
    userId: string,
    dto: CreateWithdrawalDto,
  ): Promise<PointWithdrawal> {
    // 判断是否首次提现（只计算已批准的）
    const approvedCount = await this.withdrawalRepo.count({
      where: { userId, status: WithdrawalStatus.APPROVED },
    });
    const isFirstWithdrawal = approvedCount === 0;
    const minAmount = isFirstWithdrawal
      ? WITHDRAWAL_RULES.FIRST_MIN_AMOUNT
      : WITHDRAWAL_RULES.MIN_AMOUNT;

    if (dto.amount < minAmount) {
      throw new BadRequestException(
        isFirstWithdrawal
          ? `First withdrawal minimum is ${minAmount} points`
          : `Minimum withdrawal is ${minAmount} points`,
      );
    }

    // 检查当月提现次数（不超过2次）
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await this.withdrawalRepo
      .createQueryBuilder('w')
      .where('w.userId = :userId', { userId })
      .andWhere('w.createdAt >= :monthStart', { monthStart })
      .andWhere('w.status IN (:...statuses)', {
        statuses: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED],
      })
      .getCount();

    if (monthlyCount >= WITHDRAWAL_RULES.MONTHLY_LIMIT) {
      throw new BadRequestException(
        `Maximum ${WITHDRAWAL_RULES.MONTHLY_LIMIT} withdrawals per month. Please try again next month.`,
      );
    }

    // 扣减积分（冻结）
    const tx = await this.pointsService.deductPoints({
      userId,
      type: PointTransactionType.WITHDRAW,
      action: 'withdrawal_request',
      amount: dto.amount,
      referenceType: 'withdrawal',
      description: `Withdrawal request: ${dto.amount} points`,
    });

    if (!tx) {
      throw new BadRequestException('Insufficient points balance');
    }

    // 创建提现记录
    const cashAmount = dto.amount / 10;
    const withdrawal = this.withdrawalRepo.create({
      userId,
      amount: dto.amount,
      cashAmount,
      status: WithdrawalStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      paymentAccount: dto.paymentAccount,
    });

    const saved = await this.withdrawalRepo.save(withdrawal);

    this.logger.log(
      `Withdrawal created: userId=${userId}, amount=${dto.amount}, cash=$${cashAmount}, id=${saved.id}`,
    );

    return saved;
  }

  async cancelWithdrawal(
    userId: string,
    withdrawalId: string,
  ): Promise<PointWithdrawal> {
    // 先查出来做权限校验
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own withdrawals');
    }

    // 原子更新：仅当 status 仍为 pending 时才取消
    const result = await this.withdrawalRepo
      .createQueryBuilder()
      .update(PointWithdrawal)
      .set({ status: WithdrawalStatus.CANCELLED })
      .where('id = :id AND userId = :userId AND status = :pending', {
        id: withdrawalId,
        userId,
        pending: WithdrawalStatus.PENDING,
      })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException(
        'Only pending withdrawals can be cancelled',
      );
    }

    // 原子更新成功后再退积分
    await this.pointsService.refundPoints({
      userId,
      amount: withdrawal.amount,
      action: 'withdrawal_cancelled',
      referenceType: 'withdrawal',
      referenceId: withdrawal.id,
      description: `Withdrawal cancelled: ${withdrawal.amount} points refunded`,
    });

    this.logger.log(
      `Withdrawal cancelled: userId=${userId}, id=${withdrawalId}, refunded=${withdrawal.amount} points`,
    );

    // 返回最新状态
    return (await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    }))!;
  }

  async getUserWithdrawals(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: PointWithdrawal[]; total: number }> {
    const [items, total] = await this.withdrawalRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  // ── 管理端 ──────────────────────────────────────────

  async getAdminWithdrawals(
    status?: WithdrawalStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: PointWithdrawal[]; total: number }> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.withdrawalRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async approveWithdrawal(
    adminUserId: string,
    withdrawalId: string,
    proofImage: string,
    adminNote?: string,
  ): Promise<PointWithdrawal> {
    // 原子更新：仅当 status 仍为 pending 时才批准
    const result = await this.withdrawalRepo
      .createQueryBuilder()
      .update(PointWithdrawal)
      .set({
        status: WithdrawalStatus.APPROVED,
        proofImage,
        adminNote: adminNote || null,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      })
      .where('id = :id AND status = :pending', {
        id: withdrawalId,
        pending: WithdrawalStatus.PENDING,
      })
      .execute();

    if (result.affected === 0) {
      // 区分：不存在 vs 已被其他管理员处理
      const exists = await this.withdrawalRepo.findOne({
        where: { id: withdrawalId },
      });
      if (!exists) {
        throw new NotFoundException('Withdrawal not found');
      }
      throw new BadRequestException(
        `Withdrawal already ${exists.status}, cannot approve`,
      );
    }

    const saved = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });

    this.logger.log(
      `Withdrawal approved: id=${withdrawalId}, admin=${adminUserId}, cash=$${saved!.cashAmount}`,
    );

    return saved!;
  }

  async rejectWithdrawal(
    adminUserId: string,
    withdrawalId: string,
    adminNote: string,
  ): Promise<PointWithdrawal> {
    // 原子更新：仅当 status 仍为 pending 时才拒绝，确保先锁定状态再退积分
    const result = await this.withdrawalRepo
      .createQueryBuilder()
      .update(PointWithdrawal)
      .set({
        status: WithdrawalStatus.REJECTED,
        adminNote,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      })
      .where('id = :id AND status = :pending', {
        id: withdrawalId,
        pending: WithdrawalStatus.PENDING,
      })
      .execute();

    if (result.affected === 0) {
      const exists = await this.withdrawalRepo.findOne({
        where: { id: withdrawalId },
      });
      if (!exists) {
        throw new NotFoundException('Withdrawal not found');
      }
      throw new BadRequestException(
        `Withdrawal already ${exists.status}, cannot reject`,
      );
    }

    // 原子更新成功后再退积分，不会重复退回
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id: withdrawalId },
    });

    await this.pointsService.refundPoints({
      userId: withdrawal!.userId,
      amount: withdrawal!.amount,
      action: 'withdrawal_rejected',
      referenceType: 'withdrawal',
      referenceId: withdrawal!.id,
      description: `Withdrawal rejected: ${withdrawal!.amount} points refunded. Reason: ${adminNote}`,
    });

    this.logger.log(
      `Withdrawal rejected: id=${withdrawalId}, admin=${adminUserId}, reason=${adminNote}`,
    );

    return withdrawal!;
  }
}
