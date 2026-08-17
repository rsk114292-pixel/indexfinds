import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/product-status';
import { Brand } from './entities/brand.entity';
import { BrandAlias } from './entities/brand-alias.entity';
import { BrandCandidate } from './entities/brand-candidate.entity';
import { BrandCandidateItem } from './entities/brand-candidate-item.entity';
import { BrandRelation } from './entities/brand-relation.entity';
import { ProductBrandFact } from './entities/product-brand-fact.entity';
import { QueryBrandCandidateDto } from './dto/query-brand-candidate.dto';
import { ResolveBrandCandidateDto } from './dto/resolve-brand-candidate.dto';
import { BrandMatchService } from './brand-match.service';
import { getProductPublicationIssues } from '../products/product-publication-quality';

export interface SyncProductBrandDecisionInput {
  productId: string;
  rawBrandName?: string | null;
  matchedBrandId?: string | null;
  matchConfidence?: number | null;
  matchMethod?: string;
  resolverType?: string | null;
  resolverId?: string | null;
}

export interface CandidateSignalBucket {
  label: string;
  count: number;
}

export interface BrandCandidateEvidenceProduct {
  id: string;
  title: string;
  slug: string;
  status: string;
  mainImage: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  aiBrandName: string | null;
  brandConfidence: number | null;
  weidianShopName: string | null;
  sourceUrl: string | null;
  primaryCategory: {
    id: string | null;
    name: string | null;
    slug: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
    slug: string;
  } | null;
  matchConfidence: number | null;
  candidateItemCreatedAt: Date;
}

export interface BrandCandidateReviewDetail extends BrandCandidate {
  averageMatchConfidence: number | null;
  topCategories: CandidateSignalBucket[];
  topShops: CandidateSignalBucket[];
  riskFlags: string[];
  sampleProducts: BrandCandidateEvidenceProduct[];
}

@Injectable()
export class BrandGovernanceService {
  private readonly logger = new Logger(BrandGovernanceService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(BrandAlias)
    private readonly brandAliasRepository: Repository<BrandAlias>,
    @InjectRepository(BrandCandidate)
    private readonly brandCandidateRepository: Repository<BrandCandidate>,
    @InjectRepository(BrandCandidateItem)
    private readonly brandCandidateItemRepository: Repository<BrandCandidateItem>,
    @InjectRepository(BrandRelation)
    private readonly brandRelationRepository: Repository<BrandRelation>,
    @InjectRepository(ProductBrandFact)
    private readonly productBrandFactRepository: Repository<ProductBrandFact>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly brandMatchService: BrandMatchService,
  ) {}

  normalizeBrandName(name?: string | null): string {
    return (name || '').trim().replace(/\s+/g, ' ');
  }

  generateCandidateKey(name?: string | null): string {
    return this.normalizeBrandName(name)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
  }

  async syncProductBrandDecision(
    input: SyncProductBrandDecisionInput,
  ): Promise<void> {
    const normalizedBrandName = this.normalizeBrandName(input.rawBrandName);
    const candidateKey = this.generateCandidateKey(normalizedBrandName);
    const candidate =
      candidateKey.length > 0
        ? await this.brandCandidateRepository.findOne({
            where: { candidateKey },
          })
        : null;

    if (candidate) {
      await this.attachCandidateToProduct(candidate, input.productId, {
        rawBrandName: normalizedBrandName,
        matchConfidence: input.matchConfidence ?? null,
      });
    }

    const existingFact = await this.productBrandFactRepository.findOne({
      where: { productId: input.productId },
    });

    const fact = existingFact
      ? existingFact
      : this.productBrandFactRepository.create({
          productId: input.productId,
        });

    fact.rawBrandName = normalizedBrandName || 'Unknown';
    fact.normalizedBrandName = normalizedBrandName || 'Unknown';
    fact.matchedBrandId = input.matchedBrandId ?? null;
    fact.candidateId = candidate?.id ?? null;
    fact.matchConfidence = input.matchConfidence ?? null;
    fact.matchMethod =
      input.matchMethod ||
      (input.matchedBrandId
        ? 'rule_match'
        : candidate?.suggestedBrandId
          ? 'soft_hint_candidate'
          : 'manual');
    fact.classification = this.resolveClassification({
      matchedBrandId: input.matchedBrandId ?? null,
      candidateReviewStatus: candidate?.reviewStatus,
      hasRawBrandName: normalizedBrandName.length > 0,
    });
    fact.reviewStatus = input.matchedBrandId ? 'auto_bound' : 'pending_review';
    fact.resolverType = input.resolverType ?? 'system';
    fact.resolverId = input.resolverId ?? null;

    await this.productBrandFactRepository.save(fact);
  }

