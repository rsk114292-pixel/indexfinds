import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  collectSeedSlugs,
  loadCategorySeedData,
} from '../scripts/category-seed-utils';
import {
  CategoryEvents,
  CategoryUpdatedEvent,
} from '../shared/events/category.events';

interface CategoryListOptions {
  canonicalOnly?: boolean;
  activeOnly?: boolean;
  leafOnly?: boolean;
  includeParent?: boolean;
}

export type CategoryAiMatchType =
  | 'exact_slug'
  | 'exact_alias_or_name'
  | 'fuzzy';

export interface CategoryAiMatchResult {
  categoryId: string;
  categorySlug: string;
  matchType: CategoryAiMatchType;
  score?: number;
  runnerUpScore?: number | null;
  resolvedByContext?: boolean;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly CATEGORY_CACHE_BUSTER_KEY = 'categories:cache-buster';

  // 分类树缓存
  private categoryTreeCache: Category[] | null = null;
  private categorySlugMap: Map<string, Category> = new Map();
  private categoryDescendantsCache: Map<string, Category[]> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1小时
  private canonicalSlugSetCache: Set<string> | null = null;
  private categoryCacheVersion: string | null = null;
  private categoryStatsCache: Map<
    string,
    { productCount: number; heroImage: string | null }
  > | null = null;
  private categoryStatsCacheExpiry = 0;
  private categoryStatsRefreshPromise: Promise<
    Map<string, { productCount: number; heroImage: string | null }>
  > | null = null;
  private readonly CATEGORY_STATS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private normalizeCategoryTerm(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-\u4e00-\u9fa5]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private singularizeToken(token: string): string {
    if (token.endsWith('ies') && token.length > 3) {
      return `${token.slice(0, -3)}y`;
    }
    if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
      return token.slice(0, -1);
    }
    return token;
  }

  private buildExactVariants(value?: string | null): Set<string> {
    const variants = new Set<string>();
    if (!value) return variants;

    const normalized = this.normalizeCategoryTerm(value);
    if (!normalized) return variants;

    variants.add(normalized);
    variants.add(normalized.replace(/-/g, ''));
    variants.add(
      normalized
        .split('-')
        .map((token) => this.singularizeToken(token))
        .join('-'),
    );

    return variants;
  }

  private tokenizeForFuzzy(value?: string | null): string[] {
    if (!value) return [];

    return this.normalizeCategoryTerm(value)
      .split('-')
      .map((token) => this.singularizeToken(token))
      .filter(Boolean);
  }

  private collectCanonicalActiveLeafNodes(
    node: Category,
    canonicalSlugs: Set<string>,
  ): Category[] {
    const children =
      node.children
        ?.filter((child) => child.isActive !== false)
        .flatMap((child) =>
          this.collectCanonicalActiveLeafNodes(child, canonicalSlugs),
        ) ?? [];

    if (children.length > 0) {
      return children;
    }

    if (node.isActive === false || !canonicalSlugs.has(node.slug)) {
      return [];
    }

    return [node];
  }

  private sortCategoryTree(nodes: Category[]): Category[] {
    return [...nodes]
      .sort(
        (a, b) =>
          a.level - b.level ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name),
      )
      .map((node) => ({
        ...node,
        children: node.children?.length
          ? this.sortCategoryTree(node.children)
          : [],
      }));
  }

  private async loadCategoryTreeFromTable(): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      relations: ['parent'],
      order: { level: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });

    const nodeMap = new Map<string, Category>();
    for (const category of categories) {
      nodeMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    const roots: Category[] = [];
    for (const category of categories) {
      const node = nodeMap.get(category.id);
      if (!node) continue;

      const parentId = category.parent?.id;
      if (parentId) {
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }

      roots.push(node);
    }

    return this.sortCategoryTree(roots);
  }

  private findNodeInTree(nodes: Category[], id: string): Category | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children?.length) {
        const found = this.findNodeInTree(node.children, id);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  private flattenTree(node: Category): Category[] {
    return [
      node,
      ...(node.children?.flatMap((child) => this.flattenTree(child)) ?? []),
    ];
  }

  private scoreLeafCandidateFromContext(
    parentSlug: string,
    leaf: Category,
    contextText?: string,
  ): number {
    const normalizedContext = this.normalizeCategoryTerm(contextText ?? '');
    const normalizedCompact = normalizedContext.replace(/-/g, '');
    const contextTokens = this.tokenizeForFuzzy(contextText);
    const contextTokenSet = new Set(contextTokens);
    const parentTokenSet = new Set(this.tokenizeForFuzzy(parentSlug));

    let score = 0;
    const candidateTerms = [
      leaf.slug,
      leaf.nameEn,
      leaf.name,
      ...(leaf.aliases ?? []),
    ];

    for (const term of candidateTerms) {
      const variants = this.buildExactVariants(term);
      for (const variant of variants) {
        const compactVariant = variant.replace(/-/g, '');
        if (
          normalizedContext.includes(variant) ||
          normalizedCompact.includes(compactVariant)
        ) {
          score = Math.max(score, 260);
        }
      }

      const termTokens = this.tokenizeForFuzzy(term);
      if (termTokens.length === 0) continue;

      // A parent term such as "sneakers" cannot distinguish
      // "chunky-sneakers" from its sibling leaf categories.
      const distinguishingTokens = termTokens.filter(
        (token) => !parentTokenSet.has(token),
      );
      if (distinguishingTokens.length === 0) continue;

      const overlap = distinguishingTokens.filter((token) =>
        contextTokenSet.has(token),
      );
      if (overlap.length === distinguishingTokens.length) {
        score = Math.max(score, 120 + distinguishingTokens.length * 10);
      } else if (overlap.length > 0) {
        score = Math.max(score, overlap.length * 15);
      }
    }

    if (parentSlug === 'sets') {
      const hasSetSignal = contextTokenSet.has('set');
      const hasTrackSignal = [
        'track',
        'sport',
        'sports',
        'gym',
        'athletic',
        'activewear',
        'jogger',
        'joggers',
        'sweat',
        'sweatsuit',
      ].some((token) => contextTokenSet.has(token));
      const hasSuitSignal = [
        'suit',
        'blazer',
        'formal',
        'business',
        'tailored',
      ].some((token) => contextTokenSet.has(token));
      const hasCasualSignal = [
        'casual',
        'lounge',
        'short',
        'shorts',
        'shirt',
        't',
        'tee',
        'matching',
      ].some((token) => contextTokenSet.has(token));

      if (leaf.slug === 'tracksuit' && hasTrackSignal) {
        score = Math.max(score, 220);
      }

      if (leaf.slug === 'suit-set' && hasSuitSignal) {
        score = Math.max(score, 220);
      }

      if (
        leaf.slug === 'casual-set' &&
        (hasCasualSignal || (hasSetSignal && !hasTrackSignal && !hasSuitSignal))
      ) {
        score = Math.max(score, hasCasualSignal ? 210 : 160);
      }
    }

    return score;
  }

  private async getCanonicalSlugSet(): Promise<Set<string>> {
    if (this.canonicalSlugSetCache) {
      return this.canonicalSlugSetCache;
    }

    const seedNodes = await loadCategorySeedData();
    this.canonicalSlugSetCache = new Set(collectSeedSlugs(seedNodes));
    return this.canonicalSlugSetCache;
  }

  private async filterCategoryTree(
    categories: Category[],
    options: CategoryListOptions = {},
  ): Promise<Category[]> {
    const canonicalSlugs = await this.getCanonicalSlugSet();

    const visit = (nodes: Category[]): Category[] =>
      nodes.flatMap((node) => {
        if (options.canonicalOnly && !canonicalSlugs.has(node.slug)) {
          return [];
        }

        if (options.activeOnly && node.isActive === false) {
          return [];
        }

        const children = node.children?.length ? visit(node.children) : [];
        return [{ ...node, children }];
      });

    return visit(categories);
  }

  private async filterCategories(
    categories: Category[],
    options: CategoryListOptions = {},
  ): Promise<Category[]> {
    let filtered = categories;
    const canonicalSlugs = options.canonicalOnly
      ? await this.getCanonicalSlugSet()
      : null;

    if (canonicalSlugs) {
      filtered = filtered.filter((category) =>
        canonicalSlugs.has(category.slug),
      );
    }

    if (options.activeOnly) {
      filtered = filtered.filter((category) => category.isActive !== false);
    }

    if (options.leafOnly) {
      const parentIds = new Set(
        filtered
          .map((category) => category.parent?.id)
          .filter((id): id is string => Boolean(id)),
      );
      filtered = filtered.filter((category) => !parentIds.has(category.id));
    }

    return filtered;
  }

  /**
   * 刷新分类缓存
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const externalCacheVersion = await this.getCategoryCacheVersion();
    const cacheStillFresh =
      Date.now() < this.cacheExpiry && this.categoryTreeCache;
    const cacheVersionMatches =
      externalCacheVersion === null ||
      externalCacheVersion === this.categoryCacheVersion;

    if (cacheStillFresh && cacheVersionMatches) {
      return;
    }

    // 直接基于 parentId 组树，避免 closure-table 脏数据影响分类展示。
    this.categoryTreeCache = await this.loadCategoryTreeFromTable();

    // 构建 slug -> Category 映射
    this.categorySlugMap.clear();
    this.categoryDescendantsCache.clear();
    this.buildSlugMap(this.categoryTreeCache);

    this.cacheExpiry = Date.now() + this.CACHE_TTL;
    this.categoryCacheVersion = externalCacheVersion;
  }

  private async getCategoryCacheVersion(): Promise<string | null> {
    try {
      const value = await this.cacheManager.get<string>(
        this.CATEGORY_CACHE_BUSTER_KEY,
      );
      return value ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to read category cache version: ${message}`);
      return null;
    }
  }

  private async bumpCategoryCacheVersion(): Promise<void> {
    const nextVersion = String(Date.now());

    try {
      await this.cacheManager.set(this.CATEGORY_CACHE_BUSTER_KEY, nextVersion);
      this.categoryCacheVersion = nextVersion;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to update category cache version: ${message}`);
      this.categoryCacheVersion = null;
    }
  }

  /**
   * 递归构建 slug 映射
   */
  private buildSlugMap(categories: Category[]): void {
    for (const category of categories) {
      this.categorySlugMap.set(category.slug, category);
      if (category.children && category.children.length > 0) {
        this.buildSlugMap(category.children);
      }
    }
  }

  /**
   * 使缓存失效（在创建/更新/删除分类时调用）
   * 同时清除内存缓存和 Redis 缓存
   */
  invalidateCache(): void {
    this.categoryTreeCache = null;
    this.categorySlugMap.clear();
    this.categoryDescendantsCache.clear();
    this.cacheExpiry = 0;
    this.categoryCacheVersion = null;
    this.categoryStatsCache = null;
    this.categoryStatsCacheExpiry = 0;
    this.bumpCategoryCacheVersion().catch((err) =>
      this.logger.warn('Failed to bump category cache version:', err),
    );
    this.clearCategoryRedisCache().catch((err) =>
      this.logger.warn('Failed to clear category Redis cache:', err),
    );
  }

  private async clearCategoryRedisCache(): Promise<void> {
    const keyvStore = (this.cacheManager as any).stores?.[0];
    if (keyvStore?.client?.scanIterator) {
      const client = keyvStore.client;
      const keysToDelete: string[] = [];
      for await (const key of client.scanIterator({
        MATCH: '*categories*',
        COUNT: 100,
      })) {
        keysToDelete.push(key);
      }
      if (keysToDelete.length > 0) {
        await client.unlink(keysToDelete);
        this.logger.log(
          `Cleared ${keysToDelete.length} category cache entries (Redis SCAN)`,
        );
      }
      return;
    }

    const internalStore = keyvStore?.store;
    if (internalStore instanceof Map) {
      const keysToDelete: string[] = [];
      for (const key of internalStore.keys()) {
        if (typeof key === 'string' && key.includes('/categories')) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        internalStore.delete(key);
      }
      if (keysToDelete.length > 0) {
        this.logger.log(
          `Cleared ${keysToDelete.length} category cache entries`,
        );
      }
    }
  }

  // 创建分类
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // 检查 slug 是否重复
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException('分类 slug 已存在');
    }

    // 如果有父分类，验证父分类是否存在
    let parent: Category | null = null;
    if (createCategoryDto.parentId) {
      parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `父分类 ID ${createCategoryDto.parentId} 不存在`,
        );
      }

      // 🆕 限制层级深度不超过 4 级（level 0-3）
      if (parent.level >= 3) {
        throw new ConflictException(
          '分类层级不能超过 4 级（当前父分类已是第 4 级）',
        );
      }
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      parent,
      level: parent ? parent.level + 1 : 0,
    });

    const saved = await this.categoryRepository.save(category);
    this.invalidateCache(); // 使缓存失效
    return saved;
  }

  // 获取完整分类树（带缓存）
  async findAll(options: CategoryListOptions = {}): Promise<Category[]> {
    await this.refreshCacheIfNeeded();
    const categories = this.categoryTreeCache || [];
    return this.filterCategoryTree(categories, {
      canonicalOnly: options.canonicalOnly !== false,
      activeOnly: options.activeOnly,
    });
  }

  // 获取分类的商品统计（productCount + heroImage）
  // 通过 closure table 递归包含子分类下的商品
  async getCategoryStats(): Promise<
    Map<string, { productCount: number; heroImage: string | null }>
  > {
    if (this.categoryStatsCache && Date.now() < this.categoryStatsCacheExpiry) {
      return this.categoryStatsCache;
    }

    if (this.categoryStatsRefreshPromise) {
      return this.categoryStatsRefreshPromise;
    }

    this.categoryStatsRefreshPromise = this.loadCategoryStats();
    try {
      this.categoryStatsCache = await this.categoryStatsRefreshPromise;
      this.categoryStatsCacheExpiry =
        Date.now() + this.CATEGORY_STATS_CACHE_TTL;
      return this.categoryStatsCache;
    } finally {
      this.categoryStatsRefreshPromise = null;
    }
  }

  private async loadCategoryStats(): Promise<
    Map<string, { productCount: number; heroImage: string | null }>
  > {
    const rows: Array<{
      id: string;
      productCount: number;
      heroImage: string | null;
    }> = await this.categoryRepository.query(`
      SELECT
        c.id,
        COUNT(DISTINCT p.id)::int AS "productCount",
        (array_agg(p."mainImage" ORDER BY p."viewCount" DESC NULLS LAST)
         FILTER (WHERE p."mainImage" IS NOT NULL AND p."mainImage" != ''))[1] AS "heroImage"
      FROM category c
      LEFT JOIN category_closure cc ON cc.id_ancestor = c.id
      LEFT JOIN products p ON p."primaryCategoryId" = cc.id_descendant AND p.status = 'active'
      WHERE c."isActive" = true
      GROUP BY c.id
    `);
    return new Map(
      rows.map((r) => [
        r.id,
        { productCount: r.productCount, heroImage: r.heroImage },
      ]),
    );
  }

  // 获取扁平化分类列表（带祖先信息）
  async findAllFlat(options: CategoryListOptions = {}): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      relations: options.leafOnly || options.includeParent ? ['parent'] : [],
      order: { level: 'ASC', name: 'ASC' },
    });
    const filtered = await this.filterCategories(categories, options);
    return filtered;
  }

  async findActiveLeafCategories(): Promise<
    Array<{ name: string; slug: string }>
  > {
    const categories = await this.findAllFlat({
      canonicalOnly: true,
      activeOnly: true,
      leafOnly: true,
    });

    return categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    }));
  }

  async findActivePromptCategories(): Promise<
    Array<{
      id: string;
      name: string;
      nameEn?: string | null;
      slug: string;
      level: number;
      parent: { id: string } | null;
    }>
  > {
    const categories = await this.findAllFlat({
      canonicalOnly: true,
      activeOnly: true,
      includeParent: true,
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      level: category.level,
      parent: category.parent?.id ? { id: category.parent.id } : null,
    }));
  }

  // 获取单个分类（包含子分类）
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`分类 ID ${id} 不存在`);
    }

    return category;
  }

  async ensureLeafCategory(id: string): Promise<Category> {
    const category = await this.findOne(id);

    const children: Array<{ id: string }> = await this.categoryRepository.query(
      'SELECT id FROM category WHERE "parentId" = $1 AND "isActive" = true LIMIT 1',
      [id],
    );

    if (children.length > 0) {
      throw new ConflictException(
        `主分类必须是最深层子分类，当前分类 "${category.slug}" 仍有子分类`,
      );
    }

    return category;
  }

  async ensureCanonicalLeafCategory(id: string): Promise<Category> {
    const category = await this.ensureLeafCategory(id);
    const canonicalSlugs = await this.getCanonicalSlugSet();

    if (!canonicalSlugs.has(category.slug)) {
      throw new ConflictException(
        `主分类必须使用规范分类，当前分类 "${category.slug}" 属于 legacy 分类`,
      );
    }

    if (category.isActive === false) {
      throw new ConflictException(
        `主分类必须启用，当前分类 "${category.slug}" 已禁用`,
      );
    }

    return category;
  }

  async ensureCanonicalActiveCategory(id: string): Promise<Category> {
    const category = await this.findOne(id);
    const canonicalSlugs = await this.getCanonicalSlugSet();

    if (!canonicalSlugs.has(category.slug)) {
      throw new ConflictException(
        `主分类必须使用规范分类，当前分类 "${category.slug}" 属于 legacy 分类`,
      );
    }

    if (category.isActive === false) {
      throw new ConflictException(
        `主分类必须启用，当前分类 "${category.slug}" 已禁用`,
      );
    }

    return category;
  }

  // 根据 slug 查询分类（带缓存）
  async findBySlug(slug: string): Promise<Category> {
    await this.refreshCacheIfNeeded();

    const normalizedSlug = this.normalizeCategoryTerm(slug);
    const canonicalSlugs = await this.getCanonicalSlugSet();
    let resolvedSlug = normalizedSlug;

    if (!canonicalSlugs.has(normalizedSlug)) {
      const match = await this.findCategoryMatchByAiSlug(normalizedSlug);
      if (!match || match.matchType === 'fuzzy') {
        throw new NotFoundException(`分类 slug "${slug}" 不存在`);
      }
      resolvedSlug = match.categorySlug;
    }

    // 优先从缓存查找
    const cached = this.categorySlugMap.get(resolvedSlug);
    if (cached) {
      return cached;
    }

    // 缓存未命中，查询数据库
    const category = await this.categoryRepository.findOne({
      where: { slug: resolvedSlug },
    });

    if (!category) {
      throw new NotFoundException(`分类 slug "${slug}" 不存在`);
    }

    return category;
  }

  /**
   * 根据 AI 返回的 slug 查找分类 ID（精确 + 模糊匹配）
   * AI prompt 已将数据库所有分类 slug 发给 AI，但 AI 可能返回名称而非 slug
   */
  async findCategoryMatchByAiSlug(
    slug: string,
  ): Promise<CategoryAiMatchResult | null> {
    if (!slug) return null;

    const normalizedSlug = this.normalizeCategoryTerm(slug);
    const inputVariants = this.buildExactVariants(slug);
    const inputTokens = this.tokenizeForFuzzy(slug);
    const flat = await this.findAllFlat({
      canonicalOnly: true,
      activeOnly: true,
    });

    // Some AI providers return a taxonomy path instead of a bare slug.
    // The terminal path segment is still an exact category signal.
    const structuredSegments = slug
      .split(/[./\\>]+/)
      .map((segment) => this.normalizeCategoryTerm(segment))
      .filter(Boolean);
    if (structuredSegments.length > 1) {
      const terminalSlug = structuredSegments.at(-1);
      const terminalMatch = flat.find(
        (category) => category.slug === terminalSlug,
      );
      if (terminalMatch) {
        return {
          categoryId: terminalMatch.id,
          categorySlug: terminalMatch.slug,
          matchType: 'exact_alias_or_name',
          score: 300,
          runnerUpScore: null,
          resolvedByContext: false,
        };
      }
    }

    // 1. 精确 slug 匹配
    const exactSlugMatch = flat.find(
      (category) => category.slug === normalizedSlug,
    );
    if (exactSlugMatch) {
      return {
        categoryId: exactSlugMatch.id,
        categorySlug: exactSlugMatch.slug,
        matchType: 'exact_slug',
        score: 320,
        runnerUpScore: null,
        resolvedByContext: false,
      };
    }

    // 2. 精确匹配：slug / name / nameEn / aliases
    try {
      const exactMatches = flat
        .map((category) => {
          const exactTerms: Array<{
            value?: string | null;
            score: number;
          }> = [
            { value: category.slug, score: 300 },
            { value: category.nameEn, score: 240 },
            { value: category.name, score: 220 },
            ...(category.aliases ?? []).map((alias) => ({
              value: alias,
              score: 260,
            })),
          ];

          let score = 0;
          for (const term of exactTerms) {
            const termVariants = this.buildExactVariants(term.value);
            if (
              termVariants.size > 0 &&
              [...termVariants].some((variant) => inputVariants.has(variant))
            ) {
              score = Math.max(score, term.score);
            }
          }

          return score > 0 ? { category, score } : null;
        })
        .filter(
          (
            match,
          ): match is {
            category: Category;
            score: number;
          } => match !== null,
        )
        .sort(
          (a, b) => b.score - a.score || b.category.level - a.category.level,
        );

      if (exactMatches.length > 0) {
        return {
          categoryId: exactMatches[0].category.id,
          categorySlug: exactMatches[0].category.slug,
          matchType: 'exact_alias_or_name',
          score: exactMatches[0].score,
          runnerUpScore: exactMatches[1]?.score ?? null,
          resolvedByContext: false,
        };
      }

      // 3. 受控模糊匹配：仅允许 slug token 相差 1 个词以内
      const fuzzyMatches = flat
        .map((category) => {
          const categoryTokens = this.tokenizeForFuzzy(category.slug);
          if (inputTokens.length === 0 || categoryTokens.length === 0) {
            return null;
          }

          const inputSet = new Set(inputTokens);
          const categorySet = new Set(categoryTokens);
          const inputContainsCategory = categoryTokens.every((token) =>
            inputSet.has(token),
          );
          const categoryContainsInput = inputTokens.every((token) =>
            categorySet.has(token),
          );
          const tokenGap = Math.abs(inputTokens.length - categoryTokens.length);

          if (
            !(inputContainsCategory || categoryContainsInput) ||
            tokenGap > 1
          ) {
            return null;
          }

          return {
            category,
            score: categoryTokens.length * 10 - tokenGap,
          };
        })
        .filter(
          (
            match,
          ): match is {
            category: Category;
            score: number;
          } => match !== null,
        )
        .sort(
          (a, b) => b.score - a.score || b.category.level - a.category.level,
        );

      if (fuzzyMatches.length > 0) {
        this.logger.warn(
          `Category "${slug}" matched by controlled fuzzy rule: ${fuzzyMatches[0].category.slug}`,
        );
        return {
          categoryId: fuzzyMatches[0].category.id,
          categorySlug: fuzzyMatches[0].category.slug,
          matchType: 'fuzzy',
          score: fuzzyMatches[0].score,
          runnerUpScore: fuzzyMatches[1]?.score ?? null,
          resolvedByContext: false,
        };
      }
    } catch {
      // 忽略错误
    }

    return null;
  }

  async findCategoryIdByAiSlug(slug: string): Promise<string | null> {
    const match = await this.findCategoryMatchByAiSlug(slug);
    return match?.categoryId ?? null;
  }

  async findCanonicalLeafMatchForAiInput(params: {
    slug: string;
    contextText?: string;
  }): Promise<CategoryAiMatchResult | null> {
    const directMatch = await this.findCategoryMatchByAiSlug(params.slug);
    if (!directMatch) {
      return null;
    }

    const canonicalSlugs = await this.getCanonicalSlugSet();
    const category = await this.findOne(directMatch.categoryId);
    const activeChildren: Array<{ id: string }> =
      await this.categoryRepository.query(
        'SELECT id FROM category WHERE "parentId" = $1 AND "isActive" = true LIMIT 2',
        [category.id],
      );

    if (
      category.isActive !== false &&
      canonicalSlugs.has(category.slug) &&
      activeChildren.length === 0
    ) {
      return directMatch;
    }

    const tree = await this.findDescendantsTree(category.id);
    const leafCandidates = this.collectCanonicalActiveLeafNodes(
      tree,
      canonicalSlugs,
    ).filter((candidate) => candidate.id !== category.id);

    if (leafCandidates.length === 0) {
      return directMatch;
    }

    const scoredCandidates = leafCandidates
      .map((candidate) => ({
        candidate,
        score: this.scoreLeafCandidateFromContext(
          category.slug,
          candidate,
          params.contextText,
        ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.candidate.level - a.candidate.level ||
          a.candidate.sortOrder - b.candidate.sortOrder,
      );

    const [best, secondBest] = scoredCandidates;
    if (!best || best.score <= 0) {
      return directMatch;
    }

    if (secondBest && best.score === secondBest.score && best.score < 220) {
      return directMatch;
    }

    return {
      categoryId: best.candidate.id,
      categorySlug: best.candidate.slug,
      matchType: best.score >= 220 ? 'exact_alias_or_name' : 'fuzzy',
      score: best.score,
      runnerUpScore: secondBest?.score ?? null,
      resolvedByContext: true,
    };
  }

  // 获取分类的所有祖先（用于面包屑）
  async findAncestors(id: string): Promise<Category[]> {
    const category = await this.findOne(id);
    return this.categoryRepository.findAncestors(category);
  }

  // 获取分类的所有后代（带缓存）
  async findDescendants(id: string): Promise<Category[]> {
    await this.refreshCacheIfNeeded();

    // 检查缓存
    const cached = this.categoryDescendantsCache.get(id);
    if (cached) {
      return cached;
    }

    const cachedTree = this.categoryTreeCache
      ? this.findNodeInTree(this.categoryTreeCache, id)
      : null;
    if (cachedTree) {
      const descendants = this.flattenTree(cachedTree);
      this.categoryDescendantsCache.set(id, descendants);
      return descendants;
    }

    // 缓存未命中，回退到数据库树查询
    const category = await this.findOne(id);
    const descendants = await this.categoryRepository.findDescendants(category);

    // 存入缓存
    this.categoryDescendantsCache.set(id, descendants);

    return descendants;
  }

  // 获取分类树（从指定分类开始）
  async findDescendantsTree(id: string): Promise<Category> {
    await this.refreshCacheIfNeeded();

    const cachedTree = this.categoryTreeCache
      ? this.findNodeInTree(this.categoryTreeCache, id)
      : null;
    if (cachedTree) {
      return cachedTree;
    }

    const category = await this.findOne(id);
    return this.categoryRepository.findDescendantsTree(category);
  }

  // 更新分类
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // 如果更新 slug，检查是否重复
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory) {
        throw new ConflictException('分类 slug 已存在');
      }
    }

    // 如果更新父分类
    if (updateCategoryDto.parentId !== undefined) {
      if (updateCategoryDto.parentId) {
        const parent = await this.categoryRepository.findOne({
          where: { id: updateCategoryDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException(
            `父分类 ID ${updateCategoryDto.parentId} 不存在`,
          );
        }

        // 防止循环引用：目标父分类不能是当前分类自身或后代
        const descendants =
          await this.categoryRepository.findDescendants(category);
        if (descendants.some((d) => d.id === updateCategoryDto.parentId)) {
          throw new ConflictException(
            '不能将分类移到自己或自己的后代下，这会形成循环引用',
          );
        }

        // 🆕 限制层级深度不超过 4 级（level 0-3）
        if (parent.level >= 3) {
          throw new ConflictException(
            '分类层级不能超过 4 级（当前父分类已是第 4 级）',
          );
        }

        category.parent = parent;
        category.level = parent.level + 1;
      } else {
        category.parent = null;
        category.level = 0;
      }
    }

    Object.assign(category, updateCategoryDto);
    const saved = await this.categoryRepository.save(category);
    this.invalidateCache(); // 使缓存失效
    this.eventEmitter.emit(CategoryEvents.UPDATED, {
      categoryId: saved.id,
      changes: updateCategoryDto,
      updatedAt: new Date(),
    } as CategoryUpdatedEvent);
    return saved;
  }

  // 删除分类
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // 检查是否有子分类
    const descendants = await this.categoryRepository.findDescendants(category);
    if (descendants.length > 1) {
      // descendants 包含自己，所以 > 1 表示有子分类
      throw new ConflictException('该分类下有子分类，无法删除');
    }

    // 检查是否有商品关联（主分类或副分类）
    const productCount: [{ count: string }] =
      await this.categoryRepository.query(
        `SELECT COUNT(*)::text AS count FROM products WHERE "primaryCategoryId" = $1
         UNION ALL
         SELECT COUNT(*)::text AS count FROM product_secondary_categories WHERE "categoryId" = $1`,
        [id],
      );
    const totalProducts = productCount.reduce(
      (sum, row) => sum + parseInt(row.count, 10),
      0,
    );
    if (totalProducts > 0) {
      throw new ConflictException(
        `该分类下有 ${totalProducts} 个商品关联，无法删除。请先移除商品关联。`,
      );
    }

    await this.categoryRepository.remove(category);
    this.invalidateCache();
  }

  /**
   * 获取所有活跃分类的 slugs（用于 Sitemap 生成）
   */
  async getAllSlugs(): Promise<{ slugs: string[] }> {
    const categories = await this.findAllFlat({
      canonicalOnly: true,
      activeOnly: true,
    });
    return { slugs: categories.map((c) => c.slug) };
  }

  /**
   * 搜索分类（用于搜索建议功能）
   * @param query 搜索关键词
   * @param limit 返回数量限制
   */
  async search(query: string, limit: number = 5): Promise<Category[]> {
    if (!query || query.length < 2) {
      return [];
    }

    // 使用ILike进行大小写不敏感的模糊搜索
    const categories = await this.categoryRepository.find({
      where: { name: ILike(`%${query}%`) },
      take: limit,
      order: {
        level: 'ASC', // 优先返回顶级分类
        name: 'ASC',
      },
    });

    return categories;
  }
}
