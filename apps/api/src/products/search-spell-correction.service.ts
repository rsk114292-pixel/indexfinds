import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Product } from './entities/product.entity';
import { FullTextSearchService } from '../search/full-text-search.service';
import { KeywordAnalysisService } from '../search/keyword-analysis.service';
import type { SpellCorrectionResult } from './dto/search-enhancer.types';

@Injectable()
export class SearchSpellCorrectionService {
  private readonly logger = new Logger(SearchSpellCorrectionService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly fullTextSearchService: FullTextSearchService,
    private readonly keywordAnalysisService: KeywordAnalysisService,
  ) {}

  async trySpellCorrection(
    effectiveSearch: string,
    sortBy: string,
    sortConfig: Record<string, { field: string; order: 'ASC' | 'DESC' }>,
    skip: number,
    limit: number,
  ): Promise<SpellCorrectionResult | null> {
    try {
      const correction =
        await this.fullTextSearchService.correctQuery(effectiveSearch);

      if (!correction.wasChanged) {
        return null;
      }

      this.logger.log(
        `拼写纠正: "${effectiveSearch}" → "${correction.corrected}"`,
      );
      const correctedQuery = correction.corrected;

      const correctedAnalysis =
        await this.keywordAnalysisService.analyzeAsync(correctedQuery);

      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
        .leftJoinAndSelect('product.secondaryCategories', 'secondaryCategories')
        .where('product.status = :status', { status: 'active' });

      const hasKeywords = correctedAnalysis.keywords.length > 0;
      const hasBrands =
        correctedAnalysis.brands && correctedAnalysis.brands.length > 0;
      const hasCategories =
        correctedAnalysis.categories && correctedAnalysis.categories.length > 0;
      const hasGenders =
        correctedAnalysis.genders && correctedAnalysis.genders.length > 0;

      if (hasKeywords) {
        const keywordSearch = correctedAnalysis.keywords.join(' ');
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where('product.title ILIKE :corrSearch', {
              corrSearch: `%${keywordSearch}%`,
            }).orWhere('product.description ILIKE :corrSearch', {
              corrSearch: `%${keywordSearch}%`,
            });
          }),
        );
      }

      if (hasBrands) {
        queryBuilder.andWhere('brand.slug IN (:...corrBrandSlugs)', {
          corrBrandSlugs: correctedAnalysis.brands,
        });
      }

      if (hasCategories) {
        queryBuilder.andWhere(
          '(primaryCategory.slug IN (:...corrCategorySlugs) OR secondaryCategories.slug IN (:...corrCategorySlugs))',
          { corrCategorySlugs: correctedAnalysis.categories },
        );
      }

      if (hasGenders) {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            correctedAnalysis.genders.forEach((g, index) => {
              const paramName = `corrGender${index}`;
              if (index === 0) {
                qb.where(
                  `LOWER(product."aiAttributes"::jsonb->>'gender') = LOWER(:${paramName})`,
                  { [paramName]: g },
                );
              } else {
                qb.orWhere(
                  `LOWER(product."aiAttributes"::jsonb->>'gender') = LOWER(:${paramName})`,
                  { [paramName]: g },
                );
              }
            });
            qb.orWhere(
              `LOWER(product."aiAttributes"::jsonb->>'gender') = 'unisex'`,
            );
          }),
        );
      }

      let correctedSortBy = sortBy;
      let intentSortApplied = false;
      const correctedIsDefaultSort =
        sortBy === 'createdAt' ||
        sortBy === 'relevance' ||
        sortBy === 'popular';

      if (correctedAnalysis.intent && correctedIsDefaultSort) {
        const { priceIntent, timeIntent } = correctedAnalysis.intent;
        if (priceIntent === 'budget') {
          correctedSortBy = 'price_asc';
          intentSortApplied = true;
        } else if (priceIntent === 'luxury') {
          correctedSortBy = 'price_desc';
          intentSortApplied = true;
        } else if (timeIntent === 'new') {
          correctedSortBy = 'newest';
          intentSortApplied = true;
        } else if (timeIntent === 'trending') {
          correctedSortBy = 'popular';
          intentSortApplied = true;
        }
      }

      const correctedSortConfig = sortConfig[correctedSortBy] || {
        field: 'createdAt',
        order: 'DESC',
      };
      queryBuilder.orderBy(
        `product.${correctedSortConfig.field}`,
        correctedSortConfig.order,
      );

      queryBuilder.skip(skip).take(limit);
      const [data, total] = await queryBuilder.getManyAndCount();

      this.logger.log(`纠正后搜索 "${correctedQuery}" 找到 ${total} 个结果`);

      return {
        data,
        total,
        correctedQuery,
        wasChanged: true,
        intentSortApplied,
      };
    } catch (error) {
      this.logger.warn(`拼写纠正失败: ${error.message}`);
      return null;
    }
  }
}
