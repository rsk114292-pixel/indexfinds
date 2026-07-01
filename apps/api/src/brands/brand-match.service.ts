import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandAlias } from './entities/brand-alias.entity';
import { BrandCandidate } from './entities/brand-candidate.entity';

/**
 * BrandMatchService
 * 负责品牌匹配和合并：
 * - 别名匹配
 * - 品牌合并
 * - 未命中品牌进入候选池
 * - 别名生成
 */
@Injectable()
export class BrandMatchService {
  private readonly logger = new Logger(BrandMatchService.name);
  private readonly strictAliasTypes = new Set([
    'common_variant',
    'seed_variant',
    'prod_safe_variant',
    'safe-acronym',
    'safe-name-variant',
    'safe-spelling-variant',
  ]);
  private readonly softAliasTypes = new Set([
    'safe-token-variant',
    'product-hint',
    'generic-model',
  ]);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(BrandAlias)
    private readonly brandAliasRepository: Repository<BrandAlias>,
    @InjectRepository(BrandCandidate)
    private readonly brandCandidateRepository: Repository<BrandCandidate>,
  ) {}

  /**
   * 根据名称或别名查找品牌（用于归一化）
   * 优化：使用 SQL 查询代替内存过滤，提升大数据集性能
   */
  async findByNameOrAlias(name: string): Promise<Brand | null> {
    const trimmedName = name.trim();
    const nameLower = trimmedName.toLowerCase();
    const canonicalKey = this.generateCanonicalKey(trimmedName);

    // 优先精确匹配名称（大小写不敏感）
    const brandByName = await this.brandRepository
      .createQueryBuilder('brand')
      .where('LOWER(brand.name) = :name', { name: nameLower })
      .getOne();

    if (brandByName) {
      return brandByName;
    }

    if (canonicalKey) {
      const brandByCanonicalKey = await this.brandRepository
        .createQueryBuilder('brand')
        .where('brand."canonicalKey" = :canonicalKey', { canonicalKey })
        .getOne();

      if (brandByCanonicalKey) {
        return brandByCanonicalKey;
      }
    }

    if (canonicalKey) {
      const strictAliasMatch = await this.findAliasMatchByLayer(
        canonicalKey,
        'strict',
      );
      if (strictAliasMatch) {
        return strictAliasMatch;
      }
    }

    // 在别名中搜索（simple-array 存储为逗号分隔字符串）
    const brandByAlias = await this.brandRepository
      .createQueryBuilder('brand')
      .where('brand.aliases IS NOT NULL')
      .andWhere(
        '(LOWER(brand.aliases) = :exactAlias OR ' +
          'LOWER(brand.aliases) LIKE :startAlias OR ' +
          'LOWER(brand.aliases) LIKE :middleAlias OR ' +
          'LOWER(brand.aliases) LIKE :endAlias)',
        {
          exactAlias: nameLower,
          startAlias: `${nameLower},%`,
          middleAlias: `%,${nameLower},%`,
          endAlias: `%,${nameLower}`,
        },
      )
      .getOne();

    return brandByAlias || null;
  }

  /**
   * 合并品牌（将一个品牌合并到另一个）
   */
  async merge(sourceId: string, targetId: string): Promise<Brand> {
    if (sourceId === targetId) {
      throw new BadRequestException('不能将品牌合并到自身');
    }

    const sourceBrand = await this.findOneById(sourceId);
    const targetBrand = await this.findOneById(targetId);

    if (sourceBrand.status === 'merged') {
      throw new BadRequestException(`源品牌 "${sourceBrand.name}" 已被合并过`);
    }
    if (targetBrand.status !== 'active') {
      throw new BadRequestException(
        `目标品牌 "${targetBrand.name}" 不是活跃状态`,
      );
    }

    // 禁止在有父子关系的品牌之间合并（应使用 parent-child 而非 merge）
    if (
      sourceBrand.parentId === targetId ||
      targetBrand.parentId === sourceId
    ) {
      throw new BadRequestException(
        `"${sourceBrand.name}" 与 "${targetBrand.name}" 之间存在父子关系，请使用父子品牌管理而非合并。合并仅用于去重（同一品牌不同写法）`,
      );
    }

    // 1. 将源品牌的子品牌迁移到目标品牌
    await this.brandRepository
      .createQueryBuilder()
      .update(Brand)
      .set({ parentId: targetId })
      .where('"parentId" = :sourceId', { sourceId })
      .execute();

    // 2. 将源品牌下的所有产品转移到目标品牌
    await this.brandRepository.manager
      .createQueryBuilder()
      .update('products')
      .set({ brandId: targetId })
      .where('"brandId" = :sourceId', { sourceId })
      .execute();

    // 3. 将源品牌的别名合并到目标品牌
    const mergedAliases = [
      ...(targetBrand.aliases || []),
      sourceBrand.name,
      ...(sourceBrand.aliases || []),
    ];
    targetBrand.aliases = [...new Set(mergedAliases)];

    // 4. 标记源品牌为已合并
    sourceBrand.status = 'merged';
    sourceBrand.mergedIntoId = targetId;

    const [savedSourceBrand] = await this.brandRepository.save([
      sourceBrand,
      targetBrand,
    ]);
    return savedSourceBrand;
  }

  /**
   * 通过品牌名查找品牌
   * 兼容保留原方法名：未命中时不再自动创建正式品牌，而是写入候选池
   */
  async findOrCreateByName(
    name: string,
    aiConfidence?: number,
  ): Promise<Brand | null> {
    if (!name || name.trim() === '') {
      return null;
    }

    const trimmedName = name.trim();
    const canonicalKey = this.generateCanonicalKey(trimmedName);

    // 1. 尝试通过名称或别名查找现有品牌（包括 inactive 状态）
    const existingBrand = await this.findByNameOrAlias(trimmedName);
    if (existingBrand) {
      // 如果品牌已被合并，跟随到目标品牌
      if (existingBrand.status === 'merged' && existingBrand.mergedIntoId) {
        return this.findOneById(existingBrand.mergedIntoId);
      }
      // 如果品牌是 inactive 状态（被软删除），重新激活它
      if (existingBrand.status === 'inactive') {
        existingBrand.status = 'active';
        existingBrand.metadata = {
          ...existingBrand.metadata,
          reactivatedAt: new Date().toISOString(),
          reactivatedBy: 'auto-import',
        };
        await this.brandRepository.save(existingBrand);
      }
      return existingBrand;
    }

    // 2. 联名品牌检测：拆分 "Brand A x Brand B"，尝试匹配已有主品牌
    const collabParts = trimmedName.split(/\s*[x×X]\s*/).filter(Boolean);
    if (collabParts.length >= 2) {
      for (const part of collabParts) {
        const partBrand = await this.findByNameOrAlias(part.trim());
        if (partBrand && partBrand.status === 'active') {
          return partBrand;
        }
      }
    }

    // 3. 使用 soft hints 作为审核建议，不直接自动绑定
    const softHint = canonicalKey
      ? await this.findAliasSuggestionByLayer(canonicalKey, 'soft')
      : null;

    // 3. 未找到，写入候选池而不是自动创建正式品牌
    await this.recordBrandCandidate(trimmedName, aiConfidence, softHint);
    return null;
  }

  /**
   * 获取所有品牌的简单列表（用于 AI 匹配）
   */
  async findAllSimple(): Promise<Array<{ name: string; aliases?: string[] }>> {
    const brands = await this.brandRepository.find({
      where: { status: 'active', governanceStatus: 'approved' },
      select: ['id', 'name', 'aliases'],
    });

    const strictAliasRows = await this.brandAliasRepository
      .createQueryBuilder('alias')
      .select([
        'alias.brandId AS "brandId"',
        'alias.alias AS alias',
        'alias."aliasType" AS "aliasType"',
      ])
      .getRawMany<{
        brandId: string;
        alias: string;
        aliasType: string;
      }>();

    const aliasesByBrandId = new Map<string, string[]>();
    for (const row of strictAliasRows) {
      if (!this.strictAliasTypes.has(row.aliasType) || !row.alias?.trim()) {
        continue;
      }
      const existing = aliasesByBrandId.get(row.brandId) ?? [];
      existing.push(row.alias.trim());
      aliasesByBrandId.set(row.brandId, existing);
    }

    return brands.map((b) => ({
      name: b.name,
      aliases: [
        ...new Set([
          ...(b.aliases || []),
          ...(aliasesByBrandId.get(b.id) || []),
        ]),
      ],
    }));
  }

  /**
   * 生成 URL 友好的 slug
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  generateCanonicalKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
  }

  /**
   * 自动生成品牌别名变体
   */
  generateAliases(name: string): string[] {
    const aliases: Set<string> = new Set();
    const trimmed = name.trim();
    const trimmedLower = trimmed.toLowerCase();

    // 1. 小写版本
    aliases.add(trimmedLower);

    // 2. 大写版本
    aliases.add(trimmed.toUpperCase());

    // 3. 去除空格版本
    const noSpace = trimmed.replace(/\s+/g, '');
    aliases.add(noSpace);
    aliases.add(noSpace.toLowerCase());

    // 4. 常见缩写 (首字母)
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      const initials = words.map((w) => w[0]).join('');
      aliases.add(initials.toLowerCase());
      aliases.add(initials.toUpperCase());
    }

    // 5. 连字符转换
    if (trimmed.includes(' ')) {
      aliases.add(trimmed.replace(/\s+/g, '-').toLowerCase());
    }
    if (trimmed.includes('-')) {
      aliases.add(trimmed.replace(/-/g, ' ').toLowerCase());
      aliases.add(trimmed.replace(/-/g, '').toLowerCase());
    }

    // 6. 去除特殊字符版本
    const alphanumeric = trimmed
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
      .toLowerCase();
    if (alphanumeric.length > 0) {
      aliases.add(alphanumeric);
    }

    // 移除与原名相同的别名
    aliases.delete(trimmed);
    aliases.delete(trimmedLower);

    return [...aliases].filter((a) => a.length >= 2);
  }

  private normalizeBrandName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private resolveAliasLayer(
    aliasType?: string | null,
  ): 'strict' | 'soft' | 'reject' {
    if (aliasType && this.strictAliasTypes.has(aliasType)) {
      return 'strict';
    }
    if (aliasType && this.softAliasTypes.has(aliasType)) {
      return 'soft';
    }
    return 'reject';
  }

  private async findAliasRows(canonicalKey: string): Promise<BrandAlias[]> {
    return this.brandAliasRepository
      .createQueryBuilder('alias')
      .innerJoinAndSelect('alias.brand', 'brand')
      .where('alias."normalizedAlias" = :canonicalKey', { canonicalKey })
      .andWhere('brand.status = :status', { status: 'active' })
      .andWhere('brand."governanceStatus" = :governanceStatus', {
        governanceStatus: 'approved',
      })
      .getMany();
  }

  private async findAliasMatchByLayer(
    canonicalKey: string,
    layer: 'strict' | 'soft',
  ): Promise<Brand | null> {
    const aliasRows = await this.findAliasRows(canonicalKey);
    const matchedRow = aliasRows.find(
      (row) => this.resolveAliasLayer(row.aliasType) === layer,
    );
    return matchedRow?.brand || null;
  }

  private async findAliasSuggestionByLayer(
    canonicalKey: string,
    layer: 'soft',
  ): Promise<{
    suggestedBrandId: string | null;
    suggestedRelationType: string | null;
  } | null> {
    const aliasRows = await this.findAliasRows(canonicalKey);
    const softRows = aliasRows.filter(
      (row) => this.resolveAliasLayer(row.aliasType) === layer,
    );

    if (softRows.length === 0) {
      return null;
    }

    const uniqueBrandIds = [...new Set(softRows.map((row) => row.brandId))];
    if (uniqueBrandIds.length === 1) {
      return {
        suggestedBrandId: uniqueBrandIds[0],
        suggestedRelationType: 'soft_hint',
      };
    }

    return {
      suggestedBrandId: null,
      suggestedRelationType: 'soft_hint_ambiguous',
    };
  }

  private inferCandidateReviewStatus(name: string): string {
    const normalized = name.toLowerCase();

    if (
      /(^|\b)(inspired|replica|unofficial|fan-made|fan made|parody|tribute)(\b|$)/i.test(
        normalized,
      )
    ) {
      return 'classified_inspired';
    }

    if (normalized === 'null' || normalized === 'undefined') {
      return 'classified_invalid';
    }

    return 'pending';
  }

  private async recordBrandCandidate(
    rawBrandName: string,
    aiConfidence?: number,
    suggestion?: {
      suggestedBrandId: string | null;
      suggestedRelationType: string | null;
    } | null,
  ): Promise<void> {
    const normalizedBrandName = this.normalizeBrandName(rawBrandName);
    const candidateKey = this.generateCanonicalKey(normalizedBrandName);

    if (!candidateKey) {
      this.logger.warn(`跳过空候选品牌键: "${rawBrandName}"`);
      return;
    }

    const existingCandidate = await this.brandCandidateRepository.findOne({
      where: { candidateKey },
    });

    if (existingCandidate) {
      existingCandidate.rawBrandName = normalizedBrandName;
      existingCandidate.normalizedBrandName = normalizedBrandName;
      existingCandidate.hitCount += 1;
      existingCandidate.lastSeenAt = new Date();
      if (suggestion) {
        existingCandidate.suggestedBrandId = suggestion.suggestedBrandId;
        existingCandidate.suggestedRelationType =
          suggestion.suggestedRelationType;
      }

      if (typeof aiConfidence === 'number' && !Number.isNaN(aiConfidence)) {
        existingCandidate.confidence = Math.max(
          existingCandidate.confidence ?? 0,
          aiConfidence,
        );
      }

      await this.brandCandidateRepository.save(existingCandidate);
      return;
    }

    const candidate = this.brandCandidateRepository.create({
      rawBrandName: normalizedBrandName,
      normalizedBrandName,
      candidateKey,
      reviewStatus: this.inferCandidateReviewStatus(normalizedBrandName),
      suggestedBrandId: suggestion?.suggestedBrandId ?? null,
      suggestedRelationType: suggestion?.suggestedRelationType ?? null,
      confidence:
        typeof aiConfidence === 'number' && !Number.isNaN(aiConfidence)
          ? aiConfidence
          : null,
      hitCount: 1,
      sampleProductCount: 0,
      lastSeenAt: new Date(),
      source: 'import_ai',
    });

    await this.brandCandidateRepository.save(candidate);
    this.logger.log(`品牌未命中，已写入候选池: "${normalizedBrandName}"`);
  }

  /**
   * 内部方法：根据 ID 查找品牌
   */
  private async findOneById(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand ID ${id} not found`);
    }
    return brand;
  }
}
