import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';
import type { ProductCTR } from './dto/search-analytics.types';

@Injectable()
export class SearchCTRService {
  private readonly logger = new Logger(SearchCTRService.name);

  private readonly POSITION_BIAS = [
    1.0, 0.7, 0.5, 0.35, 0.25, 0.18, 0.13, 0.1, 0.08, 0.06,
  ];

  constructor(
    @InjectRepository(SearchImpression)
    private readonly impressionRepository: Repository<SearchImpression>,
    @InjectRepository(SearchClick)
    private readonly clickRepository: Repository<SearchClick>,
  ) {}

  async getProductCTR(
    productId: string,
    days: number = 30,
  ): Promise<ProductCTR | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const impressionStats = await this.impressionRepository
      .createQueryBuilder('i')
      .select('COUNT(*)', 'impressions')
      .addSelect('AVG(i.position)', 'avgPosition')
      .where('i.productId = :productId', { productId })
      .andWhere('i.createdAt >= :startDate', { startDate })
      .getRawOne();

    const clickStats = await this.clickRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'clicks')
      .where('c.productId = :productId', { productId })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .getRawOne();

    const impressions = parseInt(impressionStats?.impressions || '0');
    const clicks = parseInt(clickStats?.clicks || '0');
    const avgPosition = parseFloat(impressionStats?.avgPosition || '0');

    if (impressions === 0) return null;

    const ctr = clicks / impressions;
    const adjustedCtr = this.calculateAdjustedCTR(ctr, avgPosition);

    return { productId, impressions, clicks, ctr, avgPosition, adjustedCtr };
  }

  async batchGetProductCTR(
    productIds: string[],
    days: number = 30,
  ): Promise<Map<string, ProductCTR>> {
    if (!productIds.length) return new Map();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const impressionStats = await this.impressionRepository
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('COUNT(*)', 'impressions')
      .addSelect('AVG(i.position)', 'avgPosition')
      .where('i.productId IN (:...productIds)', { productIds })
      .andWhere('i.createdAt >= :startDate', { startDate })
      .groupBy('i.productId')
      .getRawMany();

    const clickStats = await this.clickRepository
      .createQueryBuilder('c')
      .select('c.productId', 'productId')
      .addSelect('COUNT(*)', 'clicks')
      .where('c.productId IN (:...productIds)', { productIds })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .groupBy('c.productId')
      .getRawMany();

    const impressionMap = new Map(
      impressionStats.map((r) => [
        r.productId,
        {
          impressions: parseInt(r.impressions),
          avgPosition: parseFloat(r.avgPosition),
        },
      ]),
    );
    const clickMap = new Map(
      clickStats.map((r) => [r.productId, parseInt(r.clicks)]),
    );

    const result = new Map<string, ProductCTR>();

    for (const productId of productIds) {
      const impression = impressionMap.get(productId);
      const clicks = clickMap.get(productId) || 0;

      if (impression && impression.impressions > 0) {
        const ctr = clicks / impression.impressions;
        const adjustedCtr = this.calculateAdjustedCTR(
          ctr,
          impression.avgPosition,
        );

        result.set(productId, {
          productId,
          impressions: impression.impressions,
          clicks,
          ctr,
          avgPosition: impression.avgPosition,
          adjustedCtr,
        });
      }
    }

    return result;
  }

  async getQueryProductCTR(
    query: string,
    productId: string,
    days: number = 30,
  ): Promise<ProductCTR | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    const impressionStats = await this.impressionRepository
      .createQueryBuilder('i')
      .innerJoin('i.searchLog', 'sl')
      .select('COUNT(*)', 'impressions')
      .addSelect('AVG(i.position)', 'avgPosition')
      .where('i.productId = :productId', { productId })
      .andWhere('sl.normalizedKeyword = :query', { query: normalizedQuery })
      .andWhere('i.createdAt >= :startDate', { startDate })
      .getRawOne();

    const clickStats = await this.clickRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'clicks')
      .where('c.productId = :productId', { productId })
      .andWhere('LOWER(c.query) = :query', { query: normalizedQuery })
      .andWhere('c.createdAt >= :startDate', { startDate })
      .getRawOne();

    const impressions = parseInt(impressionStats?.impressions || '0');
    const clicks = parseInt(clickStats?.clicks || '0');
    const avgPosition = parseFloat(impressionStats?.avgPosition || '0');

    if (impressions === 0) return null;

    const ctr = clicks / impressions;
    const adjustedCtr = this.calculateAdjustedCTR(ctr, avgPosition);

    return { productId, impressions, clicks, ctr, avgPosition, adjustedCtr };
  }

  calculateAdjustedCTR(rawCtr: number, avgPosition: number): number {
    const posIndex = Math.min(
      Math.floor(avgPosition),
      this.POSITION_BIAS.length - 1,
    );
    const positionBias = this.POSITION_BIAS[posIndex];
    return rawCtr / (positionBias * 0.3);
  }
}