  private async attachCandidateToProduct(
    candidate: BrandCandidate,
    productId: string,
    payload: { rawBrandName: string; matchConfidence: number | null },
  ): Promise<void> {
    const existingItem = await this.brandCandidateItemRepository.findOne({
      where: { candidateId: candidate.id, productId },
    });

    if (existingItem) {
      if (payload.matchConfidence !== null) {
        existingItem.matchConfidence = payload.matchConfidence;
        await this.brandCandidateItemRepository.save(existingItem);
      }
      return;
    }

    const item = this.brandCandidateItemRepository.create({
      candidateId: candidate.id,
      productId,
      rawBrandName: payload.rawBrandName,
      normalizedBrandName: payload.rawBrandName,
      matchConfidence: payload.matchConfidence,
    });
    await this.brandCandidateItemRepository.save(item);

    candidate.sampleProductCount += 1;
    candidate.lastSeenAt = new Date();
    await this.brandCandidateRepository.save(candidate);
  }

  private resolveClassification(params: {
    matchedBrandId: string | null;
    candidateReviewStatus?: string | null;
    hasRawBrandName: boolean;
  }): string {
    if (params.matchedBrandId) {
      return 'canonical_match';
    }

    if (params.candidateReviewStatus === 'classified_inspired') {
      return 'inspired';
    }

    if (params.candidateReviewStatus === 'classified_invalid') {
      return 'invalid';
    }

    if (!params.hasRawBrandName) {
      return 'unknown';
    }

    return 'unknown';
  }

