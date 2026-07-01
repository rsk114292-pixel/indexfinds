import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  AIAttributeExtractionResult,
  ComprehensiveProductAnalysis,
  SkuAttributeHint,
  BrandScanResult,
  GroupDetailResult,
  ImageBrandClassificationResult,
} from './ai.types';
import {
  buildComprehensiveAnalysisPrompt,
  buildSimplifiedAnalysisPrompt,
} from './prompts/mixed-product-analysis.prompt';
import {
  buildBrandScanPrompt,
  buildGroupDetailPrompt,
  buildSingleBrandDetailPrompt,
  buildImageBrandClassificationPrompt,
} from './prompts/two-phase-analysis.prompt';
import { generateBrandRecognitionPrompt } from './brand-features';
import type { AIProvider } from './interfaces/ai-provider.interface';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { AIResponseParserService } from './ai-response-parser.service';
import { CategoryForPrompt, formatCategoryTree } from './prompts/category-tree';

/**
 * AIService - Facade 服务
 *
 * 聚合以下子服务：
 * - AIProvider (通过 AI_PROVIDER token 注入): API 调用和使用量统计
 * - AIResponseParserService: JSON 解析和修复
 *
 * 通过依赖注入 AIProvider 接口，遵循开闭原则 (OCP)：
 * 更换 AI 提供商只需修改 Module 中的 provider 配置。
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    private readonly parserService: AIResponseParserService,
  ) {}

  // ============================================================
  // 使用量统计 (委托给 AIApiService)
  // ============================================================

  async getUsageStats(): Promise<{ used: number; date: string }> {
    return this.aiProvider.getUsageStats();
  }

  // ============================================================
  // 单商品分析
  // ============================================================

  /**
   * 综合分析商品图片（一次调用返回标题、描述、属性、品牌、分类）
   * 使用 qwen3-vl-plus 多模态模型
   */
  async analyzeProductImage(
    imageUrls: string[],
    availableBrands?: Array<{ name: string; slug?: string }>,
    availableCategories?: CategoryForPrompt[],
  ): Promise<{
    title: string;
    description?: string;
    brandSlug?: string;
    brandName?: string;
    category?: string;
    attributes: AIAttributeExtractionResult;
    confidence: number;
  }> {
    if (!imageUrls || imageUrls.length === 0) {
      return {
        title: 'Untitled Product',
        attributes: {},
        confidence: 0.1,
      };
    }

    try {
      const brandLogoFeatures = generateBrandRecognitionPrompt();

      const knownBrandsList =
        availableBrands && availableBrands.length > 0
          ? availableBrands
              .map((b) => `- ${b.name} | slug: ${b.slug || ''}`)
              .join('\n')
          : '';

      const categoryHint =
        availableCategories && availableCategories.length > 0
          ? `\n\nAvailable categories (MUST choose from these, always pick the DEEPEST/most specific matching category):\n${formatCategoryTree(availableCategories)}`
          : '';

      const prompt = `你是时尚产品识别专家。分析商品图片，识别产品类型、品牌并生成商品信息。

## 第一步：识别产品类型
- 服装: T恤、卫衣、外套、裤子等
- 鞋类: 运动鞋、休闲鞋、靴子等
- 包袋: 双肩包、手提包、斜挎包等
- 配饰: 帽子、手表、项链、香水等

## 第二步：根据产品类型找LOGO
- 服装: 胸口印花、衣领标签、袖标、背面
- 鞋类: 鞋舌、鞋侧面、鞋后跟
- 包袋: 正面LOGO、五金件、内标
- 配饰: 表面刻字、吊牌

## 常见品牌特征
${brandLogoFeatures}

${knownBrandsList ? `## 可选品牌（brandSlug 和 brandName 都必须从以下列表中选择；如果无法确定，返回 Design / design）\n${knownBrandsList}` : ''}
${categoryHint}

## 返回JSON
{
  "title": "English title in Title Case, format: Brand + Model + Color/Feature + ProductType (e.g. Nike Air Force 1 Low White Sneakers). Collaboration: Brand A x Brand B + Model + Color/Feature + ProductType (e.g. Nike x Off-White Air Jordan 1 Chicago Sneakers)",
  "description": "500-800 chars English description (first 150 chars = key highlights for SEO, rest = details on design, comfort, occasions)",
  "brandSlug": "必须精确返回上方可选品牌中的 slug；无法确认时返回 design",
  "brandName": "必须精确返回与 brandSlug 对应的标准品牌名；无法确认时返回 Design",
  "category": "分类slug，必须选最深层子分类 (如 running-shoes 而非 sneakers, hoodie 而非 tops)",
  "confidence": 0.0,
  "attributes": {
    "colors": ["识别到的颜色"],
    "styles": ["Streetwear", "Casual", "Sporty等"],
    "occasions": ["Daily Wear", "Casual等"],
    "seasons": ["Spring", "Summer", "Fall", "Winter"],
    "gender": "men|women|unisex|kids"
  }
}

规则：
- 先识别产品类型，再从可用分类中选择最深层（最具体）的category。例如跑鞋选 running-shoes 而非 sneakers，卫衣选 hoodie 而非 tops，牛仔裤选 jeans 而非 bottoms
- brandSlug 和 brandName 必须和可选品牌列表中的同一行严格对应，不允许输出列表外的值；如果看不出来，直接返回 design / Design
- 标题：英文，Title Case，格式 Brand + Model/款式名 + 配色/特征 + ProductType。联名款格式 Brand A x Brand B + Model/款式名 + 配色/特征 + ProductType
- 描述：500-800字符英文，详细描述设计、舒适性、适用场景
- confidence: 返回 0-1 之间的小数，表示你对标题、品牌、分类整体判断的把握度
- colors: 只能从以下 19 种标准色中选择：Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple, Brown, Beige, Gold, Silver, Navy, Burgundy, Army Green, Transparent, Multicolor。如果颜色不确定归类，选最接近的大类。拼色/印花/渐变 → Multicolor
- gender必须小写`;

      const response = await this.aiProvider.analyzeImages(prompt, imageUrls);
      const result = JSON.parse(response);

      const validGenders = ['men', 'women', 'unisex', 'kids'];
      const attrs = result.attributes || {};
      const normalizedGender = attrs.gender?.toLowerCase();
      const parsedConfidence =
        typeof result.confidence === 'number'
          ? Math.max(0, Math.min(1, result.confidence))
          : Number.isFinite(Number(result.confidence))
            ? Math.max(0, Math.min(1, Number(result.confidence)))
            : 0.5;

      return {
        title: result.title || 'Untitled Product',
        description: result.description,
        brandSlug:
          typeof result.brandSlug === 'string' && result.brandSlug.trim()
            ? result.brandSlug.trim()
            : undefined,
        brandName: result.brandName || undefined,
        category: result.category,
        attributes: {
          colors: attrs.colors || [],
          styles: attrs.styles || [],
          occasions: attrs.occasions || [],
          seasons: attrs.seasons || [],
          gender: validGenders.includes(normalizedGender)
            ? normalizedGender
            : undefined,
        },
        confidence: parsedConfidence,
      };
    } catch (error) {
      this.logger.error(`图片综合分析失败: ${error.message}`);
      return {
        title: 'Untitled Product',
        attributes: {},
        confidence: 0.1,
      };
    }
  }

  // ============================================================
  // 混合商品综合分析 (v2.1)
  // ============================================================

  /**
   * 综合分析商品图片 - 单次调用返回完整分析结果 (v2.1)
   *
   * 功能：
   * - 分析所有图片（不限制数量）
   * - 判断是否为混合商品
   * - 返回每张图片的品牌/型号信息
   * - 返回分组建议和完整商品信息
   *
   * @param useSimplifiedMode 简化输出模式（图片多时使用，减少输出量避免超时）
   */
  async analyzeProductComprehensive(
    imageUrls: string[],
    availableBrands: Array<{ name: string; slug: string }> = [],
    availableCategories: CategoryForPrompt[] = [],
    skuAttributes?: SkuAttributeHint[],
    useSimplifiedMode = false,
  ): Promise<ComprehensiveProductAnalysis> {
    if (!imageUrls || imageUrls.length === 0) {
      this.logger.warn('综合分析：无图片输入，返回降级结果');
      return this.parserService.createFallbackAnalysis([]);
    }

    this.logger.log(
      `开始综合分析：${imageUrls.length} 张图片，${availableBrands.length} 个品牌${useSimplifiedMode ? '（简化模式）' : ''}`,
    );

    try {
      // 根据模式选择不同的 prompt
      // 简化模式：不要求 perImageAnalysis，减少输出量，避免超时
      const prompt = useSimplifiedMode
        ? buildSimplifiedAnalysisPrompt({
            imageCount: imageUrls.length,
            availableBrands,
            availableCategories,
          })
        : buildComprehensiveAnalysisPrompt({
            imageCount: imageUrls.length,
            availableBrands,
            availableCategories,
            skuAttributes,
          });

      const startTime = Date.now();
      const response = await this.aiProvider.analyzeMultipleImages(
        prompt,
        imageUrls,
      );
      const duration = Date.now() - startTime;

      this.logger.log(`综合分析完成，耗时 ${duration}ms`);

      const result =
        this.parserService.parseComprehensiveAnalysisResponse(response);

      this.parserService.validateComprehensiveAnalysis(
        result,
        imageUrls.length,
        useSimplifiedMode,
      );

      return result;
    } catch (error) {
      this.logger.error(`综合分析失败: ${error.message}`, {
        imageCount: imageUrls.length,
        error: error.stack,
      });

      return this.parserService.createFallbackAnalysis(imageUrls);
    }
  }

  // ============================================================
  // 两阶段分析 (v3.0) - 解决大量图片超时问题
  // ============================================================

  /**
   * 阶段1：品牌扫描 - 快速识别所有品牌
   *
   * 特点：
   * - 可处理大量图片（40+）
   * - 输出极简（<100字符），不会截断
   * - 用于判断是否为混合商品
   */
  async scanBrands(
    imageUrls: string[],
    availableBrands: Array<{ name: string; slug: string }> = [],
    availableCategories: CategoryForPrompt[] = [],
  ): Promise<BrandScanResult> {
    if (!imageUrls || imageUrls.length === 0) {
      return {
        brands: ['Unknown'],
        brandSlugs: ['unknown'],
        isMixed: false,
        groupCount: 1,
        productType: 'apparel',
        category: '',
        confidence: 0.1,
      };
    }

    this.logger.log(`阶段1：品牌扫描开始，${imageUrls.length} 张图片`);

    try {
      const prompt = buildBrandScanPrompt({
        imageCount: imageUrls.length,
        availableBrands,
        availableCategories,
      });

      const startTime = Date.now();
      const response = await this.aiProvider.analyzeMultipleImages(
        prompt,
        imageUrls,
      );
      const duration = Date.now() - startTime;

      this.logger.log(`阶段1：品牌扫描完成，耗时 ${duration}ms`);

      const result = this.parserService.parseBrandScanResponse(response);
      this.logger.log(
        `阶段1结果：检测到 ${result.brands.length} 个品牌 [${result.brands.join(', ')}]，` +
          `混合商品=${result.isMixed}，分组数=${result.groupCount}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`阶段1品牌扫描失败: ${error.message}`);
      return {
        brands: ['Unknown'],
        brandSlugs: ['unknown'],
        isMixed: false,
        groupCount: 1,
        productType: 'apparel',
        category: '',
        confidence: 0.1,
      };
    }
  }

  /**
   * 阶段2：详情生成 - 为单个品牌生成完整信息
   *
   * 特点：
   * - 只处理该品牌相关的图片（10-20张）
   * - 输出完整的商品信息
   * - 多品牌时分批调用
   */
  async analyzeGroupDetail(
    brand: string,
    brandSlug: string | undefined,
    imageUrls: string[],
    originalIndexes: number[],
    productType: string,
    category: string,
  ): Promise<GroupDetailResult> {
    this.logger.log(`阶段2：${brand} 详情生成开始，${imageUrls.length} 张图片`);

    try {
      const prompt = buildGroupDetailPrompt({
        brand,
        brandSlug,
        imageCount: imageUrls.length,
        productType,
        category,
      });

      const startTime = Date.now();
      const response = await this.aiProvider.analyzeMultipleImages(
        prompt,
        imageUrls,
      );
      const duration = Date.now() - startTime;

      this.logger.log(`阶段2：${brand} 详情生成完成，耗时 ${duration}ms`);

      const result = this.parserService.parseGroupDetailResponse(
        response,
        brand,
        originalIndexes,
      );
      return result;
    } catch (error) {
      this.logger.error(`阶段2 ${brand} 详情生成失败: ${error.message}`);
      // 返回降级结果
      return {
        groupKey:
          (brandSlug || brand.toLowerCase().replace(/\s+/g, '-')) + '-product',
        brand,
        brandSlug,
        model: 'Unknown Model',
        productInfo: {
          title: `${brand} Product`,
          description: `${brand} fashion product.`,
          category: category || 'other',
          attributes: {
            colors: [],
            styles: ['Casual'],
            occasions: ['Daily Wear'],
            seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
            gender: 'unisex',
          },
        },
        imageIndexes: originalIndexes,
        confidence: 0.3,
      };
    }
  }

  /**
   * 阶段1.5：图片品牌分类 (v3.1)
   *
   * 目标：对每张图片进行品牌分类
   * 解决：之前的平均分配导致品牌与图片不匹配的问题
   */
  async classifyImagesByBrand(
    imageUrls: string[],
    brands: Array<{ name: string; slug?: string }>,
    productType: string,
  ): Promise<ImageBrandClassificationResult> {
    if (!imageUrls || imageUrls.length === 0 || brands.length === 0) {
      return {
        classifications: [],
        brandImageMap: new Map(),
      };
    }

    this.logger.log(
      `阶段1.5：图片品牌分类开始，${imageUrls.length} 张图片，${brands.length} 个品牌`,
    );

    try {
      const prompt = buildImageBrandClassificationPrompt({
        imageCount: imageUrls.length,
        brands,
        productType,
      });

      const startTime = Date.now();
      const response = await this.aiProvider.analyzeMultipleImages(
        prompt,
        imageUrls,
      );
      const duration = Date.now() - startTime;

      this.logger.log(`阶段1.5：图片品牌分类完成，耗时 ${duration}ms`);

      const result = this.parserService.parseImageBrandClassificationResponse(
        response,
        brands,
        imageUrls.length,
      );

      return result;
    } catch (error) {
      this.logger.error(`阶段1.5 图片品牌分类失败: ${error.message}`);

      // 返回降级结果：平均分配（保持向后兼容）
      const classifications = [];
      const brandImageMap = new Map<string, number[]>();

      for (const brand of brands) {
        brandImageMap.set(brand.name, []);
      }

      const imagesPerBrand = Math.ceil(imageUrls.length / brands.length);
      for (let i = 0; i < imageUrls.length; i++) {
        const brandIndex = Math.min(
          Math.floor(i / imagesPerBrand),
          brands.length - 1,
        );
        const brand = brands[brandIndex];
        classifications.push({
          imageIndex: i,
          brand: brand.name,
          brandSlug: brand.slug,
        });
        brandImageMap.get(brand.name)?.push(i);
      }

      this.logger.warn(`使用降级策略：平均分配图片给各品牌`);
      return { classifications, brandImageMap };
    }
  }

  /**
   * 两阶段综合分析 - 主入口方法 (v3.1 改进)
   *
   * 流程：
   * 1. 阶段1：扫描所有图片，识别品牌
   * 2. 如果单品牌：直接生成详情
   * 3. 如果多品牌：
   *    3.1 阶段1.5：对每张图片进行品牌分类
   *    3.2 阶段2：按品牌分批生成详情（只传入该品牌的图片）
   * 4. 合并结果返回 ComprehensiveProductAnalysis
   */
  async analyzeTwoPhase(
    imageUrls: string[],
    availableBrands: Array<{ name: string; slug: string }> = [],
    availableCategories: CategoryForPrompt[] = [],
  ): Promise<ComprehensiveProductAnalysis> {
    if (!imageUrls || imageUrls.length === 0) {
      return this.parserService.createFallbackAnalysis([]);
    }

    this.logger.log(`开始两阶段分析：${imageUrls.length} 张图片`);

    // 阶段1：品牌扫描
    const scanResult = await this.scanBrands(
      imageUrls,
      availableBrands,
      availableCategories,
    );

    // 过滤有效品牌
    const scannedBrandRefs = scanResult.brands.map((brand, index) => ({
      name: brand,
      slug: scanResult.brandSlugs?.[index],
    }));
    const validBrands = scannedBrandRefs.filter(
      (brand) =>
        brand.name && brand.name !== 'Unknown' && brand.slug !== 'unknown',
    );
    const actualBrandCount = validBrands.length || 1;
    const primaryBrand = validBrands[0] ||
      scannedBrandRefs[0] || {
        name: 'Unknown',
        slug: 'unknown',
      };

    // 关键修复：只要实际品牌数 <= 1，就走单品牌快速路径
    // 不管 AI 返回的 isMixed 是什么
    if (actualBrandCount <= 1 && scanResult.confidence >= 0.5) {
      this.logger.log(
        `单品牌快速路径：${primaryBrand.name}（实际品牌数=${actualBrandCount}）`,
      );
      return this.analyzeSingleBrandFast(
        primaryBrand.name,
        primaryBrand.slug,
        imageUrls,
        scanResult.productType,
        availableCategories,
      );
    }

    // 多品牌：按品牌分批处理
    const brands =
      validBrands.length > 0
        ? validBrands
        : [{ name: 'Unknown', slug: 'unknown' }];

    this.logger.log(
      `多品牌分批处理：${brands.length} 个品牌 [${brands.map((brand) => brand.name).join(', ')}]`,
    );

    // 阶段1.5：图片品牌分类 (v3.1 改进)
    // 让 AI 对每张图片进行品牌分类，而不是简单的平均分配
    const classificationResult = await this.classifyImagesByBrand(
      imageUrls,
      brands,
      scanResult.productType,
    );

    const suggestedGroups: ComprehensiveProductAnalysis['suggestedGroups'] = [];
    const perImageAnalysis: ComprehensiveProductAnalysis['perImageAnalysis'] =
      [];

    // 为每个品牌生成详情（只传入该品牌的图片）
    for (const brand of brands) {
      const brandImageIndexes =
        classificationResult.brandImageMap.get(brand.name) || [];

      // 跳过没有图片的品牌
      if (brandImageIndexes.length === 0) {
        this.logger.warn(`品牌 ${brand.name} 没有匹配的图片，跳过`);
        continue;
      }

      // 获取该品牌的图片 URL
      const brandImages = brandImageIndexes.map((idx) => imageUrls[idx]);

      this.logger.log(
        `品牌 ${brand.name}: ${brandImageIndexes.length} 张图片 [${brandImageIndexes.slice(0, 5).join(', ')}${brandImageIndexes.length > 5 ? '...' : ''}]`,
      );

      const groupDetail = await this.analyzeGroupDetail(
        brand.name,
        brand.slug,
        brandImages,
        brandImageIndexes,
        scanResult.productType,
        scanResult.category,
      );

      suggestedGroups.push({
        groupKey: groupDetail.groupKey,
        brand: groupDetail.brand,
        brandSlug: groupDetail.brandSlug,
        model: groupDetail.model,
        productInfo: groupDetail.productInfo,
        imageIndexes: groupDetail.imageIndexes,
        estimatedSkuCount: groupDetail.imageIndexes.length,
        groupConfidence: groupDetail.confidence,
      });

      // 为该品牌的图片创建 perImageAnalysis
      for (const idx of brandImageIndexes) {
        perImageAnalysis.push({
          imageIndex: idx,
          brand: brand.name,
          brandSlug: brand.slug,
          model: groupDetail.model,
          confidence: groupDetail.confidence,
          assignedGroupKey: groupDetail.groupKey,
        });
      }
    }

    // 处理 Unknown 和 composite 图片
    const unknownIndexes =
      classificationResult.brandImageMap.get('Unknown') || [];
    const compositeIndexes =
      classificationResult.brandImageMap.get('composite') || [];

    // 将 Unknown 图片分配给第一个有效品牌（如果有）
    if (unknownIndexes.length > 0 && suggestedGroups.length > 0) {
      const firstGroup = suggestedGroups[0];
      this.logger.warn(
        `${unknownIndexes.length} 张图片无法识别品牌，分配给 ${firstGroup.brand}`,
      );
      firstGroup.imageIndexes.push(...unknownIndexes);
      firstGroup.estimatedSkuCount = firstGroup.imageIndexes.length;

      for (const idx of unknownIndexes) {
        perImageAnalysis.push({
          imageIndex: idx,
          brand: firstGroup.brand,
          brandSlug: firstGroup.brandSlug,
          model: firstGroup.model,
          confidence: 0.3,
          assignedGroupKey: firstGroup.groupKey,
        });
      }
    }

    // 标记 composite 图片
    for (const idx of compositeIndexes) {
      perImageAnalysis.push({
        imageIndex: idx,
        brand: 'composite',
        brandSlug: 'composite',
        model: null,
        confidence: 0.8,
        assignedGroupKey: 'composite',
        isComposite: true,
      });
    }

    // 按 imageIndex 排序 perImageAnalysis
    perImageAnalysis.sort((a, b) => a.imageIndex - b.imageIndex);

    // 基于实际品牌数计算混合度
    const actualBrandsWithImages = suggestedGroups.length;
    const isActuallyMixed = actualBrandsWithImages > 1;
    const mixednessScore = isActuallyMixed
      ? Math.min(0.9, 0.3 + (actualBrandsWithImages - 1) * 0.2)
      : 0;

    return {
      overview: {
        totalImages: imageUrls.length,
        mixednessScore: {
          overallScore: mixednessScore,
          brandDiversity: isActuallyMixed
            ? Math.min(1, actualBrandsWithImages / 5)
            : 0,
          modelDiversity: 0.5,
          visualConsistency: 1 - mixednessScore,
        },
        isRecommendedToSplit: isActuallyMixed,
        splitReason: isActuallyMixed
          ? `检测到 ${actualBrandsWithImages} 个品牌: ${suggestedGroups.map((g) => g.brand).join(', ')}`
          : undefined,
        detectedBrands: suggestedGroups.map((g) => g.brand),
        detectedBrandSlugs: suggestedGroups
          .map((g) => g.brandSlug)
          .filter((slug): slug is string => Boolean(slug)),
        detectedModels: suggestedGroups.map((g) => g.model),
      },
      perImageAnalysis,
      suggestedGroups,
      overallConfidence: scanResult.confidence,
      processingNotes: ['使用两阶段分析模式 (v3.1)', '已使用图片品牌分类'],
    };
  }

  /**
   * 单品牌快速分析路径
   */
  private async analyzeSingleBrandFast(
    brand: string,
    brandSlug: string | undefined,
    imageUrls: string[],
    productType: string,
    availableCategories: CategoryForPrompt[],
  ): Promise<ComprehensiveProductAnalysis> {
    this.logger.log(`单品牌快速分析：${brand}，${imageUrls.length} 张图片`);

    try {
      const prompt = buildSingleBrandDetailPrompt({
        brand,
        brandSlug,
        imageCount: imageUrls.length,
        productType,
        availableCategories,
      });

      const response = await this.aiProvider.analyzeMultipleImages(
        prompt,
        imageUrls,
      );

      const result =
        this.parserService.parseComprehensiveAnalysisResponse(response);
      this.parserService.validateComprehensiveAnalysis(
        result,
        imageUrls.length,
        true,
      );

      // 确保有 perImageAnalysis
      if (!result.perImageAnalysis || result.perImageAnalysis.length === 0) {
        result.perImageAnalysis = imageUrls.map((_, i) => ({
          imageIndex: i,
          brand: brand,
          brandSlug,
          model: result.suggestedGroups[0]?.model || 'Unknown',
          confidence: result.overallConfidence,
          assignedGroupKey: result.suggestedGroups[0]?.groupKey || 'unknown',
        }));
      }

      return result;
    } catch (error) {
      this.logger.error(`单品牌快速分析失败: ${error.message}`);
      return this.parserService.createFallbackAnalysis(imageUrls);
    }
  }
}
