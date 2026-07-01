import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CategoriesService } from '../categories/categories.service';
import {
  COMPLEMENT_MAP,
  FALLBACK_COMPLEMENTS,
} from './category-complement.config';

@Injectable()
export class CompleteTheLookService {
  private readonly logger = new Logger(CompleteTheLookService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * 搭配推荐：查找互补品类的商品
   */
  async findComplements(productId: string, limit = 12): Promise<Product[]> {
    const source = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });

    this.logger.debug(
      `CTL: findComplements called for ${productId}, source=${!!source}, status=${source?.status}, hasCat=${!!source?.primaryCategory}, catSlug=${source?.primaryCategory?.slug}`,
    );
    if (!source || source.status !== 'active' || !source.primaryCategory) {
      this.logger.debug(
        `CTL: skipped - source missing or inactive, hasCategory=${!!source?.primaryCategory}`,
      );
      return [];
    }

    try {
      // 查找互补品类 slugs
      const complementSlugs = await this.getComplementSlugs(
        source.primaryCategory,
      );
      this.logger.debug(
        `CTL: primaryCategory=${source.primaryCategory.slug}, complementSlugs=${JSON.stringify(complementSlugs)}`,
      );

      if (complementSlugs.length === 0) {
        return [];
      }

      // 解析互补品类 slug → category ids（含子孙）
      const complementCategoryMap =
        await this.resolveComplementCategories(complementSlugs);
      this.logger.debug(
        `CTL: resolved ${complementCategoryMap.size} complement categories`,
      );
      for (const [slug, ids] of complementCategoryMap) {
        this.logger.debug(`CTL:   ${slug} -> ${ids.length} category IDs`);
      }

      if (complementCategoryMap.size === 0) {
        return [];
      }

      const sourceGender = (source.aiAttributes as any)?.gender || null;
      const sourceStyles: string[] = (source.aiAttributes as any)?.styles || [];
      this.logger.debug(
        `CTL: sourceGender=${sourceGender}, sourceBrand=${source.brandId}, sourceStyles=${JSON.stringify(sourceStyles)}`,
      );
      const results: Product[] = [];
      const usedIds = new Set<string>();

      // 每个互补品类查 4 个候选，取 top 2（去重）
      for (const [slug, categoryIds] of complementCategoryMap) {
        if (results.length >= limit) break;

        const candidates = await this.queryCandidates(
          source,
          categoryIds,
          sourceGender,
        );
        this.logger.debug(
          `CTL: queryCandidates for ${slug} (${categoryIds.length} catIds) → ${candidates.length} candidates`,
        );

        // 按 style jaccard + brand bonus 排序
        const ranked = this.rankCandidates(
          candidates,
          source.brandId,
          sourceStyles,
        );

        // 取 top 2（跳过已选商品）
        let added = 0;
        for (const product of ranked) {
          if (added >= 2) break;
          if (usedIds.has(product.id)) continue;
          usedIds.add(product.id);
          results.push(product);
          added++;
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Failed to find complements for ${productId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 获取互补品类 slugs，支持祖先分类回退
   */
  private async getComplementSlugs(
    primaryCategory: Category,
  ): Promise<string[]> {
    // 直接匹配
    const slugs = COMPLEMENT_MAP[primaryCategory.slug];
    if (slugs) return slugs;

    // 往上查祖先分类
    try {
      const ancestors = await this.categoriesService.findAncestors(
        primaryCategory.id,
      );
      // ancestors 从叶到根，跳过自身
      for (const ancestor of ancestors) {
        if (ancestor.id === primaryCategory.id) continue;
        const ancestorSlugs = COMPLEMENT_MAP[ancestor.slug];
        if (ancestorSlugs) return ancestorSlugs;
      }
    } catch {
      // findAncestors 失败时忽略
    }

    // 所有祖先都没匹配，使用通用 fallback（排除自身品类）
    this.logger.debug(
      `CTL: no match for ${primaryCategory.slug}, using fallback`,
    );
    return FALLBACK_COMPLEMENTS.filter((s) => s !== primaryCategory.slug);
  }

  /**
   * 将互补品类 slugs 解析为 category IDs（含子孙分类）
   */
  private async resolveComplementCategories(
    slugs: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    for (const slug of slugs) {
      try {
        const category = await this.categoriesService.findBySlug(slug);
        if (!category) continue;

        // 获取该分类及其所有子孙
        const descendants = await this.categoriesService.findDescendants(
          category.id,
        );
        const ids = descendants.map((d) => d.id);

        if (ids.length > 0) {
          result.set(slug, ids);
        }
      } catch {
        // slug 不存在则跳过
      }
    }

    return result;
  }

  /**
   * 查询互补品类候选商品
   */
  private async queryCandidates(
    source: Product,
    categoryIds: string[],
    sourceGender: string | null,
  ): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.primaryCategory', 'primaryCategory')
      .leftJoinAndSelect('p.secondaryCategories', 'secondaryCategories')
      .where('p.status = :status', { status: 'active' })
      .andWhere('p.primaryCategoryId IN (:...categoryIds)', { categoryIds })
      .andWhere('p.id != :currentId', { currentId: source.id });

    // Gender 过滤
    if (sourceGender) {
      qb.andWhere(
        `(p."aiAttributes"::jsonb->>'gender' IS NULL
          OR p."aiAttributes"::jsonb->>'gender' = :gender
          OR p."aiAttributes"::jsonb->>'gender' = 'Unisex')`,
        { gender: sourceGender },
      );
    }

    // 同品牌优先 + 热度排序
    qb.addSelect(
      `CASE WHEN p."brandId" = :sourceBrandId THEN 1 ELSE 0 END`,
      'brand_priority',
    );
    qb.setParameter('sourceBrandId', source.brandId || '');
    qb.orderBy('brand_priority', 'DESC');
    qb.addOrderBy('p.viewCount', 'DESC');
    qb.take(4);

    return qb.getMany();
  }

  /**
   * 按 style jaccard + brand bonus 排序
   */
  private rankCandidates(
    candidates: Product[],
    sourceBrandId: string | null,
    sourceStyles: string[],
  ): Product[] {
    const scored = candidates.map((product) => {
      const candidateStyles: string[] =
        (product.aiAttributes as any)?.styles || [];
      const styleScore = this.jaccard(sourceStyles, candidateStyles);
      const brandBonus =
        sourceBrandId && product.brandId === sourceBrandId ? 0.2 : 0;
      return { product, score: styleScore + brandBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.product);
  }

  private jaccard(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 0;
    const setA = new Set(a.map((s) => s.toLowerCase()));
    const setB = new Set(b.map((s) => s.toLowerCase()));
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }
}
