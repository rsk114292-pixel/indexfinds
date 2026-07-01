import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CategoriesService } from '../categories/categories.service';
import { AIService } from '../ai/ai.service';
import { AIResponseParserService } from '../ai/ai-response-parser.service';
import { BrandsService } from '../brands/brands.service';
import {
  ComprehensiveProductAnalysis,
  ProcessingStrategy,
  SkuAttributeHint,
} from '../ai/ai.types';
import { ProductStatus } from './product-status';
import { AttributeValidatorService } from '../attributes/attribute-validator.service';

/**
 * AI 增强分析结果
 */
export interface AIEnhancementResult {
  translatedTitle: string;
  translatedDescription?: string;
  aiCategorySlug?: string;
  aiBrandId?: string;
  aiBrandSlug?: string;
  aiBrandName?: string;
  aiAttributes: Record<string, unknown>;
  aiConfidence: number;
  warnings: string[];
}

/**
 * 综合分析增强结果 (v2.1) - 包含混合商品检测
 */
export interface ComprehensiveEnhancementResult {
  // 基础信息（来自主分组或单商品）
  translatedTitle: string;
  translatedDescription?: string;
  aiCategorySlug?: string;
  aiBrandSlug?: string;
  aiBrandName?: string;
  aiAttributes: Record<string, unknown>;
  aiConfidence: number;
  warnings: string[];

  // 混合商品检测 (v2.1)
  comprehensiveAnalysis: ComprehensiveProductAnalysis;
  processingStrategy: ProcessingStrategy;
  isMixedProduct: boolean;
  mixednessScore: number;
}

/**
 * 品牌处理结果
 */
export interface BrandProcessingResult {
  brandId?: string;
  aiBrandSlug?: string;
  aiBrandName?: string;
  warnings: string[];
}

interface BrandProcessingOptions {
  brandSlug?: string;
  exactMatchOnly?: boolean;
  fallbackToDesign?: boolean;
}

/**
 * ProductAIEnhancerService
 * 负责商品的 AI 增强处理：
 * - 图片分析
 * - 品牌识别
 * - 分类推荐
 * - 标题/描述翻译
 */
@Injectable()
export class ProductAIEnhancerService {
  private readonly logger = new Logger(ProductAIEnhancerService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly categoriesService: CategoriesService,
    private readonly aiService: AIService,
    private readonly aiParserService: AIResponseParserService,
    private readonly brandsService: BrandsService,
    private readonly attributeValidator: AttributeValidatorService,
  ) {}

  private normalizeWhitespace(value?: string | null): string {
    return value?.replace(/\s+/g, ' ').trim() || '';
  }

  private sanitizeTitleFragment(value?: string | null): string {
    return this.normalizeWhitespace(
      value
        ?.replace(/[\u3400-\u9FFF\uF900-\uFAFF]/g, ' ')
        .replace(/[（）【】［］「」『』《》、，。：；！？]/g, ' ')
        .replace(/[_]+/g, ' ')
        .replace(/\s*\/\s*/g, ' / ') || '',
    );
  }

  private normalizeMatchWord(word: string): string {
    if (word.endsWith('ies') && word.length > 4) {
      return `${word.slice(0, -3)}y`;
    }
    if (word.endsWith('sses') && word.length > 5) {
      return word.slice(0, -2);
    }
    if (word.endsWith('ses') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 3) {
      return word.slice(0, -1);
    }
    return word;
  }

  private normalizeTitleMatchWords(value: string): string[] {
    return this.sanitizeTitleFragment(value)
      .toLowerCase()
      .replace(/[^a-z0-9/\s-]/g, ' ')
      .split(/[\s/-]+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => this.normalizeMatchWord(segment));
  }