  async listCandidates(query: QueryBrandCandidateDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const qb = this.brandCandidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.suggestedBrand', 'suggestedBrand');

    if (query.search?.trim()) {
      qb.andWhere(
        '(LOWER(candidate."rawBrandName") LIKE :search OR LOWER(candidate."normalizedBrandName") LIKE :search)',
        { search: `%${query.search.trim().toLowerCase()}%` },
      );
    }

    if (query.status) {
      qb.andWhere('candidate."reviewStatus" = :status', {
        status: query.status,
      });
    }

    qb.orderBy('candidate.hitCount', 'DESC').addOrderBy(
      'candidate.updatedAt',
      'DESC',
    );

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getCandidateDetail(id: string): Promise<BrandCandidateReviewDetail> {
    const candidate = await this.brandCandidateRepository.findOne({
      where: { id },
      relations: {
        suggestedBrand: true,
      },
    });

    if (!candidate) {
      throw new Error(`Brand candidate ${id} not found`);
    }

    const items = await this.brandCandidateItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('item.candidateId = :candidateId', { candidateId: id })
      .orderBy('item.createdAt', 'DESC')
      .getMany();

    const productItems = items.filter(
      (item): item is BrandCandidateItem & { product: Product } =>
        Boolean(item.product),
    );

    const sampleProducts: BrandCandidateEvidenceProduct[] = productItems
      .slice(0, 12)
      .map((item) => ({
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        status: item.product.status,
        mainImage: item.product.mainImage || null,
        priceMin: item.product.priceMin ?? null,
        priceMax: item.product.priceMax ?? null,
        currency: item.product.currency ?? null,
        aiBrandName: item.product.aiBrandName ?? null,
        brandConfidence: item.product.brandConfidence ?? null,
        weidianShopName: item.product.weidianShopName ?? null,
        sourceUrl: item.product.sourceUrl ?? null,
        primaryCategory: item.product.primaryCategory
          ? {
              id: item.product.primaryCategory.id,
              name: item.product.primaryCategory.name,
              slug: item.product.primaryCategory.slug,
            }
          : null,
        brand: item.product.brand
          ? {
              id: item.product.brand.id,
              name: item.product.brand.name,
              slug: item.product.brand.slug,
            }
          : null,
        matchConfidence: item.matchConfidence ?? null,
        candidateItemCreatedAt: item.createdAt,
      }));

    const averageMatchConfidence = this.calculateAverageConfidence(
      productItems.map((item) => item.matchConfidence),
    );
    const topCategories = this.buildTopBuckets(
      productItems.map(
        (item) => item.product.primaryCategory?.name || '未分类',
      ),
    );
    const topShops = this.buildTopBuckets(
      productItems.map((item) => item.product.weidianShopName || '未知店铺'),
    );
    const riskFlags = this.buildRiskFlags(candidate, productItems);

    return {
      ...candidate,
      averageMatchConfidence,
      topCategories,
      topShops,
      riskFlags,
      sampleProducts,
    };
  }

  async resolveCandidate(id: string, dto: ResolveBrandCandidateDto) {
    const candidate = await this.brandCandidateRepository.findOne({
      where: { id },
    });

    if (!candidate) {
      throw new Error(`Brand candidate ${id} not found`);
    }

    const now = new Date();
    candidate.notes = dto.notes?.trim() || candidate.notes || null;
    candidate.reviewedAt = now;
    candidate.reviewedBy = 'admin';

    if (dto.action === 'bind_existing') {
      if (!dto.brandId) {
        throw new Error('brandId is required for bind_existing');
      }

      const brand = await this.brandRepository.findOne({
        where: { id: dto.brandId },
      });
      if (!brand) {
        throw new Error(`Brand ${dto.brandId} not found`);
      }

      candidate.reviewStatus = 'approved_alias';
      candidate.suggestedBrandId = brand.id;
      await this.ensureAlias(brand.id, candidate.rawBrandName);
      const syncSummary = await this.syncCandidateProductsToBrand(
        candidate.id,
        brand.id,
      );
      await this.syncFactsForCandidate(candidate.id, {
        matchedBrandId: brand.id,
        classification: 'alias_match',
      });
      await this.brandCandidateRepository.save(candidate);

      return {
        success: true,
        action: dto.action,
        candidateId: candidate.id,
        brandId: brand.id,
        updatedProducts: syncSummary.updatedProducts,
        activatedProducts: syncSummary.activatedProducts,
      };
    }

    if (dto.action === 'create_child') {
      if (!dto.parentBrandId) {
        throw new Error('parentBrandId is required for create_child');
      }

      const parentBrand = await this.brandRepository.findOne({
        where: { id: dto.parentBrandId },
      });
      if (!parentBrand) {
        throw new Error(`Parent brand ${dto.parentBrandId} not found`);
      }

      const childBrand = await this.createBrandFromCandidate(candidate, {
        brandName: dto.brandName,
        parentBrandId: parentBrand.id,
        brandType: 'child',
        displayMode: 'inherit_parent',
        relationType: dto.relationType || 'parent_child',
      });

      const syncSummary = await this.syncCandidateProductsToBrand(
        candidate.id,
        childBrand.id,
      );
      await this.syncFactsForCandidate(candidate.id, {
        matchedBrandId: childBrand.id,
        classification: 'child_brand',
      });

      candidate.reviewStatus = 'approved_child';
      candidate.suggestedBrandId = childBrand.id;
      await this.brandCandidateRepository.save(candidate);

      return {
        success: true,
        action: dto.action,
        candidateId: candidate.id,
        brandId: childBrand.id,
        parentBrandId: parentBrand.id,
        updatedProducts: syncSummary.updatedProducts,
        activatedProducts: syncSummary.activatedProducts,
      };
    }

    if (dto.action === 'create_canonical') {
      const canonicalBrand = await this.createBrandFromCandidate(candidate, {
        brandName: dto.brandName,
        brandType: 'canonical',
        displayMode: 'independent',
      });

      const syncSummary = await this.syncCandidateProductsToBrand(
        candidate.id,
        canonicalBrand.id,
      );
      await this.syncFactsForCandidate(candidate.id, {
        matchedBrandId: canonicalBrand.id,
        classification: 'canonical_created',
      });

      candidate.reviewStatus = 'approved_canonical';
      candidate.suggestedBrandId = canonicalBrand.id;
      await this.brandCandidateRepository.save(candidate);

      return {
        success: true,
        action: dto.action,
        candidateId: candidate.id,
        brandId: canonicalBrand.id,
        updatedProducts: syncSummary.updatedProducts,
        activatedProducts: syncSummary.activatedProducts,
      };
    }

    const reviewStatusMap: Record<string, string> = {
      classify_unknown: 'classified_unknown',
      classify_inspired: 'classified_inspired',
      classify_invalid: 'classified_invalid',
    };
    const classificationMap: Record<string, string> = {
      classify_unknown: 'unknown',
      classify_inspired: 'inspired',
      classify_invalid: 'invalid',
    };

    candidate.reviewStatus = reviewStatusMap[dto.action];
    candidate.suggestedBrandId = null;
    await this.syncFactsForCandidate(candidate.id, {
      matchedBrandId: null,
      classification: classificationMap[dto.action],
    });
    await this.brandCandidateRepository.save(candidate);

    return {
      success: true,
      action: dto.action,
      candidateId: candidate.id,
    };
  }

  private async ensureAlias(brandId: string, alias: string): Promise<void> {
    const normalizedAlias = this.generateCandidateKey(alias);
    if (!normalizedAlias) return;

    const existingAlias = await this.brandAliasRepository.findOne({
      where: { normalizedAlias },
    });
    if (existingAlias) return;

    const brandAlias = this.brandAliasRepository.create({
      brandId,
      alias: this.normalizeBrandName(alias),
      normalizedAlias,
      aliasType: 'common_variant',
      source: 'candidate_review',
      isPreferred: false,
    });
    await this.brandAliasRepository.save(brandAlias);
  }

  private async syncCandidateProductsToBrand(
    candidateId: string,
    brandId: string,
  ): Promise<{ updatedProducts: number; activatedProducts: number }> {
    const items = await this.brandCandidateItemRepository.find({
      where: { candidateId },
      select: ['productId'],
    });
    const productIds = [
      ...new Set(
        items
          .map((item) => item.productId)
          .filter((productId): productId is string => Boolean(productId)),
      ),
    ];
    if (productIds.length === 0) {
      return { updatedProducts: 0, activatedProducts: 0 };
    }

    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      select: [
        'id',
        'status',
        'title',
        'originalTitle',
        'description',
        'originalDescription',
        'slug',
        'primaryCategoryId',
        'mainImage',
        'images',
        'priceMin',
        'priceMax',
        'aiBrandName',
        'potentialMixedProduct',
      ],
    });

