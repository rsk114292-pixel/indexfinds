import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import {
  ReferralExperimentEvent,
  ReferralExperimentEventType,
} from './entities/referral-experiment-event.entity';
import { TrackReferralExperimentDto } from './dto/track-referral-experiment.dto';

const REFERRAL_REWARDS_EXPERIMENT_KEY = 'referral_rewards_v1';

@Injectable()
export class ReferralExperimentService {
  constructor(
    @InjectRepository(ReferralAttribution)
    private readonly attrRepo: Repository<ReferralAttribution>,
    @InjectRepository(ReferralExperimentEvent)
    private readonly experimentEventRepo: Repository<ReferralExperimentEvent>,
  ) {}

  private getExperimentVariant(userId: string): 'control' | 'rewards_push' {
    const key = `${REFERRAL_REWARDS_EXPERIMENT_KEY}:${userId}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return hash % 2 === 0 ? 'control' : 'rewards_push';
  }

  getExperimentAssignment(userId: string) {
    return {
      experimentKey: REFERRAL_REWARDS_EXPERIMENT_KEY,
      variantId: this.getExperimentVariant(userId),
    };
  }

  async trackExperimentEvent(userId: string, dto: TrackReferralExperimentDto) {
    const assignment = this.getExperimentAssignment(userId);
    const metadata: Record<string, unknown> = {};
    if (dto.placement) metadata.placement = dto.placement;
    if (dto.channelId) metadata.channelId = dto.channelId;

    const event = this.experimentEventRepo.create({
      experimentKey: assignment.experimentKey,
      userId,
      variantId: assignment.variantId,
      eventType: dto.eventType,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });
    await this.experimentEventRepo.save(event);
  }

  async getReferralExperimentMetrics(startDate: Date, endDate: Date) {
    const experimentKey = REFERRAL_REWARDS_EXPERIMENT_KEY;
    const variants = ['control', 'rewards_push'] as const;

    const registrations = await this.attrRepo
      .createQueryBuilder('attr')
      .innerJoin('referral_codes', 'code', 'code.id = attr.referralCodeId')
      .where('attr.eventType = :eventType', {
        eventType: AttributionEventType.REGISTRATION,
      })
      .andWhere('attr.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .select(['code.ownerId AS "ownerId"', 'attr.status AS status'])
      .getRawMany<{ ownerId: string; status: AttributionStatus }>();

    const eventRows = await this.experimentEventRepo
      .createQueryBuilder('event')
      .where('event.experimentKey = :experimentKey', { experimentKey })
      .andWhere('event.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .select([
        'event.variantId AS "variantId"',
        'event.eventType AS "eventType"',
        'COUNT(*) AS count',
      ])
      .groupBy('event.variantId')
      .addGroupBy('event.eventType')
      .getRawMany<{ variantId: string; eventType: string; count: string }>();

    const metrics = variants.map((variantId) => {
      const exposures = eventRows
        .filter(
          (row) =>
            row.variantId === variantId &&
            (row.eventType === ReferralExperimentEventType.MODAL_EXPOSURE ||
              row.eventType === ReferralExperimentEventType.HUB_EXPOSURE),
        )
        .reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);
      const copies = eventRows
        .filter(
          (row) =>
            row.variantId === variantId &&
            row.eventType === ReferralExperimentEventType.COPY_LINK,
        )
        .reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);
      const shares = eventRows
        .filter(
          (row) =>
            row.variantId === variantId &&
            row.eventType === ReferralExperimentEventType.SHARE_INVITE,
        )
        .reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);

      const ownedRegistrations = registrations.filter(
        (row) => this.getExperimentVariant(row.ownerId) === variantId,
      );
      const validConversions = ownedRegistrations.filter(
        (row) => row.status === AttributionStatus.VALID,
      ).length;

      return {
        variantId,
        exposures,
        copies,
        shares,
        validConversions,
        copyRate: exposures > 0 ? copies / exposures : 0,
        shareRate: exposures > 0 ? shares / exposures : 0,
        conversionRate: exposures > 0 ? validConversions / exposures : 0,
      };
    });

    return {
      experimentKey,
      metrics,
    };
  }
}