  private toTitleCase(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) =>
        /^[A-Z0-9-]+$/.test(segment)
          ? segment
          : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
      )
      .join(' ');
  }

  private humanizeCategorySlug(
    categorySlug?: string,
    availableCategories?: Array<{
      slug: string;
      name?: string;
      nameEn?: string | null;
    }>,
  ): string | undefined {
    const normalizedSlug = this.normalizeWhitespace(categorySlug);
    if (!normalizedSlug) return undefined;

    const matchedCategory = availableCategories?.find(
      (category) => category.slug === normalizedSlug,
    );
    const preferredLabel = this.normalizeWhitespace(matchedCategory?.nameEn);
    if (preferredLabel) {
      return this.formatEnglishCategoryLabel(preferredLabel);
    }

    return this.formatEnglishCategoryLabel(normalizedSlug);
  }

  private formatEnglishCategoryLabel(value: string): string {
    const normalized = this.sanitizeTitleFragment(value)
      .toLowerCase()
      .replace(/[/_]+/g, ' ')
      .replace(/[-]+/g, ' ')
      .replace(/\btops?\s+t\s+shirts?\b/g, 't shirts')
      .replace(/\btops?\s+t\s+shirt\b/g, 't shirt')
      .replace(/\bt\s+shirts?\b/g, 't shirts')
      .replace(/\bt\s+shirt\b/g, 't shirt');

    const titleCased = this.toTitleCase(normalized);
    return titleCased
      .replace(/\bT Shirt\b/g, 'T-Shirt')
      .replace(/\bT Shirts\b/g, 'T-Shirts');
  }

  private titleContainsToken(title: string, token: string): boolean {
    const titleWords = new Set(this.normalizeTitleMatchWords(title));
    const tokenWords = this.normalizeTitleMatchWords(token);

    if (titleWords.size === 0 || tokenWords.length === 0) {
      return false;
    }

    return tokenWords.every((word) => titleWords.has(word));
  }

  private buildStructuredTitle(params: {
    aiTitle?: string;
    defaultTitle?: string;
    brandName?: string;
    categorySlug?: string;
    aiAttributes?: Record<string, unknown>;
    availableCategories?: Array<{
      slug: string;
      name?: string;
      nameEn?: string | null;
    }>;
  }): { title: string; usedAssembler: boolean } {
    const brandToken = this.sanitizeTitleFragment(params.brandName) || 'Design';
    const categoryToken =
      this.humanizeCategorySlug(
        params.categorySlug,
        params.availableCategories,
      ) || 'Product';
    const primaryColor = Array.isArray(params.aiAttributes?.colors)
      ? this.sanitizeTitleFragment(String(params.aiAttributes.colors[0] || ''))
      : '';

    const preferredTitle =
      this.sanitizeTitleFragment(params.aiTitle) ||
      this.sanitizeTitleFragment(params.defaultTitle);

    if (
      preferredTitle &&
      this.titleContainsToken(preferredTitle, brandToken) &&
      this.titleContainsToken(preferredTitle, categoryToken)
    ) {
      return { title: preferredTitle, usedAssembler: false };
    }

    const escapeRegExp = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const baseTitle = preferredTitle
      .replace(new RegExp(`^${escapeRegExp(brandToken)}\\s+`, 'i'), '')
      .replace(new RegExp(`\\s+${escapeRegExp(categoryToken)}$`, 'i'), '')
      .trim();

    const parts = [brandToken];
    if (baseTitle) {
      parts.push(baseTitle);
    } else if (
      primaryColor &&
      !this.titleContainsToken(categoryToken, primaryColor)
    ) {
      parts.push(this.toTitleCase(primaryColor));
    }
    parts.push(categoryToken);

    return {
      title: this.sanitizeTitleFragment(parts.filter(Boolean).join(' ')),
      usedAssembler: true,
    };
  }

  /**
   * 使用 AI 分析商品图片并增强商品信息
   */
  async analyzeAndEnhance(
    images: string[],
    defaultTitle: string,
    defaultDescription?: string,
  ): Promise<AIEnhancementResult> {
    const warnings: string[] = [];
    let translatedTitle = defaultTitle;
    let translatedDescription = defaultDescription;
    let aiCategorySlug: string | undefined;
    let aiBrandId: string | undefined;
    let aiBrandSlug: string | undefined;
    let aiBrandName: string | undefined;
    let aiAttributes: Record<string, unknown> = {};
    let aiConfidence = 0;

    if (!this.aiService || !images || images.length === 0) {
      return {
        translatedTitle,
        translatedDescription,
        aiCategorySlug,
        aiBrandId,
        aiBrandSlug,
        aiBrandName,
        aiAttributes,
        aiConfidence,
        warnings,
      };
    }

    try {
      this.logger.log('使用 AI 图片综合分析...');

      const [availableBrands, availableCategories] = await Promise.all([
        this.brandsService.findActivePromptBrands(),
        this.categoriesService.findActivePromptCategories(),
      ]);

      const aiResult = await this.aiService.analyzeProductImage(
        images,
        availableBrands,
        availableCategories,
      );

      aiConfidence = aiResult.confidence;
      const resolvedBrand = await this.resolveClosedSetAiBrand(
        aiResult.brandSlug,
        aiResult.brandName,
        availableBrands,
      );
      aiBrandId = resolvedBrand.brand?.id;
      aiBrandSlug = resolvedBrand.brand?.slug;
      aiBrandName = resolvedBrand.brand?.name;
      warnings.push(...resolvedBrand.warnings);

      aiCategorySlug = aiResult.category;
      aiAttributes = (aiResult.attributes as Record<string, unknown>) || {};
      translatedDescription = aiResult.description || translatedDescription;

      const assembledTitle = this.buildStructuredTitle({
        aiTitle: aiResult.title,
        defaultTitle: translatedTitle,
        brandName: aiBrandName,
        categorySlug: aiCategorySlug,
        aiAttributes,
        availableCategories,
      });
      translatedTitle = assembledTitle.title;

      this.logger.log(
        `AI 图片分析成功 (置信度: ${aiResult.confidence}): ${translatedTitle}`,
      );
      if (assembledTitle.usedAssembler) {
        warnings.push('AI 标题已自动组装为品牌 + 分类格式');
      }
      if (aiResult.confidence <= 0.5) {
        warnings.push(`AI 图片分析置信度较低 (${aiResult.confidence})`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`AI 图片分析失败: ${message}`);
    }

    // Normalize AI attributes through the validator
    try {
      const { normalized } =
        await this.attributeValidator.validateAndResolve(aiAttributes);
      if (normalized.gender) aiAttributes.gender = normalized.gender;
      if (normalized.styles.length) aiAttributes.styles = normalized.styles;
      if (normalized.occasions.length)
        aiAttributes.occasions = normalized.occasions;
      if (normalized.seasons.length) aiAttributes.seasons = normalized.seasons;
      if (normalized.colors.length) aiAttributes.colors = normalized.colors;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Attribute validation failed: ${message}`);
    }

    return {
      translatedTitle,
      translatedDescription,
      aiCategorySlug,
      aiBrandId,
      aiBrandSlug,
      aiBrandName,
      aiAttributes,
      aiConfidence,
      warnings,
    };
  }

  /**
   * 根据 AI 推荐的分类 slug 查找分类 ID
   */
  async resolveCategoryFromSlug(
    aiCategorySlug: string,
  ): Promise<string | undefined> {
    const categoryId =
      await this.categoriesService.findCategoryIdByAiSlug(aiCategorySlug);

    if (!categoryId) {
      return undefined;
    }

    try {
      const leafCategory =
        await this.categoriesService.ensureCanonicalLeafCategory(categoryId);
      this.logger.log(`使用 AI 推荐规范叶子分类: ${leafCategory.slug}`);
      return leafCategory.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI 推荐分类 "${aiCategorySlug}" 不是可用的规范叶子分类，已拒绝: ${message}`,
      );
    }

    return undefined;
  }

  /**
   * 处理品牌：
   * - 主自动化链路使用 exactMatchOnly + fallbackToDesign，未命中时绑定 Design
   * - 兼容历史/人工链路时，仍可回退到候选池治理
   */
  async processBrand(
    brandId?: string,
    brandName?: string,
    options: BrandProcessingOptions = {},
  ): Promise<BrandProcessingResult> {
    const warnings: string[] = [];
    let resolvedBrandId = brandId;
    let resolvedBrandSlug = options.brandSlug?.trim();
    let aiBrandName = brandName?.trim();

    if (resolvedBrandId?.trim()) {
      const existingBrand =
        await this.brandsService.findActiveApprovedBrandById(resolvedBrandId);
      if (existingBrand) {
        this.logger.log(`使用传入的品牌 ID: ${resolvedBrandId}`);
        return {
          brandId: existingBrand.id,
          aiBrandSlug: existingBrand.slug,
          aiBrandName: existingBrand.name,
          warnings,
        };
      }

      warnings.push(`品牌 ID 无效，已尝试按品牌名重新解析: ${resolvedBrandId}`);
      resolvedBrandId = undefined;
    }

    if (resolvedBrandSlug) {
      const promptBrandMatch = await this.resolvePromptBrandReference(
        resolvedBrandSlug,
        aiBrandName,
      );
      if (promptBrandMatch.brand) {
        if (promptBrandMatch.warning) {
          warnings.push(promptBrandMatch.warning);
        }
        return {
          brandId: promptBrandMatch.brand.id,
          aiBrandSlug: promptBrandMatch.brand.slug,
          aiBrandName: promptBrandMatch.brand.name,
          warnings,
        };
      }
    }

    if (aiBrandName) {
      const exactBrand =
        await this.brandsService.findActiveApprovedBrandByExactName(
          aiBrandName,
        );
      if (exactBrand) {
        return {
          brandId: exactBrand.id,
          aiBrandSlug: exactBrand.slug,
          aiBrandName: exactBrand.name,
          warnings,
        };
      }

      const promptBrandMatch = await this.resolvePromptBrandReference(
        resolvedBrandSlug,
        aiBrandName,
      );
      if (promptBrandMatch.brand) {
        if (promptBrandMatch.warning) {
          warnings.push(promptBrandMatch.warning);
        }
        return {
          brandId: promptBrandMatch.brand.id,
          aiBrandSlug: promptBrandMatch.brand.slug,
          aiBrandName: promptBrandMatch.brand.name,
          warnings,
        };
      }

      if (options.exactMatchOnly) {
        if (options.fallbackToDesign) {
          return this.applyDesignFallback(aiBrandName, warnings, true);
        }
        warnings.push(`品牌未命中标准品牌: ${aiBrandName}`);
        return {
          brandId: undefined,
          aiBrandSlug: resolvedBrandSlug,
          aiBrandName,
          warnings,
        };
      }

      this.logger.log(`处理品牌: ${aiBrandName}`);

      // 最多重试 2 次
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const brand =
            await this.brandsService.findOrCreateByName(aiBrandName);
          if (brand) {
            resolvedBrandId = brand.id;
            resolvedBrandSlug = brand.slug;
            aiBrandName = brand.name;
            this.logger.log(
              `品牌处理成功: "${aiBrandName}" → "${brand.name}" (ID: ${brand.id})`,
            );
            break;
          } else {
            this.logger.warn(
              `品牌未命中，已进入候选池: "${aiBrandName}" (第 ${attempt} 次尝试)`,
            );
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `品牌匹配/创建失败: "${aiBrandName}" (第 ${attempt} 次尝试): ${message}`,
          );
          if (attempt === 2) {
            warnings.push(`品牌匹配/创建失败: ${message}`);
          }
        }
      }

      if (!resolvedBrandId) {
        if (options.fallbackToDesign) {
          return this.applyDesignFallback(aiBrandName, warnings, true);
        }
        this.logger.warn(
          `品牌 "${aiBrandName}" 未命中正式品牌，产品将保留待审核品牌信息`,
        );
        warnings.push(`品牌未命中正式品牌，已进入候选审核: ${aiBrandName}`);
      }
    } else {
      if (options.fallbackToDesign) {
        return this.applyDesignFallback(undefined, warnings, false);
      }
      this.logger.log('未能识别品牌，将显示为未知品牌');
    }

    return {
      brandId: resolvedBrandId,
      aiBrandSlug: resolvedBrandSlug,
      aiBrandName,
      warnings,
    };
  }

  private async resolveClosedSetAiBrand(
    selectedBrandSlug: string | undefined,
    selectedBrandName: string | undefined,
    availableBrands: Array<{ id: string; name: string; slug: string }>,
  ): Promise<{
    brand?: { id: string; name: string; slug: string };
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const promptBrandMatch = this.findBestPromptBrandMatch(
      selectedBrandSlug,
      selectedBrandName,
      availableBrands,
    );

    if (promptBrandMatch.brand) {
      if (promptBrandMatch.warning) {
        warnings.push(promptBrandMatch.warning);
      }
      return {
        brand: promptBrandMatch.brand,
        warnings,
      };
    }

    if (selectedBrandSlug || selectedBrandName) {
      warnings.push(
        `AI 返回了候选集之外或无法稳定归一化的品牌 "${selectedBrandName || selectedBrandSlug}"，已回退到 Design`,
      );
    } else {
      warnings.push('AI 未识别出品牌，已回退到 Design');
    }

    const designBrand =
      availableBrands.find((brand) => brand.slug === 'design') ||
      ((await this.brandsService.findDesignFallbackBrand()) ?? undefined);

    if (designBrand) {
      return {
        brand: designBrand,
        warnings,
      };
    }

    warnings.push('Design 兜底品牌不存在，品牌绑定将留空');
    return { warnings };
  }

  private async applyDesignFallback(
    originalBrandName: string | undefined,
    warnings: string[],
    preserveOriginalWarning: boolean,
  ): Promise<BrandProcessingResult> {
    const designBrand = await this.brandsService.findDesignFallbackBrand();
    if (!designBrand) {
      warnings.push('Design 兜底品牌不存在，品牌绑定失败');
      return {
        brandId: undefined,
        aiBrandSlug: undefined,
        aiBrandName: originalBrandName,
        warnings,
      };
    }

    if (preserveOriginalWarning && originalBrandName) {
      warnings.push(
        `品牌 "${originalBrandName}" 未命中标准品牌，已绑定兜底品牌 Design`,
      );
    } else {
      warnings.push('未识别到可用品牌，已绑定兜底品牌 Design');
    }

    return {
      brandId: designBrand.id,
      aiBrandSlug: designBrand.slug,
      aiBrandName: designBrand.name,
      warnings,
    };
  }

  private async resolvePromptBrandReference(
    brandSlug: string | undefined,
    brandName: string | undefined,
  ): Promise<{
    brand?: { id: string; name: string; slug: string };
    warning?: string;
  }> {
    const availableBrands = await this.brandsService.findActivePromptBrands();
    return this.findBestPromptBrandMatch(brandSlug, brandName, availableBrands);
  }

  private findBestPromptBrandMatch(
    selectedBrandSlug: string | undefined,
    selectedBrandName: string | undefined,
    availableBrands: Array<{ id: string; name: string; slug: string }>,
  ): {
    brand?: { id: string; name: string; slug: string };
    warning?: string;
  } {
    const normalizedSlug = this.normalizeBrandSlug(selectedBrandSlug);
    const normalizedName = this.normalizeBrandLabel(selectedBrandName);

    if (normalizedSlug) {
      const slugMatch = availableBrands.find(
        (brand) => brand.slug.toLowerCase() === normalizedSlug,
      );
      if (slugMatch) {
        return { brand: slugMatch };
      }
    }

    if (normalizedName) {
      const normalizedNameMatches = availableBrands.filter(
        (brand) => this.normalizeBrandLabel(brand.name) === normalizedName,
      );
      if (normalizedNameMatches.length === 1) {
        const matchedBrand = normalizedNameMatches[0];
        const requiresNormalization =
          matchedBrand.name !== selectedBrandName?.trim();
        return {
          brand: matchedBrand,
          warning: requiresNormalization
            ? `品牌 "${selectedBrandName}" 已归一化到标准品牌 "${matchedBrand.name}"`
            : undefined,
        };
      }

      const nearExactMatch = this.findNearExactPromptBrandMatch(
        normalizedName,
        availableBrands,
      );
      if (nearExactMatch) {
        return {
          brand: nearExactMatch,
          warning: `品牌 "${selectedBrandName}" 与标准品牌 "${nearExactMatch.name}" 近似命中，已自动归一化`,
        };
      }
    }

    return {};
  }

  private normalizeBrandSlug(value?: string): string | undefined {
    const normalized = value?.trim().toLowerCase();
    return normalized || undefined;
  }

  private normalizeBrandLabel(value?: string): string | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/['’`".]/g, '')
      .replace(/[-_/+]+/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized || undefined;
  }

  private findNearExactPromptBrandMatch(
    normalizedName: string,
    availableBrands: Array<{ id: string; name: string; slug: string }>,
  ): { id: string; name: string; slug: string } | undefined {
    if (normalizedName.length < 5) {
      return undefined;
    }

    const rankedMatches = availableBrands
      .map((brand) => {
        const normalizedBrandName = this.normalizeBrandLabel(brand.name);
        if (!normalizedBrandName) {
          return null;
        }

        const distance = this.computeLevenshteinDistance(
          normalizedName,
          normalizedBrandName,
        );
        const maxLength = Math.max(
          normalizedName.length,
          normalizedBrandName.length,
        );
        const similarity = maxLength > 0 ? 1 - distance / maxLength : 0;

        return {
          brand,
          distance,
          similarity,
        };
      })
      .filter(
        (
          item,
        ): item is {
          brand: { id: string; name: string; slug: string };
          distance: number;
          similarity: number;
        } => Boolean(item),
      )
      .sort((a, b) => {
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }
        return a.distance - b.distance;
      });

    const bestMatch = rankedMatches[0];
    const secondBestMatch = rankedMatches[1];

    if (!bestMatch) {
      return undefined;
    }

    const hasStrongDistance = bestMatch.distance <= 2;
    const hasStrongSimilarity = bestMatch.similarity >= 0.9;
    const hasClearLead =
      !secondBestMatch ||
      bestMatch.similarity - secondBestMatch.similarity >= 0.03;

    if (hasStrongDistance && hasStrongSimilarity && hasClearLead) {
      return bestMatch.brand;
    }

    return undefined;
  }

  private computeLevenshteinDistance(a: string, b: string): number {
    if (a === b) {
      return 0;
    }

    if (a.length === 0) {
      return b.length;
    }

    if (b.length === 0) {
      return a.length;
    }

    const dp = Array.from({ length: a.length + 1 }, () =>
      Array<number>(b.length + 1).fill(0),
    );

    for (let i = 0; i <= a.length; i += 1) {
      dp[i][0] = i;
    }

    for (let j = 0; j <= b.length; j += 1) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[a.length][b.length];
  }

  /**
   * 根据 AI 置信度决定商品状态
   *
   * 置信度规则：
   * - >= 0.60: active (自动上架)
   * - >= 0.40: pending_review (待审核)
   * - < 0.40: draft (草稿)
   * - undefined/null: pending_review (安全降级，避免产品被遗忘在草稿箱)
   */
  determineStatusByConfidence(
    aiConfidence: number | undefined | null,
    overrideStatus?: ProductStatus,
  ): ProductStatus {
    if (overrideStatus) {
      return overrideStatus;
    }

    // 安全检查：置信度为 undefined/null 时，进入待审核而不是草稿
    // 这样可以确保产品不会被遗忘在草稿箱中
    if (
      aiConfidence === undefined ||
      aiConfidence === null ||
      isNaN(aiConfidence)
    ) {
      this.logger.warn(`置信度为 ${aiConfidence}，安全降级到待审核状态`);
      return ProductStatus.PENDING_REVIEW;
    }

    // 激进策略：60% 以上直接上架，让更多商品自动发布
    if (aiConfidence >= 0.6) {
      this.logger.log(`置信度 ${aiConfidence} >= 0.60，自动上架`);
      return ProductStatus.ACTIVE;
    }

    if (aiConfidence >= 0.4) {
      this.logger.log(`置信度 ${aiConfidence} >= 0.40，进入待审核`);
      return ProductStatus.PENDING_REVIEW;
    }

    this.logger.log(`置信度 ${aiConfidence} < 0.40，保存为草稿`);
    return ProductStatus.DRAFT;
  }

  // ============================================================
  // 综合分析方法 (v2.1) - 混合商品检测
  // ============================================================

  /**
   * 使用综合分析检测混合商品 (v2.1)
   *
   * 该方法分析所有图片，检测是否为混合商品（多品牌/多款式），
   * 并返回处理策略建议和分组信息。
   *
   * @param images 所有商品图片 URL
   * @param skuHints SKU 属性提示（可选，帮助 AI 更好识别）
   * @param defaultTitle 默认标题（用于降级）
   * @param defaultDescription 默认描述（用于降级）
   */
  async analyzeAndEnhanceComprehensive(
    images: string[],
    skuHints?: SkuAttributeHint[],
    defaultTitle?: string,
    defaultDescription?: string,
  ): Promise<ComprehensiveEnhancementResult> {
    const warnings: string[] = [];

    // 降级默认值
    const fallbackResult: ComprehensiveEnhancementResult = {
      translatedTitle: defaultTitle || 'Untitled Product',
      translatedDescription: defaultDescription,
      aiCategorySlug: undefined,
      aiBrandSlug: undefined,
      aiBrandName: undefined,
      aiAttributes: {},
      aiConfidence: 0,
      warnings: ['综合分析未执行或失败'],
      comprehensiveAnalysis: this.createFallbackComprehensiveAnalysis(
        images.length,
      ),
      processingStrategy: 'manual_review',
      isMixedProduct: false,
      mixednessScore: 0,
    };

    if (!this.aiService || !images || images.length === 0) {
      return fallbackResult;
    }

    try {
      const [availableBrands, availableCategories] = await Promise.all([
        this.brandsService.findActivePromptBrands(),
        this.categoriesService.findActivePromptCategories(),
      ]);

      // v3.0: 两阶段分析阈值 - 超过此数量使用两阶段分析避免超时
      const TWO_PHASE_THRESHOLD = 20;
      // 简化模式阈值 - 15-20张图片使用简化模式
      const SIMPLIFIED_THRESHOLD = 15;

      let comprehensiveAnalysis;

      if (images.length > TWO_PHASE_THRESHOLD) {
        // v3.0: 图片数量多时使用两阶段分析
        // 阶段1: 快速扫描所有图片识别品牌（极简输出，不会截断）
        // 阶段2: 按品牌分批生成详情（每批10-20张，输出可控）
        this.logger.log(
          `图片数量 ${images.length} 超过阈值，使用两阶段分析模式`,
        );
        comprehensiveAnalysis = await this.aiService.analyzeTwoPhase(
          images,
          availableBrands,
          availableCategories,
        );
      } else {
        // 原有逻辑：单次分析
        const useSimplifiedMode = images.length > SIMPLIFIED_THRESHOLD;

        if (useSimplifiedMode) {
          this.logger.log(`图片数量 ${images.length} 较多，使用简化输出模式`);
        }

        this.logger.log(`开始综合分析 ${images.length} 张图片...`);
        this.logger.log(`使用 canonical brand list 进行综合分析`);

        // 调用综合分析（传递 canonical brand list，让 AI 闭集选择）
        comprehensiveAnalysis =
          await this.aiService.analyzeProductComprehensive(
            images,
            availableBrands,
            availableCategories,
            skuHints,
            useSimplifiedMode,
          );
      }

      // 计算实际品牌数量（后备校验）
      const uniqueBrands = new Set(
        comprehensiveAnalysis.suggestedGroups
          .map((g) => g.brand?.toLowerCase())
          .filter(Boolean),
      );
      const actualBrandCount = uniqueBrands.size;

      // 防御性检查：确保 mixednessScore 是对象格式
      // AI 可能返回数字（如 0）而不是对象 {overallScore: 0, ...}
      const rawMixednessScore = comprehensiveAnalysis.overview
        .mixednessScore as unknown;
      if (
        typeof rawMixednessScore === 'number' ||
        rawMixednessScore === null ||
        rawMixednessScore === undefined
      ) {
        const scoreValue =
          typeof rawMixednessScore === 'number' ? rawMixednessScore : 0;
        this.logger.warn(
          `mixednessScore 是数字或无效值 (${rawMixednessScore})，转换为对象格式`,
        );
        comprehensiveAnalysis.overview.mixednessScore = {
          overallScore: scoreValue,
          brandDiversity: 0,
          modelDiversity: 0,
          visualConsistency: 1 - scoreValue,
        };
      }

      // 如果AI返回的混合度与实际品牌数量不符，进行修正
      let mixednessScore =
        comprehensiveAnalysis.overview.mixednessScore.overallScore;
      let isMixedProduct = comprehensiveAnalysis.overview.isRecommendedToSplit;

      // 修复1: 处理 mixednessScore 为 NaN 或 undefined 的情况
      if (
        mixednessScore === undefined ||
        mixednessScore === null ||
        isNaN(mixednessScore)
      ) {
        this.logger.warn(
          `mixednessScore 无效 (${mixednessScore})，根据品牌数量设置默认值`,
        );
        // 如果有多品牌，设置为0.5；否则设置为0
        mixednessScore = actualBrandCount > 1 ? 0.5 : 0;
        comprehensiveAnalysis.overview.mixednessScore.overallScore =
          mixednessScore;
        warnings.push(`mixednessScore 无效，已修正为 ${mixednessScore}`);
      }

      // 修复2: 单品牌但AI返回高混合度的情况（误判修正）
      const groupCount = comprehensiveAnalysis.suggestedGroups.length;
      if (actualBrandCount <= 1 && groupCount <= 1 && mixednessScore > 0.3) {
        this.logger.warn(
          `混合度误判修正: AI返回 ${(mixednessScore * 100).toFixed(0)}%, ` +
            `但只检测到 ${actualBrandCount} 个品牌, ${groupCount} 个分组, ` +
            `修正为 0%`,
        );
        mixednessScore = 0;
        isMixedProduct = false;
        comprehensiveAnalysis.overview.mixednessScore.overallScore = 0;
        comprehensiveAnalysis.overview.mixednessScore.brandDiversity = 0;
        comprehensiveAnalysis.overview.isRecommendedToSplit = false;
        comprehensiveAnalysis.overview.splitReason = undefined;
        warnings.push(`单品牌单分组但混合度过高，已修正为非混合商品`);
      }

      // 修复3: 低混合度但 isMixedProduct=true 的不一致情况
      // AI 可能返回 mixednessScore=0 但 isMixedProduct=true，需要修正
      if (mixednessScore <= 0.1 && isMixedProduct) {
        this.logger.warn(
          `混合标志修正: mixednessScore=${(mixednessScore * 100).toFixed(0)}% ` +
            `但 isMixedProduct=true，修正为非混合商品`,
        );
        isMixedProduct = false;
        comprehensiveAnalysis.overview.isRecommendedToSplit = false;
        comprehensiveAnalysis.overview.splitReason = undefined;
        warnings.push(
          `低混合度(${(mixednessScore * 100).toFixed(0)}%)但标记为混合，已修正`,
        );
      }

      if (actualBrandCount > 1 && mixednessScore < 0.5) {
        // 实际有多品牌但AI返回低混合度，修正
        // 确保修正后分数 >= 0.5，与混合商品列表查询阈值一致
        const correctedScore = Math.max(
          0.5,
          Math.min(0.9, 0.3 + (actualBrandCount - 1) * 0.15),
        );
        this.logger.warn(
          `混合度修正: AI返回 ${(mixednessScore * 100).toFixed(0)}%, ` +
            `但检测到 ${actualBrandCount} 个品牌 (${[...uniqueBrands].join(', ')}), ` +
            `修正为 ${(correctedScore * 100).toFixed(0)}%`,
        );
        mixednessScore = correctedScore;
        isMixedProduct = true;
        comprehensiveAnalysis.overview.mixednessScore.overallScore =
          correctedScore;
        comprehensiveAnalysis.overview.mixednessScore.brandDiversity = Math.min(
          1,
          (actualBrandCount - 1) / 5,
        );
        comprehensiveAnalysis.overview.isRecommendedToSplit = true;
        comprehensiveAnalysis.overview.splitReason = `检测到 ${actualBrandCount} 个不同品牌: ${[...uniqueBrands].join(', ')}`;
      }

      // 确定处理策略
      const processingStrategy = this.determineProcessingStrategy(
        comprehensiveAnalysis,
      );

      // 从主分组提取基础信息
      const primaryGroup = comprehensiveAnalysis.suggestedGroups[0];
      const translatedTitle =
        primaryGroup?.productInfo.title || 'Untitled Product';
      const translatedDescription =
        primaryGroup?.productInfo.description || defaultDescription;
      const aiCategorySlug = primaryGroup?.productInfo.category;
      const aiAttributes =
        (primaryGroup?.productInfo.attributes as Record<string, unknown>) || {};
      let aiBrandSlug: string | undefined = primaryGroup?.brandSlug;

      // 品牌名提取（含降级逻辑）
      let aiBrandName: string | undefined = primaryGroup?.brand;

      // 如果 AI 未识别品牌或返回 Unknown，尝试从原始标题中提取
      if (!aiBrandName || aiBrandName === 'Unknown') {
        const extractedBrand = this.aiParserService.extractBrandFromTitle(
          defaultTitle || '',
        );
        if (extractedBrand) {
          this.logger.log(
            `AI 品牌识别失败，从原始标题中提取到品牌: "${extractedBrand}"`,
          );
          aiBrandName = extractedBrand;
          warnings.push(`品牌从原始标题提取: ${extractedBrand}`);
        }
      }

      const resolvedPrimaryBrand = await this.resolveClosedSetAiBrand(
        aiBrandSlug,
        aiBrandName,
        availableBrands,
      );
      aiBrandSlug = resolvedPrimaryBrand.brand?.slug;
      aiBrandName = resolvedPrimaryBrand.brand?.name;
      warnings.push(...resolvedPrimaryBrand.warnings);

      // 合并警告
      if (comprehensiveAnalysis.warnings) {
        warnings.push(...comprehensiveAnalysis.warnings);
      }

      // 添加混合商品警告
      if (isMixedProduct) {
        warnings.push(
          `检测到混合商品 (混合度: ${(mixednessScore * 100).toFixed(0)}%)，` +
            `包含 ${comprehensiveAnalysis.suggestedGroups.length} 个不同商品组。` +
            `建议拆分原因: ${comprehensiveAnalysis.overview.splitReason || '多品牌/多款式'}`,
        );
      }

      this.logger.log(
        `综合分析完成: 混合度=${(mixednessScore * 100).toFixed(0)}%, ` +
          `建议拆分=${isMixedProduct}, 分组数=${comprehensiveAnalysis.suggestedGroups.length}, ` +
          `策略=${processingStrategy}`,
      );

      // 确保 aiConfidence 有有效值（双重防护）
      const aiConfidence = comprehensiveAnalysis.overallConfidence ?? 0.5;
      if (comprehensiveAnalysis.overallConfidence === undefined) {
        this.logger.warn(
          `综合分析返回的 overallConfidence 为 undefined，使用默认值 0.5`,
        );
        warnings.push('aiConfidence 使用默认值 0.5');
      }

      // Normalize AI attributes through the validator
      try {
        const { normalized } =
          await this.attributeValidator.validateAndResolve(aiAttributes);
        if (normalized.gender) aiAttributes.gender = normalized.gender;
        if (normalized.styles.length) aiAttributes.styles = normalized.styles;
        if (normalized.occasions.length)
          aiAttributes.occasions = normalized.occasions;
        if (normalized.seasons.length)
          aiAttributes.seasons = normalized.seasons;
        if (normalized.colors.length) aiAttributes.colors = normalized.colors;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Attribute validation failed: ${message}`);
      }

      return {
        translatedTitle,
        translatedDescription,
        aiCategorySlug,
        aiBrandSlug,
        aiBrandName,
        aiAttributes,
        aiConfidence,
        warnings,
        comprehensiveAnalysis,
        processingStrategy,
        isMixedProduct,
        mixednessScore,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`综合分析失败: ${message}`);
      fallbackResult.warnings.push(`综合分析失败: ${message}`);
      return fallbackResult;
    }
  }

  /**
   * 根据综合分析结果确定处理策略
   */
  private determineProcessingStrategy(
    analysis: ComprehensiveProductAnalysis,
  ): ProcessingStrategy {
    const { mixednessScore, isRecommendedToSplit, detectedBrands } =
      analysis.overview;
    const groupCount = analysis.suggestedGroups.length;
    const overallConfidence = analysis.overallConfidence;
    const detectedBrandCount = detectedBrands?.length || 0;

    // **最高优先级检查**：如果检测到多个品牌且混合度高，必须作为混合商品处理
    // 这是为了处理 JSON 被截断但 overview 数据完整的情况
    if (detectedBrandCount > 1 && mixednessScore.overallScore >= 0.6) {
      this.logger.log(
        `高混合度检测: ${detectedBrandCount} 个品牌, 混合度 ${(mixednessScore.overallScore * 100).toFixed(0)}%, ` +
          `标记为混合商品 (品牌: ${detectedBrands?.slice(0, 5).join(', ')}${detectedBrandCount > 5 ? '...' : ''})`,
      );
      return 'split_products';
    }

    // **次优先级检查**：AI 明确建议拆分
    if (isRecommendedToSplit && detectedBrandCount > 1) {
      this.logger.log(`AI 建议拆分: 检测到 ${detectedBrandCount} 个品牌`);
      return 'split_products';
    }

    // 置信度太低，需要人工审核
    if (overallConfidence < 0.5) {
      // 但如果检测到多品牌，仍然标记为混合商品需要审核
      if (detectedBrandCount > 1) {
        this.logger.log(
          `置信度低但检测到 ${detectedBrandCount} 个品牌，标记为混合商品待审核`,
        );
        return 'split_products';
      }
      this.logger.log('置信度 < 0.5，建议人工审核');
      return 'manual_review';
    }

    // 明确建议拆分且有多个分组
    if (isRecommendedToSplit && groupCount > 1) {
      this.logger.log(`建议拆分: ${groupCount} 个分组`);
      return 'split_products';
    }

    // **后备检查**：如果有多个分组且品牌不同，必须作为混合商品处理
    // 这是为了防止AI返回错误的mixednessScore/isRecommendedToSplit
    if (groupCount > 1) {
      const uniqueBrands = new Set(
        analysis.suggestedGroups
          .map((g) => g.brand?.toLowerCase())
          .filter(Boolean),
      );
      if (uniqueBrands.size > 1) {
        this.logger.log(
          `后备检查: 检测到 ${uniqueBrands.size} 个不同品牌 (${[...uniqueBrands].join(', ')}), ` +
            `强制作为混合商品处理`,
        );
        return 'split_products';
      }
    }

    // 混合度中等，可能是同款不同变体
    if (
      mixednessScore.overallScore >= 0.3 &&
      mixednessScore.overallScore < 0.6
    ) {
      // 品牌一致但款式有差异，可能是变体
      if (
        mixednessScore.brandDiversity < 0.2 &&
        mixednessScore.modelDiversity >= 0.3
      ) {
        this.logger.log('同品牌多款式，建议作为变体处理');
        return 'single_with_variants';
      }
    }

    // 混合度低，单商品处理
    if (mixednessScore.overallScore < 0.3) {
      this.logger.log('混合度低，单商品处理');
      return 'single_product';
    }

    // 其他情况，根据置信度决定
    if (overallConfidence >= 0.7) {
      return groupCount > 1 ? 'split_products' : 'single_product';
    }

    return 'manual_review';
  }

  /**
   * 创建降级的综合分析结果
   */
  private createFallbackComprehensiveAnalysis(
    imageCount: number,
  ): ComprehensiveProductAnalysis {
    return {
      overview: {
        totalImages: imageCount,
        mixednessScore: {
          brandDiversity: 0,
          modelDiversity: 0,
          visualConsistency: 1,
          overallScore: 0,
        },
        isRecommendedToSplit: false,
        detectedBrands: [],
        detectedModels: [],
      },
      perImageAnalysis: [],
      suggestedGroups: [],
      overallConfidence: 0,
      warnings: ['使用降级分析结果'],
    };
  }

  /**
   * 根据混合度评分决定商品状态 (v2.1)
   * 混合商品需要人工审核
   */
  determineStatusByMixedness(
    aiConfidence: number | undefined | null,
    isMixedProduct: boolean,
    processingStrategy: ProcessingStrategy,
    overrideStatus?: ProductStatus,
  ): ProductStatus {
    if (overrideStatus) {
      return overrideStatus;
    }

    // 混合商品需要人工拆分
    if (isMixedProduct || processingStrategy === 'split_products') {
      this.logger.log('检测到混合商品，进入待审核');
      return ProductStatus.PENDING_REVIEW;
    }

    // 需要人工审核
    if (processingStrategy === 'manual_review') {
      this.logger.log('处理策略为人工审核');
      return ProductStatus.PENDING_REVIEW;
    }

    // 使用原有的置信度逻辑
    return this.determineStatusByConfidence(aiConfidence);
  }
}
