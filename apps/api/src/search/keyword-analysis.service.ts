import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { SynonymService } from './synonym.service';
import { BrandCacheService } from './brand-cache.service';
import { IntentDetectorService, SearchIntent } from './intent-detector.service';
import {
  BRAND_KEYWORDS,
  CATEGORY_KEYWORDS,
  GENDER_KEYWORDS,
  SEASON_KEYWORDS,
  COLOR_KEYWORDS,
  STYLE_KEYWORDS,
  OCCASION_KEYWORDS,
} from './keyword-mappings';
import { isStopWord } from './stop-words';
import { validateSearchQuery, limitTokens } from './utils/query-validator';

export interface AnalyzedQuery {
  brands: string[];
  categories: string[];
  genders: string[];
  seasons: string[];
  colors: string[];
  styles: string[];
  occasions: string[];
  keywords: string[]; // 未匹配的剩余关键词
  intent?: SearchIntent; // 搜索意图
}

@Injectable()
export class KeywordAnalysisService {
  private readonly logger = new Logger(KeywordAnalysisService.name);

  /**
   * 多词品牌短语列表（静态常量）
   * 用于匹配包含多个单词的品牌名称
   */
  private static readonly MULTI_WORD_BRANDS = [
    'north face',
    'calvin klein',
    'tommy hilfiger',
    'ralph lauren',
    'louis vuitton',
    'new balance',
    'under armour',
    'canada goose',
    'stone island',
  ] as const;

  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private synonymService: SynonymService,
    private brandCacheService: BrandCacheService,
    private intentDetectorService: IntentDetectorService,
  ) {}

  /**
   * 分析搜索查询，提取结构化筛选条件
   */
  analyze(query: string): AnalyzedQuery {
    const result: AnalyzedQuery = {
      brands: [],
      categories: [],
      genders: [],
      seasons: [],
      colors: [],
      styles: [],
      occasions: [],
      keywords: [],
    };

    // 输入验证
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      return result;
    }

    // 转小写并分词，限制 token 数量
    const normalizedQuery = validation.sanitizedQuery.toLowerCase();
    const tokens = limitTokens(normalizedQuery.split(/\s+/).filter(Boolean));
    const matchedTokenIndices = new Set<number>();

    // 1. 先尝试匹配多词短语（如 "north face", "calvin klein"）
    this.matchMultiWordPhrases(
      normalizedQuery,
      result,
      tokens,
      matchedTokenIndices,
    );

    // 2. 逐词匹配
    for (let i = 0; i < tokens.length; i++) {
      if (matchedTokenIndices.has(i)) continue;

      const token = tokens[i];
      let matched = false;

      // 匹配品牌
      if (BRAND_KEYWORDS[token]) {
        result.brands.push(BRAND_KEYWORDS[token]);
        matched = true;
      }

      // 匹配分类
      if (CATEGORY_KEYWORDS[token]) {
        const cat = CATEGORY_KEYWORDS[token];
        result.categories.push(cat.slug);
        if (cat.impliedGender && !result.genders.includes(cat.impliedGender)) {
          result.genders.push(cat.impliedGender);
        }
        matched = true;
      }

      // 匹配其他属性（性别、季节、颜色、风格、场合、材质）
      if (!matched) {
        matched = this.matchTokenAgainstMappings(token, result);
      }

      // 未匹配的词添加到 keywords（过滤停用词）
      if (!matched && !isStopWord(token)) {
        result.keywords.push(token);
      }
    }

    // 去重
    this.deduplicateResults(result);

    return result;
  }

  /**
   * 匹配单个 token 的各类属性（性别、季节、颜色等）
   * 提取共享逻辑，避免 analyze() 和 analyzeAsync() 重复
   * @returns 是否匹配成功
   */
  private matchTokenAgainstMappings(
    token: string,
    result: AnalyzedQuery,
  ): boolean {
    let matched = false;

    // 匹配性别
    if (GENDER_KEYWORDS[token]) {
      result.genders.push(GENDER_KEYWORDS[token]);
      matched = true;
    }

    // 匹配季节
    if (SEASON_KEYWORDS[token]) {
      result.seasons.push(SEASON_KEYWORDS[token]);
      matched = true;
    }

    // 匹配颜色
    if (COLOR_KEYWORDS[token]) {
      result.colors.push(COLOR_KEYWORDS[token]);
      matched = true;
    }

    // 匹配风格
    if (STYLE_KEYWORDS[token]) {
      result.styles.push(STYLE_KEYWORDS[token]);
      matched = true;
    }

    // 匹配场合
    if (OCCASION_KEYWORDS[token]) {
      result.occasions.push(OCCASION_KEYWORDS[token]);
      matched = true;
    }

    return matched;
  }

  /**
   * 去重分析结果的各个数组
   * 提取共享逻辑，避免重复代码
   */
  private deduplicateResults(result: AnalyzedQuery): void {
    result.brands = [...new Set(result.brands)];
    result.categories = [...new Set(result.categories)];
    result.genders = [...new Set(result.genders)];
    result.seasons = [...new Set(result.seasons)];
    result.colors = [...new Set(result.colors)];
    result.styles = [...new Set(result.styles)];
    result.occasions = [...new Set(result.occasions)];
  }

  /**
   * 匹配多词短语
   */
  private matchMultiWordPhrases(
    query: string,
    result: AnalyzedQuery,
    tokens: string[],
    matchedIndices: Set<number>,
  ): void {
    for (const phrase of KeywordAnalysisService.MULTI_WORD_BRANDS) {
      if (query.includes(phrase) && BRAND_KEYWORDS[phrase]) {
        result.brands.push(BRAND_KEYWORDS[phrase]);
        // 标记匹配的词索引
        const phraseTokens = phrase.split(' ');
        for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
          if (tokens.slice(i, i + phraseTokens.length).join(' ') === phrase) {
            for (let j = 0; j < phraseTokens.length; j++) {
              matchedIndices.add(i + j);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * 检查分析结果是否有任何匹配
   */
  hasMatches(analyzed: AnalyzedQuery): boolean {
    return (
      analyzed.brands.length > 0 ||
      analyzed.categories.length > 0 ||
      analyzed.genders.length > 0 ||
      analyzed.seasons.length > 0 ||
      analyzed.colors.length > 0 ||
      analyzed.styles.length > 0 ||
      analyzed.occasions.length > 0
    );
  }

  /**
   * 从数据库批量查询品牌（缓存优先，解决 N+1 问题）
   * @param tokens 搜索词数组
   * @returns Map<token, slug>
   */
  private async findBrandsFromDatabase(
    tokens: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const uncachedTokens: string[] = [];

    // 1. 先从缓存批量查找
    for (const token of tokens) {
      const cachedSlug = this.brandCacheService.findBrand(token);
      if (cachedSlug) {
        result.set(token, cachedSlug);
      } else {
        uncachedTokens.push(token);
      }
    }

    // 2. 缓存未命中的批量查询数据库
    if (uncachedTokens.length > 0) {
      const tokensLower = uncachedTokens.map((t) => t.toLowerCase());
      const brands = await this.brandRepository
        .createQueryBuilder('brand')
        .where('LOWER(brand.name) IN (:...tokens)', { tokens: tokensLower })
        .orWhere('LOWER(brand.slug) IN (:...tokens)', { tokens: tokensLower })
        .andWhere('brand.status = :status', { status: 'active' })
        .getMany();

      // 建立 token -> slug 映射
      for (const brand of brands) {
        const nameLower = brand.name.toLowerCase();
        const slugLower = brand.slug.toLowerCase();
        for (const token of uncachedTokens) {
          const tokenLower = token.toLowerCase();
          if (tokenLower === nameLower || tokenLower === slugLower) {
            result.set(token, brand.slug);
          }
        }
      }
    }

    return result;
  }

  /**
   * 批量查询分类（解决 N+1 问题）
   * @param tokens 搜索词数组
   * @returns Map<token, { slug, impliedGender }>
   */
  private async findCategoriesDynamicBatch(
    tokens: string[],
  ): Promise<Map<string, { slug: string; impliedGender?: string }>> {
    const result = new Map<string, { slug: string; impliedGender?: string }>();
    if (tokens.length === 0) return result;

    const tokensLower = tokens.map((t) => t.toLowerCase());
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) IN (:...tokens)', { tokens: tokensLower })
      .orWhere('LOWER(category.nameEn) IN (:...tokens)', {
        tokens: tokensLower,
      })
      .orWhere('LOWER(category.slug) IN (:...tokens)', { tokens: tokensLower })
      .andWhere('category.isActive = :isActive', { isActive: true })
      .getMany();

    // 建立 token -> category 映射
    for (const category of categories) {
      const nameLower = category.name.toLowerCase();
      const nameEnLower = category.nameEn?.toLowerCase() || '';
      const slugLower = category.slug.toLowerCase();

      // 推断性别
      let impliedGender: string | undefined;
      if (
        nameLower.includes('女') ||
        nameLower.includes('women') ||
        nameLower.includes('lady')
      ) {
        impliedGender = 'women';
      } else if (
        nameLower.includes('男') ||
        nameLower.includes('men') ||
        nameLower.includes('boy')
      ) {
        impliedGender = 'men';
      }

      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        if (
          tokenLower === nameLower ||
          tokenLower === nameEnLower ||
          tokenLower === slugLower
        ) {
          result.set(token, { slug: category.slug, impliedGender });
        }
      }
    }

    return result;
  }

  /**
   * 异步分析搜索查询，支持动态品牌匹配
   * 优先使用静态映射，未命中则查询数据库
   */
  async analyzeAsync(query: string): Promise<AnalyzedQuery> {
    const result: AnalyzedQuery = {
      brands: [],
      categories: [],
      genders: [],
      seasons: [],
      colors: [],
      styles: [],
      occasions: [],
      keywords: [],
    };

    // 输入验证
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      this.logger.warn(`Invalid query rejected: ${validation.error}`);
      return result;
    }

    const normalizedQuery = validation.sanitizedQuery.toLowerCase();
    const tokens = limitTokens(normalizedQuery.split(/\s+/).filter(Boolean));
    const matchedTokenIndices = new Set<number>();

    // 1. 先尝试匹配多词短语
    await this.matchMultiWordPhrasesAsync(
      normalizedQuery,
      result,
      tokens,
      matchedTokenIndices,
    );

    // 2. 收集静态映射未命中的 tokens，批量查询（解决 N+1 问题）
    const unmatchedTokens = tokens.filter(
      (t, i) =>
        !matchedTokenIndices.has(i) &&
        !BRAND_KEYWORDS[t] &&
        !CATEGORY_KEYWORDS[t],
    );
    const [brandMap, categoryMap] = await Promise.all([
      this.findBrandsFromDatabase(unmatchedTokens),
      this.findCategoriesDynamicBatch(unmatchedTokens),
    ]);

    // 3. 逐词匹配（使用预查询结果，无额外 DB 查询）
    for (let i = 0; i < tokens.length; i++) {
      if (matchedTokenIndices.has(i)) continue;

      const token = tokens[i];
      let matched = false;

      // 匹配品牌：先静态映射，后批量预查询结果
      if (BRAND_KEYWORDS[token]) {
        result.brands.push(BRAND_KEYWORDS[token]);
        matched = true;
      } else if (brandMap.has(token)) {
        result.brands.push(brandMap.get(token)!);
        matched = true;
      }

      // 匹配分类：先静态映射，后批量预查询结果
      if (CATEGORY_KEYWORDS[token]) {
        const cat = CATEGORY_KEYWORDS[token];
        result.categories.push(cat.slug);
        if (cat.impliedGender && !result.genders.includes(cat.impliedGender)) {
          result.genders.push(cat.impliedGender);
        }
        matched = true;
      } else if (!matched && categoryMap.has(token)) {
        const dynamicCategory = categoryMap.get(token)!;
        result.categories.push(dynamicCategory.slug);
        if (
          dynamicCategory.impliedGender &&
          !result.genders.includes(dynamicCategory.impliedGender)
        ) {
          result.genders.push(dynamicCategory.impliedGender);
        }
        matched = true;
      }

      // 匹配其他属性（性别、季节、颜色、风格、场合、材质）
      if (!matched) {
        matched = this.matchTokenAgainstMappings(token, result);
      }

      // 未匹配的词添加到 keywords（过滤停用词）
      if (!matched && !isStopWord(token)) {
        result.keywords.push(token);
      }
    }

    // 去重
    this.deduplicateResults(result);

    // 搜索意图检测（必须在同义词扩展之前）
    result.intent = this.intentDetectorService.detectIntent(query, tokens);

    // 从 keywords 中移除意图关键词（避免将 "budget" 等词扩展成 "low price" 后用于文本搜索）
    // 注意：必须在同义词扩展之前执行，否则 "budget" 会被扩展成 ["budget", "low price"]
    // 然后只移除 "budget"，保留无意义的 "low price"
    const intentKeywords = this.intentDetectorService.getAllIntentKeywords();
    result.keywords = result.keywords.filter(
      (k) => !intentKeywords.has(k.toLowerCase()),
    );

    // 同义词扩展：对未匹配的 keywords 进行扩展（在意图关键词过滤之后）
    if (result.keywords.length > 0) {
      result.keywords = this.synonymService.expandTerms(result.keywords);
    }

    // DEBUG: 打印分析结果（脱敏处理：不记录原始查询词）
    this.logger.debug(
      `Query analysis: tokens=${tokens.length}, intent=${result.intent?.priceIntent ?? 'none'}`,
    );
    this.logger.debug(
      `Matched: brands=${result.brands.length}, categories=${result.categories.length}, genders=${result.genders.length}`,
    );
    this.logger.debug(`Remaining keywords: ${result.keywords.length}`);

    return result;
  }

  /**
   * 异步匹配多词短语，支持动态品牌查询
   */
  private async matchMultiWordPhrasesAsync(
    query: string,
    result: AnalyzedQuery,
    tokens: string[],
    matchedIndices: Set<number>,
  ): Promise<void> {
    // 收集查询中存在但静态映射未命中的短语，批量查询
    const matchedPhrases: { phrase: string; slug: string }[] = [];
    const unmatchedPhrases: string[] = [];

    for (const phrase of KeywordAnalysisService.MULTI_WORD_BRANDS) {
      if (query.includes(phrase)) {
        const staticSlug = BRAND_KEYWORDS[phrase] || null;
        if (staticSlug) {
          matchedPhrases.push({ phrase, slug: staticSlug });
        } else {
          unmatchedPhrases.push(phrase);
        }
      }
    }

    // 批量查询未命中的短语
    if (unmatchedPhrases.length > 0) {
      const brandMap = await this.findBrandsFromDatabase(unmatchedPhrases);
      for (const phrase of unmatchedPhrases) {
        const slug = brandMap.get(phrase);
        if (slug) {
          matchedPhrases.push({ phrase, slug });
        }
      }
    }

    // 应用匹配结果
    for (const { phrase, slug } of matchedPhrases) {
      result.brands.push(slug);
      const phraseTokens = phrase.split(' ');
      for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
        if (tokens.slice(i, i + phraseTokens.length).join(' ') === phrase) {
          for (let j = 0; j < phraseTokens.length; j++) {
            matchedIndices.add(i + j);
          }
          break;
        }
      }
    }
  }
}