    const activatableProductIds = products
      .filter((product) => this.shouldActivateAfterBrandBinding(product))
      .map((product) => product.id);

    const bindOnlyProductIds = productIds.filter(
      (id) => !activatableProductIds.includes(id),
    );

    if (bindOnlyProductIds.length > 0) {
      await this.productRepository.update(bindOnlyProductIds, { brandId });
    }

    if (activatableProductIds.length > 0) {
      await this.productRepository.update(activatableProductIds, {
        brandId,
        status: ProductStatus.ACTIVE,
      });
    }

    return {
      updatedProducts: productIds.length,
      activatedProducts: activatableProductIds.length,
    };
  }

  private shouldActivateAfterBrandBinding(
    product: Pick<
      Product,
      | 'status'
      | 'title'
      | 'originalTitle'
      | 'description'
      | 'originalDescription'
      | 'slug'
      | 'primaryCategoryId'
      | 'mainImage'
      | 'images'
      | 'priceMin'
      | 'priceMax'
      | 'aiBrandName'
      | 'potentialMixedProduct'
    >,
  ): boolean {
    if (product.status !== ProductStatus.PENDING_REVIEW) {
      return false;
    }

    if (
      !product.title?.trim() ||
      !product.slug?.trim() ||
      !product.primaryCategoryId
    ) {
      return false;
    }

    return getProductPublicationIssues(product).length === 0;
  }

  private async syncFactsForCandidate(
    candidateId: string,
    payload: { matchedBrandId: string | null; classification: string },
  ): Promise<void> {
    const facts = await this.productBrandFactRepository.find({
      where: { candidateId },
    });
    if (facts.length === 0) return;

    const updatedFacts = facts.map((fact) => ({
      ...fact,
      matchedBrandId: payload.matchedBrandId,
      classification: payload.classification,
      reviewStatus: 'reviewed',
      resolverType: 'admin',
      resolverId: 'admin',
    }));

    await this.productBrandFactRepository.save(updatedFacts);
  }

  private async createBrandFromCandidate(
    candidate: BrandCandidate,
    options: {
      brandName?: string;
      parentBrandId?: string;
      brandType: 'canonical' | 'child';
      displayMode: 'independent' | 'inherit_parent';
      relationType?: string;
    },
  ): Promise<Brand> {
    const brandName = this.normalizeBrandName(
      options.brandName || candidate.rawBrandName,
    );
    if (!brandName) {
      throw new Error('brandName is required');
    }

    const existingBrand =
      await this.brandMatchService.findByNameOrAlias(brandName);
    if (existingBrand) {
      throw new Error(`Brand "${brandName}" already exists`);
    }

    const slugBase = this.brandMatchService.generateSlug(brandName);
    const slug = await this.ensureUniqueSlug(slugBase);
    const canonicalKey =
      this.brandMatchService.generateCanonicalKey(brandName) || null;
    const aliases = this.mergeAliases(
      this.brandMatchService.generateAliases(brandName),
      brandName !== candidate.rawBrandName ? [candidate.rawBrandName] : [],
    );

    const brand = this.brandRepository.create({
      name: brandName,
      slug,
      aliases,
      canonicalKey,
      parentId: options.parentBrandId || undefined,
      brandType: options.brandType,
      displayMode: options.displayMode,
      governanceStatus: 'approved',
      status: 'active',
      isIndependent: options.brandType === 'canonical',
      metadata: {
        reviewedBy: 'admin',
        reviewedAt: new Date().toISOString(),
        notes: candidate.notes || undefined,
      },
    });

    const savedBrand = await this.brandRepository.save(brand);

    if (brandName !== candidate.rawBrandName) {
      await this.ensureAlias(savedBrand.id, candidate.rawBrandName);
    }

    if (options.parentBrandId) {
      await this.ensureBrandRelation(
        options.parentBrandId,
        savedBrand.id,
        options.relationType || 'parent_child',
        candidate.notes,
      );
    }

    return savedBrand;
  }

  private async ensureBrandRelation(
    parentBrandId: string,
    childBrandId: string,
    relationType: string,
    notes?: string | null,
  ): Promise<void> {
    const existingRelation = await this.brandRelationRepository.findOne({
      where: {
        parentBrandId,
        childBrandId,
        relationType,
      },
    });

    if (existingRelation) {
      if (!existingRelation.isActive) {
        existingRelation.isActive = true;
        existingRelation.notes = notes?.trim() || existingRelation.notes;
        await this.brandRelationRepository.save(existingRelation);
      }
      return;
    }

    const relation = this.brandRelationRepository.create({
      parentBrandId,
      childBrandId,
      relationType,
      isActive: true,
      notes: notes?.trim() || null,
    });
    await this.brandRelationRepository.save(relation);
  }

  private mergeAliases(...groups: string[][]): string[] {
    const aliases = new Set<string>();
    for (const group of groups) {
      for (const alias of group) {
        const normalized = this.normalizeBrandName(alias);
        if (!normalized) continue;
        aliases.add(normalized);
      }
    }
    return [...aliases];
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug || `brand-${Date.now().toString(36)}`;
    let suffix = 1;

    while (true) {
      const existing = await this.brandRepository.findOne({
        where: { slug },
        select: ['id'],
      });
      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private calculateAverageConfidence(
    values: Array<number | null | undefined>,
  ): number | null {
    const normalized = values.filter(
      (value): value is number =>
        typeof value === 'number' && !Number.isNaN(value),
    );
    if (normalized.length === 0) {
      return null;
    }

    return Number(
      (
        normalized.reduce((sum, value) => sum + value, 0) / normalized.length
      ).toFixed(3),
    );
  }

  private buildTopBuckets(values: string[]): CandidateSignalBucket[] {
    const counts = new Map<string, number>();

    for (const value of values) {
      const normalizedValue = value.trim();
      if (!normalizedValue) continue;
      counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));
  }

  private buildRiskFlags(
    candidate: BrandCandidate,
    items: Array<BrandCandidateItem & { product: Product }>,
  ): string[] {
    const signals = new Set<string>();
    const rawTokens = [
      candidate.rawBrandName,
      candidate.normalizedBrandName,
      ...items.map((item) => item.product.title || ''),
    ]
      .join(' ')
      .toLowerCase();

    if (
      /(inspired|replica|bootleg|style\b|in the style|inspiration|unofficial|inspo)/.test(
        rawTokens,
      )
    ) {
      signals.add('含 Inspired / Replica 风险');
    }

    if (/(?:\s[x×]\s|collab|collaboration)/.test(rawTokens)) {
      signals.add('疑似联名 / Collaboration');
    }

    if (
      /(records|studio|project|line|lab|atelier|collection)/.test(rawTokens)
    ) {
      signals.add('疑似副线 / Project');
    }

    if (
      typeof candidate.confidence === 'number' &&
      candidate.confidence > 0 &&
      candidate.confidence < 0.75
    ) {
      signals.add('候选建议置信度偏低');
    }

    const averageMatchConfidence = this.calculateAverageConfidence(
      items.map((item) => item.matchConfidence),
    );
    if (
      typeof averageMatchConfidence === 'number' &&
      averageMatchConfidence > 0 &&
      averageMatchConfidence < 0.75
    ) {
      signals.add('样本匹配置信度偏低');
    }

    if (!candidate.suggestedBrandId) {
      signals.add('暂无建议品牌');
    }

    return [...signals];
  }
}
