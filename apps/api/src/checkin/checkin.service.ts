import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCheckin } from './entities/user-checkin.entity';
import { PointsService } from '../points/points.service';
import { PointTransactionType } from '../points/entities/point-transaction.entity';
import { DAILY_REWARDS } from '../points/points.constants';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectRepository(UserCheckin)
    private readonly checkinRepo: Repository<UserCheckin>,
    private readonly pointsService: PointsService,
  ) {}

  async doCheckin(userId: string): Promise<{
    success: boolean;
    pointsEarned: number;
    streakCount: number;
    alreadyCheckedIn?: boolean;
  }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 检查今天是否已签到
    const existing = await this.checkinRepo.findOne({
      where: { userId, checkinDate: today },
    });
    if (existing) {
      return {
        success: true,
        pointsEarned: 0,
        streakCount: existing.streakCount,
        alreadyCheckedIn: true,
      };
    }

    // 计算连续天数：查昨天的签到记录
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const lastCheckin = await this.checkinRepo.findOne({
      where: { userId, checkinDate: yesterdayStr },
    });
    const streakCount = lastCheckin ? lastCheckin.streakCount + 1 : 1;

    // 确定积分：连续第 30 / 7 天给阶段奖励（替代基础 1 分，不叠加）
    const pointsEarned =
      streakCount % 30 === 0
        ? DAILY_REWARDS.CHECKIN_STREAK_30
        : streakCount % 7 === 0
          ? DAILY_REWARDS.CHECKIN_STREAK_7
          : DAILY_REWARDS.CHECKIN;

    // 保存签到记录
    const checkin = this.checkinRepo.create({
      userId,
      checkinDate: today,
      streakCount,
      pointsEarned,
    });
    try {
      await this.checkinRepo.save(checkin);
    } catch (err: any) {
      // 并发签到时唯一索引冲突
      if (err.code === '23505') {
        return {
          success: true,
          pointsEarned: 0,
          streakCount,
          alreadyCheckedIn: true,
        };
      }
      throw err;
    }

    // 发放积分
    await this.pointsService.addPoints({
      userId,
      type: PointTransactionType.EARN,
      action: 'daily_checkin',
      amount: pointsEarned,
      referenceType: 'checkin',
      referenceId: checkin.id,
      description:
        streakCount % 30 === 0
          ? `Day ${streakCount} streak milestone`
          : streakCount % 7 === 0
            ? `Day ${streakCount} streak bonus`
            : 'Daily check-in',
    });

    this.logger.log(
      `Checkin success: userId=${userId}, streak=${streakCount}, points=${pointsEarned}`,
    );

    return { success: true, pointsEarned, streakCount };
  }

  async getCheckinStatus(userId: string): Promise<{
    checkedInToday: boolean;
    streakCount: number;
    monthlyCheckins: string[];
  }> {
    // 今天签到状态
    const today = new Date().toISOString().split('T')[0];
    const todayCheckin = await this.checkinRepo.findOne({
      where: { userId, checkinDate: today },
    });

    // 当月签到日期列表
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthlyCheckins = await this.checkinRepo
      .createQueryBuilder('c')
      .select('c.checkinDate')
      .where('c.userId = :userId', { userId })
      .andWhere('c.checkinDate >= :start', {
        start: startOfMonth.toISOString().split('T')[0],
      })
      .orderBy('c.checkinDate', 'ASC')
      .getMany();

    return {
      checkedInToday: !!todayCheckin,
      streakCount: todayCheckin?.streakCount || 0,
      monthlyCheckins: monthlyCheckins.map(
        (c) => c.checkinDate as unknown as string,
      ),
    };
  }
}
