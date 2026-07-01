// AI 服务响应类型定义

export interface AIAttributeExtractionResult {
  colors?: string[]; // 颜色
  styles?: string[]; // 风格
  occasions?: string[]; // 场景
  seasons?: string[]; // 季节
  gender?: 'men' | 'women' | 'unisex' | 'kids'; // 性别
}

// ============================================================
// 混合商品综合分析类型 (v2.1)
// ============================================================

/**
 * 混合度评分 - 用于判断商品是否需要拆分
 */
export interface MixednessScore {
  brandDiversity: number; // 0-1，品牌多样性（0=单品牌，1=多品牌）
  modelDiversity: number; // 0-1，款式多样性（0=同款，1=不同款）
  visualConsistency: number; // 0-1，视觉一致性（1=高度一致，0=差异大）
  overallScore: number; // 0-1，综合评分（越高越可能是混合商品）
}

/**
 * 每张图片的分析结果 - 用于 SKU 映射
 */
export interface PerImageAnalysis {
  imageIndex: number; // 图片在输入数组中的索引
  imageUrl?: string; // 可选，用于调试
  brand: string | null; // 识别的品牌，null 表示无法识别
  brandSlug?: string | null; // 识别到的品牌 slug
  model: string | null; // 识别的型号/款式
  variant?: string; // 变体信息（如 Low/Mid/High）
  color?: string; // 识别的颜色
  confidence: number; // 该图片分析的置信度 (0-1)
  assignedGroupKey: string; // 分配到的分组键（如 "nike-air-force-1"）
  isComposite?: boolean; // 是否为合集/拼图主图（多个SKU拼在一起的展示图）
}

/**
 * 商品信息 - 用于创建商品
 */
export interface SuggestedProductInfo {
  title: string; // SEO 友好的英文标题
  description: string; // 商品描述
  category: string; // 分类 slug
  attributes: AIAttributeExtractionResult; // 筛选属性
}

/**
 * 分组建议 - 每个分组对应一个商品
 */
export interface SuggestedGroup {
  groupKey: string; // 分组键，如 "nike-air-force-1"
  brand: string; // 品牌名
  brandSlug?: string; // 品牌 slug
  model: string; // 型号名
  productInfo: SuggestedProductInfo; // 完整的商品信息
  imageIndexes: number[]; // 属于该组的图片索引
  estimatedSkuCount: number; // 预估 SKU 数量
  groupConfidence: number; // 该分组的置信度 (0-1)
}

/**
 * 综合分析概览
 */
export interface AnalysisOverview {
  totalImages: number; // 分析的图片总数
  mixednessScore: MixednessScore; // 混合度评分
  isRecommendedToSplit: boolean; // 是否建议拆分
  splitReason?: string; // 拆分原因（如果建议拆分）
  detectedBrands: string[]; // 检测到的所有品牌
  detectedBrandSlugs?: string[]; // 检测到的品牌 slug
  detectedModels: string[]; // 检测到的所有型号
}

/**
 * 综合分析结果 - 单次调用返回所有信息 (v2.1)
 *
 * 使用场景：
 * - 分析商品是否为混合商品（多品牌/多款式）
 * - 获取每张图片的品牌/型号信息（用于 SKU 映射）
 * - 获取分组建议和每组的完整商品信息
 */
export interface ComprehensiveProductAnalysis {
  // 1. 整体评估
  overview: AnalysisOverview;

  // 2. 每张图片的分析（用于 SKU 映射）
  perImageAnalysis: PerImageAnalysis[];

  // 3. 分组建议（每组有完整商品信息）
  suggestedGroups: SuggestedGroup[];

  // 4. 元信息
  overallConfidence: number; // 整体分析置信度
  processingNotes?: string[]; // AI 的处理备注
  warnings?: string[]; // 警告信息
}

/**
 * SKU 属性提示 - 帮助 AI 更好地识别
 */
export interface SkuAttributeHint {
  index: number; // 图片索引
  name: string; // SKU 属性名（如 "颜色分类: 耐克空军一号白色"）
}

/**
 * 处理策略 - 基于混合度评分的决策
 */
export type ProcessingStrategy =
  | 'single_product' // 单商品，不拆分
  | 'single_with_variants' // 单商品 + 变体
  | 'split_products' // 拆分成多个商品
  | 'manual_review'; // 人工审核

// ============================================================
// 两阶段分析类型 (v3.0) - 解决大量图片超时问题
// ============================================================

/**
 * 阶段1：品牌扫描结果 - 极简输出，不会截断
 */
export interface BrandScanResult {
  brands: string[]; // 检测到的所有品牌
  brandSlugs?: string[]; // 与 brands 对齐的品牌 slug
  isMixed: boolean; // 是否为混合商品（多品牌）
  groupCount: number; // 预估分组数量
  productType: string; // 产品类型 (apparel/footwear/bags/accessories)
  category: string; // 分类 slug
  confidence: number; // 扫描置信度
}

/**
 * 阶段2：单品牌详情分析请求
 */
export interface GroupDetailRequest {
  brand: string; // 目标品牌
  brandSlug?: string; // 目标品牌 slug
  imageUrls: string[]; // 该品牌相关的图片
  productType: string; // 产品类型
  category: string; // 分类
}

/**
 * 阶段2：单品牌详情分析结果
 */
export interface GroupDetailResult {
  groupKey: string; // 分组键
  brand: string;
  brandSlug?: string;
  model: string;
  productInfo: SuggestedProductInfo;
  imageIndexes: number[]; // 原始图片索引
  confidence: number;
}

/**
 * 阶段1.5：图片品牌分类结果 (v3.1)
 */
export interface ImageBrandClassification {
  imageIndex: number; // 图片索引
  brand: string; // 识别的品牌
  brandSlug?: string; // 识别的品牌 slug
  isComposite?: boolean; // 是否为合集/拼图
}

/**
 * 阶段1.5：图片品牌分类响应
 */
export interface ImageBrandClassificationResult {
  classifications: ImageBrandClassification[];
  brandImageMap: Map<string, number[]>; // 品牌 -> 图片索引数组
}
