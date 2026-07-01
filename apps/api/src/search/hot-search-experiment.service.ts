import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HotSearchExperiment,
  ExperimentStatus,
  ExperimentVariant,
} from './entities/hot-search-experiment.entity';
import {
  HotSearchExperimentEvent,
  ExperimentEventType,
} from './entities/hot-search-experiment-event.entity';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';

@Injectable()
export class HotSearchExperimentService {
  constructor(
    @InjectRepository(HotSearchExperiment)
    private readonly experimentRepository: Repository<HotSearchExperiment>,
    @InjectRepository(HotSearchExperimentEvent)
    private readonly eventRepository: Repository<HotSearchExperimentEvent>,
    private readonly analyticsDedupService: AnalyticsDedupService,
  ) {}

  async findAll(): Promise<HotSearchExperiment[]> {
    return this.experimentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<HotSearchExperiment> {
    const experiment = await this.experimentRepository.findOne({
      where: { id },
    });
    if (!experiment) {
      throw new NotFoundException(`实验不存在: ${id}`);
    }
    return experiment;
  }

  async create(data: {
    name: string;
    description?: string;
    variants: ExperimentVariant[];
    startAt?: string;
    endAt?: string;
  }): Promise<HotSearchExperiment> {
    this.validateVariants(data.variants);

    const experiment = this.experimentRepository.create({
      name: data.name,
      description: data.description || null,
      variants: data.variants,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    });

    return this.experimentRepository.save(experiment);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      variants?: ExperimentVariant[];
      startAt?: string | null;
      endAt?: string | null;
    },
  ): Promise<HotSearchExperiment> {
    const experiment = await this.findOne(id);

    if (experiment.status === ExperimentStatus.RUNNING && data.variants) {
      throw new BadRequestException('运行中的实验不能修改变体配置');
    }

    if (data.variants) {
      this.validateVariants(data.variants);
    }

    if (data.name !== undefined) experiment.name = data.name;
    if (data.description !== undefined)
      experiment.description = data.description || null;
    if (data.variants !== undefined) experiment.variants = data.variants;
    if (data.startAt !== undefined)
      experiment.startAt = data.startAt ? new Date(data.startAt) : null;
    if (data.endAt !== undefined)
      experiment.endAt = data.endAt ? new Date(data.endAt) : null;

    return this.experimentRepository.save(experiment);
  }

  async start(id: string): Promise<HotSearchExperiment> {
    const experiment = await this.findOne(id);
    if (
      experiment.status !== ExperimentStatus.DRAFT &&
      experiment.status !== ExperimentStatus.PAUSED
    ) {
      throw new BadRequestException(
        `实验状态为 ${experiment.status}，无法启动`,
      );
    }
    if (!experiment.variants || experiment.variants.length < 2) {
      throw new BadRequestException('实验至少需要 2 个变体');
    }
    experiment.status = ExperimentStatus.RUNNING;
    return this.experimentRepository.save(experiment);
  }

  async pause(id: string): Promise<HotSearchExperiment> {
    const experiment = await this.findOne(id);
    if (experiment.status !== ExperimentStatus.RUNNING) {
      throw new BadRequestException('只能暂停运行中的实验');
    }
    experiment.status = ExperimentStatus.PAUSED;
    return this.experimentRepository.save(experiment);
  }

  async complete(id: string): Promise<HotSearchExperiment> {
    const experiment = await this.findOne(id);
    if (
      experiment.status !== ExperimentStatus.RUNNING &&
      experiment.status !== ExperimentStatus.PAUSED
    ) {
      throw new BadRequestException('只能结束运行中或暂停的实验');
    }
    experiment.status = ExperimentStatus.COMPLETED;
    return this.experimentRepository.save(experiment);
  }

  /**
   * 根据 sessionId 确定性分配变体
   * 使用 hash 确保同一用户每次看到相同变体
   */
  assignVariant(
    experiment: HotSearchExperiment,
    sessionId: string,
  ): ExperimentVariant | null {
    if (
      experiment.status !== ExperimentStatus.RUNNING ||
      !experiment.variants?.length
    ) {
      return null;
    }

    const totalWeight = experiment.variants.reduce(
      (sum, v) => sum + v.weight,
      0,
    );
    if (totalWeight <= 0) return null;

    const hash = this.hashCode(sessionId);
    const bucket = Math.abs(hash) % totalWeight;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    return experiment.variants[experiment.variants.length - 1];
  }

  async trackEvent(data: {
    experimentId: string;
    variantId: string;
    eventType: ExperimentEventType;
    keyword?: string;
    context: AnalyticsRequestContext;
  }): Promise<void> {
    const dedupWindowMs =
      data.eventType === ExperimentEventType.SEARCH ? 30_000 : 5 * 60 * 1000;
    const shouldRecord = await this.analyticsDedupService.claim({
      scope: `hot_search_experiment_${data.eventType}`,
      windowMs: dedupWindowMs,
      parts: [
        data.context.trustedVisitorId,
        data.experimentId,
        data.variantId,
        data.eventType,
        data.keyword || '',
      ],
    });
    if (!shouldRecord) {
      return;
    }

    const event = this.eventRepository.create({
      experimentId: data.experimentId,
      variantId: data.variantId,
      eventType: data.eventType,
      keyword: data.keyword || null,
      sessionId: data.context.trustedVisitorId || null,
      userId: data.context.userId || null,
    });
    await this.eventRepository.save(event);
  }

  async getResults(experimentId: string): Promise<{
    experiment: HotSearchExperiment;
    results: {
      variantId: string;
      variantName: string;
      impressions: number;
      clicks: number;
      searches: number;
      ctr: number;
    }[];
  }> {
    const experiment = await this.findOne(experimentId);

    const rawResults = await this.eventRepository
      .createQueryBuilder('e')
      .select('e.variant_id', 'variantId')
      .addSelect('e.event_type', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('e.experiment_id = :experimentId', { experimentId })
      .groupBy('e.variant_id')
      .addGroupBy('e.event_type')
      .getRawMany<{
        variantId: string;
        eventType: string;
        count: string;
      }>();

    // 按变体聚合
    const variantMap = new Map<
      string,
      { impressions: number; clicks: number; searches: number }
    >();

    for (const variant of experiment.variants) {
      variantMap.set(variant.id, {
        impressions: 0,
        clicks: 0,
        searches: 0,
      });
    }

    for (const row of rawResults) {
      const stats = variantMap.get(row.variantId);
      if (!stats) continue;
      const count = parseInt(row.count, 10);
      if (row.eventType === 'impression') stats.impressions = count;
      else if (row.eventType === 'click') stats.clicks = count;
      else if (row.eventType === 'search') stats.searches = count;
    }

    const results = experiment.variants.map((variant) => {
      const stats = variantMap.get(variant.id) || {
        impressions: 0,
        clicks: 0,
        searches: 0,
      };
      return {
        variantId: variant.id,
        variantName: variant.name,
        impressions: stats.impressions,
        clicks: stats.clicks,
        searches: stats.searches,
        ctr:
          stats.impressions > 0
            ? Math.round((stats.clicks / stats.impressions) * 10000) / 100
            : 0,
      };
    });

    return { experiment, results };
  }

  private validateVariants(variants: ExperimentVariant[]): void {
    if (!variants || variants.length < 2) {
      throw new BadRequestException('至少需要 2 个变体');
    }
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight <= 0) {
      throw new BadRequestException('变体权重总和必须大于 0');
    }
    const ids = new Set(variants.map((v) => v.id));
    if (ids.size !== variants.length) {
      throw new BadRequestException('变体 ID 不能重复');
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
