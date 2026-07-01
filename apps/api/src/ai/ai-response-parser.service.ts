import { Injectable, Logger } from '@nestjs/common';
import {
  ComprehensiveProductAnalysis,
  BrandScanResult,
  GroupDetailResult,
  SuggestedProductInfo,
  ImageBrandClassification,
  ImageBrandClassificationResult,
} from './ai.types';

@Injectable()
export class AIResponseParserService {
  private readonly logger = new Logger(AIResponseParserService.name);

  parseComprehensiveAnalysisResponse(
    response: string,
  ): ComprehensiveProductAnalysis {
    let jsonStr = response;

    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr) as ComprehensiveProductAnalysis;
    } catch (parseError) {
      this.logger.error(`JSON 解析失败: ${parseError.message}`);

      const errorMatch = parseError.message.match(/position (\d+)/);
      if (errorMatch) {
        const errorPos = parseInt(errorMatch[1]);
        const contextStart = Math.max(0, errorPos - 200);
        const contextEnd = Math.min(jsonStr.length, errorPos + 200);
        this.logger.error(
          `错误位置附近: ...${jsonStr.substring(contextStart, contextEnd)}...`,
        );
      }

      this.logger.warn(`尝试自动修复 JSON 格式错误...`);
      const fixedJson = this.tryFixJson(jsonStr);

      if (fixedJson !== jsonStr) {
        try {
          const result = JSON.parse(fixedJson) as ComprehensiveProductAnalysis;
          this.logger.warn(`✅ JSON 自动修复成功`);
          return result;
        } catch (retryError) {
          this.logger.error(`❌ JSON 自动修复失败: ${retryError.message}`);
        }
      }

      const partialResult = this.tryExtractPartialAnalysis(jsonStr);
      if (partialResult) {
        this.logger.warn(`✅ 从截断的 JSON 中提取了部分数据`);
        return partialResult;
      }

      throw new Error('AI 返回的 JSON 格式无效');
    }
  }

  tryExtractPartialAnalysis(
    jsonStr: string,
  ): ComprehensiveProductAnalysis | null {
    try {
      const overviewMatch = jsonStr.match(
        /"overview"\s*:\s*({[\s\S]*?})\s*,\s*"perImageAnalysis"/,
      );
      if (!overviewMatch) return null;

      let overview: ComprehensiveProductAnalysis['overview'];
      try {
        overview = JSON.parse(overviewMatch[1]);
      } catch {
        return null;
      }

      const perImageAnalysis: ComprehensiveProductAnalysis['perImageAnalysis'] =
        [];
      const perImagePattern =
        /\{\s*"imageIndex"\s*:\s*(\d+)\s*,\s*"brand"\s*:\s*"([^"]*)"\s*,\s*"groupKey"\s*:\s*"([^"]*)"\s*,\s*"isComposite"\s*:\s*(true|false)\s*\}/g;
      let match;
      while ((match = perImagePattern.exec(jsonStr)) !== null) {
        perImageAnalysis.push({
          imageIndex: parseInt(match[1]),
          brand: match[2],
          model: null,
          confidence: 0.7,
          assignedGroupKey: match[3],
          isComposite: match[4] === 'true',
        });
      }

      const groupMap = new Map<
        string,
        { brand: string; imageIndexes: number[] }
      >();
      for (const item of perImageAnalysis) {
        if (item.isComposite || item.assignedGroupKey === 'composite') continue;

        if (!groupMap.has(item.assignedGroupKey)) {
          groupMap.set(item.assignedGroupKey, {
            brand: item.brand || 'Unknown',
            imageIndexes: [],
          });
        }
        groupMap.get(item.assignedGroupKey)!.imageIndexes.push(item.imageIndex);
      }

      const suggestedGroups: ComprehensiveProductAnalysis['suggestedGroups'] =
        [];
      for (const [groupKey, data] of groupMap.entries()) {
        suggestedGroups.push({
          groupKey,
          brand: data.brand,
          model: groupKey.replace(`${data.brand.toLowerCase()}-`, ''),
          productInfo: {
            title: `${data.brand} Sneakers`,
            description: `${data.brand} premium sneakers.`,
            category: 'sneakers',
            attributes: {
              colors: [],
              styles: ['Casual'],
              occasions: ['Daily Wear'],
              seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
              gender: 'unisex',
            },
          },
          imageIndexes: data.imageIndexes,
          estimatedSkuCount: data.imageIndexes.length,
          groupConfidence: 0.7,
        });
      }

      return {
        overview,
        perImageAnalysis,
        suggestedGroups,
        overallConfidence: suggestedGroups.length > 0 ? 0.7 : 0.5,
        warnings: ['JSON 被截断，数据从部分响应中重建'],
      };
    } catch (error) {
      this.logger.error(`提取部分数据失败: ${error.message}`);
      return null;
    }
  }

  tryFixJson(jsonStr: string): string {
    let fixed = jsonStr;

    const isTruncated = !fixed.trim().endsWith('}');

    if (isTruncated) {
      this.logger.warn(`检测到 JSON 被截断，尝试智能修复...`);

      let lastValidPos = -1;

      const perImageStart = fixed.indexOf('"perImageAnalysis"');
      const suggestedGroupsStart = fixed.indexOf('"suggestedGroups"');

      if (perImageStart !== -1 && suggestedGroupsStart === -1) {
        const perImageArrayStart = fixed.indexOf('[', perImageStart);
        if (perImageArrayStart !== -1) {
          const lastCompleteItem = Math.max(
            fixed.lastIndexOf('"isComposite": false\n    }'),
            fixed.lastIndexOf('"isComposite": true\n    }'),
            fixed.lastIndexOf('"isComposite":false}'),
            fixed.lastIndexOf('"isComposite":true}'),
          );

          if (lastCompleteItem !== -1) {
            const endBrace = fixed.indexOf('}', lastCompleteItem + 15);
            if (endBrace !== -1) {
              lastValidPos = endBrace + 1;
            }
          }
        }

        if (lastValidPos !== -1) {
          fixed = fixed.substring(0, lastValidPos);
          fixed +=
            '\n  ],\n  "suggestedGroups": [],\n  "overallConfidence": 0.5,\n  "warnings": ["JSON 被截断"]\n}';
          return fixed;
        }
      }

      const lastArrayEnd = fixed.lastIndexOf('}]');
      const lastObjectEnd = fixed.lastIndexOf('}}');
      lastValidPos = Math.max(lastArrayEnd, lastObjectEnd);

      if (lastValidPos !== -1) {
        fixed = fixed.substring(0, lastValidPos + 2);

        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/]/g) || []).length;

        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixed += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixed += '}';
        }
      }
    }

    const descriptionPattern = /"description":\s*"([^"]*?)$/gm;
    fixed = fixed.replace(descriptionPattern, (match, content) => {
      return `"description": "${content.replace(/[\n\r]/g, ' ').substring(0, 80)}"`;
    });

    return fixed;
  }

  validateComprehensiveAnalysis(
    result: ComprehensiveProductAnalysis,
    expectedImageCount: number,
    isSimplifiedMode = false,
  ): void {
    const warnings: string[] = [];

    if (!result.overview) {
      warnings.push('缺少 overview 字段');
    }

    // 简化模式下不要求 perImageAnalysis
    if (!isSimplifiedMode) {
      if (!result.perImageAnalysis || !Array.isArray(result.perImageAnalysis)) {
        warnings.push('缺少 perImageAnalysis 字段');
      } else if (result.perImageAnalysis.length < expectedImageCount) {
        warnings.push(
          `perImageAnalysis 数量不足：期望 ${expectedImageCount}，实际 ${result.perImageAnalysis.length}`,
        );
      }
    }

    if (!result.suggestedGroups || !Array.isArray(result.suggestedGroups)) {
      warnings.push('缺少 suggestedGroups 字段');
    } else if (result.suggestedGroups.length === 0) {
      warnings.push('suggestedGroups 为空');
    }

    if (
      result.overallConfidence === undefined ||
      result.overallConfidence === null ||
      isNaN(result.overallConfidence)
    ) {
      const hasValidGroups =
        result.suggestedGroups && result.suggestedGroups.length > 0;
      const defaultConfidence = hasValidGroups ? 0.6 : 0.4;
      this.logger.warn(
        `overallConfidence 缺失，设置默认值: ${defaultConfidence}`,
      );
      result.overallConfidence = defaultConfidence;
      warnings.push(`overallConfidence 使用默认值 ${defaultConfidence}`);
    }

    if (warnings.length > 0) {
      this.logger.warn(`综合分析结果验证警告: ${warnings.join('; ')}`);
      result.warnings = [...(result.warnings || []), ...warnings];
    }
  }

  createFallbackAnalysis(imageUrls: string[]): ComprehensiveProductAnalysis {
    return {
      overview: {
        totalImages: imageUrls.length,
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
      perImageAnalysis: imageUrls.map((url, i) => ({
        imageIndex: i,
        imageUrl: url,
        brand: null,
        brandSlug: null,
        model: null,
        confidence: 0,
        assignedGroupKey: 'unknown',
      })),
      suggestedGroups: [
        {
          groupKey: 'fallback',
          brand: 'Unknown',
          model: 'Unknown',
          productInfo: {
            title: 'Untitled Product',
            description: '',
            category: '',
            attributes: {
              colors: [],
              styles: [],
              occasions: [],
              seasons: [],
              gender: undefined,
            },
          },
          imageIndexes: imageUrls.map((_, i) => i),
          estimatedSkuCount: imageUrls.length,
          groupConfidence: 0.1,
        },
      ],
      overallConfidence: 0.1,
      warnings: ['AI 分析失败，使用降级结果'],
    };
  }

  // ============================================================
  // 两阶段分析解析方法 (v3.0)
  // ============================================================

  /**
   * 解析阶段1品牌扫描响应
   */
  parseBrandScanResponse(response: string): BrandScanResult {
    let jsonStr = response;

    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      const rawBrands = Array.isArray(parsed.brands) ? parsed.brands : [];
      const parsedBrandPairs = rawBrands
        .map((item: unknown, index: number) => {
          if (typeof item === 'string' && item.length > 0) {
            return {
              brand: item,
              brandSlug:
                Array.isArray(parsed.brandSlugs) &&
                typeof parsed.brandSlugs[index] === 'string'
                  ? parsed.brandSlugs[index]
                  : undefined,
            };
          }

          if (item && typeof item === 'object') {
            const brand =
              typeof (item as { brand?: unknown; name?: unknown }).brand ===
              'string'
                ? (item as { brand: string }).brand
                : typeof (item as { name?: unknown }).name === 'string'
                  ? (item as { name: string }).name
                  : undefined;
            const brandSlug =
              typeof (item as { brandSlug?: unknown; slug?: unknown })
                .brandSlug === 'string'
                ? (item as { brandSlug: string }).brandSlug
                : typeof (item as { slug?: unknown }).slug === 'string'
                  ? (item as { slug: string }).slug
                  : undefined;

            return brand ? { brand, brandSlug } : null;
          }

          return null;
        })
        .filter(
          (
            item: { brand: string; brandSlug?: string } | null,
          ): item is {
            brand: string;
            brandSlug?: string;
          } => Boolean(item && item.brand),
        );

      const filteredBrands = parsedBrandPairs.map(
        (item: { brand: string; brandSlug?: string }) => item.brand,
      );
      const filteredBrandSlugs = parsedBrandPairs.map(
        (item: { brand: string; brandSlug?: string }) =>
          item.brandSlug || 'unknown',
      );
      const isMixed = filteredBrands.length > 1;

      this.logger.log(`品牌扫描结果: [${filteredBrands.join(', ')}]`);

      return {
        brands: filteredBrands.length > 0 ? filteredBrands : ['Unknown'],
        brandSlugs:
          filteredBrandSlugs.length > 0 ? filteredBrandSlugs : ['unknown'],
        isMixed,
        groupCount:
          typeof parsed.groupCount === 'number'
            ? parsed.groupCount
            : filteredBrands.length,
        productType: parsed.productType || 'apparel',
        category: parsed.category || '',
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error) {
      this.logger.error(`品牌扫描响应解析失败: ${error.message}`);

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
   * 解析阶段2详情生成响应
   */
  parseGroupDetailResponse(
    response: string,
    expectedBrand: string,
    originalIndexes: number[],
  ): GroupDetailResult {
    let jsonStr = response;

    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      const productInfo: SuggestedProductInfo = {
        title: parsed.productInfo?.title || `${expectedBrand} Product`,
        description:
          parsed.productInfo?.description ||
          `${expectedBrand} fashion product.`,
        category: parsed.productInfo?.category || 'other',
        attributes: {
          colors: parsed.productInfo?.attributes?.colors || [],
          styles: parsed.productInfo?.attributes?.styles || ['Casual'],
          occasions: parsed.productInfo?.attributes?.occasions || [
            'Daily Wear',
          ],
          seasons: parsed.productInfo?.attributes?.seasons || [
            'Spring',
            'Summer',
            'Fall',
            'Winter',
          ],
          gender: this.normalizeGender(parsed.productInfo?.attributes?.gender),
        },
      };

      return {
        groupKey:
          parsed.groupKey ||
          expectedBrand.toLowerCase().replace(/\s+/g, '-') + '-product',
        brand: parsed.brand || expectedBrand,
        brandSlug:
          typeof parsed.brandSlug === 'string' ? parsed.brandSlug : undefined,
        model: parsed.model || 'Unknown Model',
        productInfo,
        imageIndexes: originalIndexes,
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error) {
      this.logger.error(`详情生成响应解析失败: ${error.message}`);

      return {
        groupKey: expectedBrand.toLowerCase().replace(/\s+/g, '-') + '-product',
        brand: expectedBrand,
        brandSlug: undefined,
        model: 'Unknown Model',
        productInfo: {
          title: `${expectedBrand} Product`,
          description: `${expectedBrand} fashion product.`,
          category: 'other',
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
   * 标准化 gender 字段
   */
  private normalizeGender(
    gender: unknown,
  ): 'men' | 'women' | 'unisex' | 'kids' | undefined {
    if (typeof gender !== 'string') return 'unisex';
    const normalized = gender.toLowerCase();
    if (['men', 'women', 'unisex', 'kids'].includes(normalized)) {
      return normalized as 'men' | 'women' | 'unisex' | 'kids';
    }
    return 'unisex';
  }

  /**
   * 从标题中提取品牌名（降级逻辑）
   */
  extractBrandFromTitle(title: string): string | null {
    if (!title) return null;

    const knownBrands = [
      'Nike',
      'Adidas',
      'New Balance',
      'Puma',
      'Converse',
      'Vans',
      'Louis Vuitton',
      'Gucci',
      'Dior',
      'Prada',
      'Balenciaga',
      'Burberry',
      'Fendi',
      'Versace',
      'Givenchy',
      'Valentino',
      'A Bathing Ape',
      'Supreme',
      'Off-White',
      'Gallery Dept',
      'Air Jordan',
      'Jordan',
      'Crocs',
    ];

    const lowerTitle = title.toLowerCase();

    for (const brand of knownBrands) {
      if (lowerTitle.includes(brand.toLowerCase())) {
        this.logger.log(`从标题中提取到品牌: "${brand}"`);
        return brand;
      }
    }

    return null;
  }

  // ============================================================
  // 阶段1.5：图片品牌分类解析 (v3.1)
  // ============================================================

  /**
   * 解析阶段1.5图片品牌分类响应
   */
  parseImageBrandClassificationResponse(
    response: string,
    expectedBrands: Array<{ name: string; slug?: string }>,
    imageCount: number,
  ): ImageBrandClassificationResult {
    let jsonStr = response;

    // 提取 JSON
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const classifications: ImageBrandClassification[] = [];
    const brandImageMap = new Map<string, number[]>();

    // 初始化品牌映射
    for (const brand of expectedBrands) {
      brandImageMap.set(brand.name, []);
    }
    brandImageMap.set('Unknown', []);
    brandImageMap.set('composite', []);

    try {
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed.classifications)) {
        for (const item of parsed.classifications) {
          const imageIndex =
            typeof item.i === 'number' ? item.i : parseInt(item.i);
          let brand = typeof item.b === 'string' ? item.b : 'Unknown';
          let brandSlug =
            typeof item.s === 'string'
              ? item.s
              : typeof item.brandSlug === 'string'
                ? item.brandSlug
                : undefined;

          // 处理 composite 标记
          const isComposite =
            brand.toLowerCase() === 'composite' || brandSlug === 'composite';
          if (isComposite) {
            brand = 'composite';
            brandSlug = 'composite';
          }

          // 验证品牌是否在预期列表中
          if (!isComposite) {
            const slugMatch = brandSlug
              ? expectedBrands.find((b) => b.slug === brandSlug)
              : undefined;
            const matchedBrand =
              slugMatch ||
              expectedBrands.find(
                (b) => b.name.toLowerCase() === brand.toLowerCase(),
              );

            if (matchedBrand) {
              brand = matchedBrand.name;
              brandSlug = matchedBrand.slug;
            } else {
              this.logger.warn(
                `图片 ${imageIndex} 的品牌 "${brand}" 不在预期列表中，标记为 Unknown`,
              );
              brand = 'Unknown';
              brandSlug = 'unknown';
            }
          }

          classifications.push({
            imageIndex,
            brand,
            brandSlug,
            isComposite,
          });

          // 更新品牌映射
          const brandImages = brandImageMap.get(brand) || [];
          brandImages.push(imageIndex);
          brandImageMap.set(brand, brandImages);
        }
      }

      // 检查是否所有图片都有分类
      const classifiedIndexes = new Set(
        classifications.map((c) => c.imageIndex),
      );
      for (let i = 0; i < imageCount; i++) {
        if (!classifiedIndexes.has(i)) {
          this.logger.warn(`图片 ${i} 缺少分类，标记为 Unknown`);
          classifications.push({
            imageIndex: i,
            brand: 'Unknown',
            brandSlug: 'unknown',
          });
          const unknownImages = brandImageMap.get('Unknown') || [];
          unknownImages.push(i);
          brandImageMap.set('Unknown', unknownImages);
        }
      }

      // 按图片索引排序
      classifications.sort((a, b) => a.imageIndex - b.imageIndex);

      this.logger.log(
        `图片品牌分类完成: ${classifications.length} 张图片，` +
          `品牌分布: ${[...brandImageMap.entries()]
            .filter(([, imgs]) => imgs.length > 0)
            .map(([brand, imgs]) => `${brand}(${imgs.length})`)
            .join(', ')}`,
      );

      return { classifications, brandImageMap };
    } catch (error) {
      this.logger.error(`图片品牌分类响应解析失败: ${error.message}`);

      // 返回降级结果：所有图片标记为 Unknown
      for (let i = 0; i < imageCount; i++) {
        classifications.push({
          imageIndex: i,
          brand: 'Unknown',
          brandSlug: 'unknown',
        });
      }
      brandImageMap.set(
        'Unknown',
        Array.from({ length: imageCount }, (_, i) => i),
      );

      return { classifications, brandImageMap };
    }
  }
}
