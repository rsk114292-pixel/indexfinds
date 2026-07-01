import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { User } from '../users/entities/user.entity';
import { ReferralRiskService } from './referral-risk.service';
import { PointsService } from '../points/points.service';
import { PointTransactionType } from '../points/entities/point-transaction.entity';
import type { CurrentUserReferralActivationProgress } from './referral.service';

@Injectable()
export class ReferralConversionService {
  private readonly logger = new Logger(ReferralConversionService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly codeRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralAttribution)
    private readonly attrRepo: Repository<ReferralAttribution>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly riskService: ReferralRiskService,
    private readonly pointsService: PointsService,
  ) {}

  async hasRegistrationAttribution(userId: string): Promise<boolean> {
    const attribution = await this.attrRepo.findOne({
      where: {
        userId,
        eventType: AttributionEventType.REGISTRATION,
      },
      select: {
        id: true,
      },
    });

    return !!attribution;
  }

  async checkAndFinalizeConversion(userId: string): Promise<boolean> {
    if (!userId) return false;

    const regAttribution = await this.attrRepo.findOne({
      where: {
        userId,
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
      },
    });

    if (!regAttribution) return false;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.emailVerified) return false;

    const distinctProductViews = await this.attrRepo
      .createQueryBuilder('attr')
      .select('COUNT(DISTINCT attr."eventData"->>\'productId\')', 'count')
      .where('attr.userId = :userId', { userId })
      .andWhere('attr.referralCodeId = :codeId', {
        codeId: regAttribution.referralCodeId,
      })
      .andWhere('attr.eventType = :viewType', {
        viewType: AttributionEventType.PRODUCT_VIEW,
      })
      .getRawOne<{ count: string }>();

    if (!distinctProductViews || parseInt(distinctProductViews.count, 10) < 3) {
      return false;
    }

    const hasAction = await this.attrRepo
      .createQueryBuilder('attr')
      .where('attr.userId = :userId', { userId })
      .andWhere('attr.referralCodeId = :codeId', {
        codeId: regAttribution.referralCodeId,
      })
      .andWhere('attr.eventType IN (:...types)', {
        types: [
          AttributionEventType.FAVORITE,
          AttributionEventType.PURCHASE_CLICK,
        ],
      })
      .getCount();

    if (hasAction === 0) return false;

    const riskResult = await this.riskService.checkAttributionRisk({
      userId,
      referralCodeId: regAttribution.referralCodeId,
      referralClickId: regAttribution.referralClickId,
    });

    if (riskResult.isValid) {
      const updateResult = await this.attrRepo
        .createQueryBuilder()
        .update(ReferralAttribution)
        .set({ status: AttributionStatus.VALID })
        .where('id = :id AND status = :pending', {
          id: regAttribution.id,
          pending: AttributionStatus.PENDING,
        })
        .execute();

      if (updateResult.affected === 0) {
        return false;
      }

      await this.codeRepo.increment(
        { id: regAttribution.referralCodeId },
        'totalConversions',
        1,
      );
      this.logger.log(
        `Conversion finalized for user ${userId}, code ${regAttribution.referralCodeId}`,
      );

      const updatedCode = await this.codeRepo.findOne({
        where: { id: regAttribution.referralCodeId },
      });
      if (updatedCode?.ownerId) {
        const reward = this.pointsService.calculateReferralReward(
          updatedCode.totalConversions,
        );
        await this.pointsService.addPoints({
          userId: updatedCode.ownerId,
          type: PointTransactionType.EARN,
          action: 'referral_conversion',
          amount: reward,
          referenceType: 'referral_attribution',
          referenceId: regAttribution.id,
          description: `Referral reward (#${updatedCode.totalConversions})`,
          metadata: {
            referredUserId: userId,
            tier: updatedCode.totalConversions,
          },
        });
        await this.pointsService.checkAndAwardMilestoneBonus(
          updatedCode.ownerId,
          updatedCode.totalConversions,
        );
      }

      return true;
    }

    await this.attrRepo
      .createQueryBuilder()
      .update(ReferralAttribution)
      .set({
        status: AttributionStatus.REJECTED,
        rejectReason: riskResult.reason,
      })
      .where('id = :id AND status = :pending', {
        id: regAttribution.id,
        pending: AttributionStatus.PENDING,
      })
      .execute();

    this.logger.warn(
      `Conversion rejected for user ${userId}: ${riskResult.reason}`,
    );
    return false;
  }

  async getCurrentUserActivationProgress(
    userId: string,
  ): Promise<CurrentUserReferralActivationProgress> {
    const registrationAttribution = await this.attrRepo.findOne({
      where: {
        userId,
        eventType: AttributionEventType.REGISTRATION,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!registrationAttribution) {
      return {
        isReferred: false,
        status: 'not_referred',
        progress: {
          registered: false,
          emailVerified: false,
          productViews: 0,
          requiredProductViews: 3,
          hasAction: false,
          completedSteps: 0,
          totalSteps: 4,
        },
        blockers: {
          emailVerification: false,
          remainingProductViews: 3,
          favoriteOrPurchase: false,
        },
      };
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'emailVerified'],
    });

    const distinctProductViews = await this.attrRepo
      .createQueryBuilder('attr')
      .select('COUNT(DISTINCT attr."eventData"->>\'productId\')', 'count')
      .where('attr.userId = :userId', { userId })
      .andWhere('attr.referralCodeId = :codeId', {
        codeId: registrationAttribution.referralCodeId,
      })
      .andWhere('attr.eventType = :viewType', {
        viewType: AttributionEventType.PRODUCT_VIEW,
      })
      .getRawOne<{ count: string }>();

    const actionCount = await this.attrRepo
      .createQueryBuilder('attr')
      .where('attr.userId = :userId', { userId })
      .andWhere('attr.referralCodeId = :codeId', {
        codeId: registrationAttribution.referralCodeId,
      })
      .andWhere('attr.eventType IN (:...types)', {
        types: [
          AttributionEventType.FAVORITE,
          AttributionEventType.PURCHASE_CLICK,
        ],
      })
      .getCount();

    const emailVerified = !!user?.emailVerified;
    const productViews = parseInt(distinctProductViews?.count ?? '0', 10) || 0;
    const hasAction = actionCount > 0;
    const productViewsReady = productViews >= 3;
    const readyForSettlement = emailVerified && productViewsReady && hasAction;
    const completedSteps = [
      true,
      emailVerified,
      productViewsReady,
      hasAction,
    ].filter(Boolean).length;

    let status: CurrentUserReferralActivationProgress['status'] = 'in_progress';
    if (registrationAttribution.status === AttributionStatus.VALID) {
      status = 'completed';
    } else if (registrationAttribution.status === AttributionStatus.REJECTED) {
      status = 'rejected';
    } else if (readyForSettlement) {
      status = 'ready';
    }

    return {
      isReferred: true,
      status,
      progress: {
        registered: true,
        emailVerified,
        productViews,
        requiredProductViews: 3,
        hasAction,
        completedSteps,
        totalSteps: 4,
      },
      blockers: {
        emailVerification: !emailVerified,
        remainingProductViews: Math.max(0, 3 - productViews),
        favoriteOrPurchase: !hasAction,
      },
    };
  }
}
