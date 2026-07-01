/**
 * 两阶段分析 Prompt (v3.1)
 *
 * 解决问题：大量图片（40+）导致 AI 响应超时/截断
 *
 * 阶段1：品牌扫描 - 全量图片，极简输出（<100字符）
 * 阶段1.5：图片品牌分类 - 对每张图片进行品牌分类（多品牌时）
 * 阶段2：详情生成 - 按品牌分批，只传入该品牌的图片
 */

import { generateBrandRecognitionPrompt } from '../brand-features';
import { CategoryForPrompt, formatCategoryTree } from './category-tree';

/**
 * 阶段1：品牌扫描 Prompt
 *
 * 目标：快速识别所有品牌，判断是否混合商品
 * 输出：极简 JSON，避免截断
 */
export function buildBrandScanPrompt(options: {
  imageCount: number;
  availableBrands: Array<{ name: string; slug: string }>;
  availableCategories: CategoryForPrompt[];
}): string {
  const { imageCount, availableBrands, availableCategories } = options;
  const categoryTree = formatCategoryTree(availableCategories);
  const brandFeatures = generateBrandRecognitionPrompt();
  const brandList =
    availableBrands.length > 0
      ? availableBrands
          .map((brand) => `- ${brand.name} | slug: ${brand.slug}`)
          .join('\n')
      : '';

  return `你是时尚产品识别专家。快速扫描 ${imageCount} 张图片，识别所有品牌。

## 任务
1. 识别图片中的所有品牌（可能有多个）
2. 判断产品类型
3. 返回极简 JSON

## 产品类型
- apparel: T恤、卫衣、外套、裤子
- footwear: 运动鞋、靴子、凉鞋
- bags: 双肩包、手提包、钱包
- accessories: 帽子、手表、项链、香水

## 品牌识别位置
- 服装: 胸口印花、衣领标签、袖标
- 鞋类: 鞋舌、鞋侧面、鞋后跟
- 包袋: 正面LOGO、五金件
- 配饰: 表面刻字、吊牌

## 常见品牌特征
${brandFeatures}

${
  brandList
    ? `## 可选品牌（brands 和 brandSlugs 必须精确对应以下列表；无法确认时返回 Design / design）
${brandList}
`
    : ''
}

## 可用分类（缩进表示父子关系，必须选择最深层/最具体的分类）
${categoryTree}

## 返回 JSON（必须精简！）

{
  "brands": ["Brand1", "Brand2"],
  "brandSlugs": ["brand-1", "brand-2"],
  "isMixed": true,
  "groupCount": 2,
  "productType": "footwear",
  "category": "running-shoes",
  "confidence": 0.9
}

## 规则
1. brands: 检测到的所有品牌名（英文），必须来自可选品牌列表；无法确认时用 Design
2. brandSlugs: 与 brands 一一对应的 slug，必须来自可选品牌列表；无法确认时用 design
3. isMixed: 多品牌=true，单品牌=false
4. groupCount: 不同品牌的数量（同品牌不同款式算1个）
5. productType: apparel/footwear/bags/accessories
6. category: **必须选择最深层（最具体）的分类！** 例如跑鞋选 running-shoes 而非 sneakers，卫衣选 hoodie 而非 tops
7. confidence: 0-1，品牌识别的置信度
8. 如果无法识别品牌，brands=["Design"], brandSlugs=["design"]

请分析：`;
}

/**
 * 阶段2：单品牌详情生成 Prompt
 *
 * 目标：为单个品牌生成完整的商品信息
 * 输入：只有该品牌相关的图片（10-20张）
 */
export function buildGroupDetailPrompt(options: {
  brand: string;
  brandSlug?: string;
  imageCount: number;
  productType: string;
  category: string;
}): string {
  const { brand, brandSlug, imageCount, productType, category } = options;

  return `你是时尚产品识别专家。为 ${brand} 品牌商品生成详细信息。

## 已知信息
- 品牌: ${brand}
- 图片数量: ${imageCount}
- 产品类型: ${productType}
- 分类: ${category}

## 任务
分析 ${imageCount} 张 ${brand} 商品图片，生成完整商品信息。

## 返回 JSON

{
  "groupKey": "${brandSlug || brand.toLowerCase().replace(/\s+/g, '-')}-model-name",
  "brand": "${brand}",
  "brandSlug": "${brandSlug || brand.toLowerCase().replace(/\s+/g, '-')}",
  "model": "具体款式名称",
  "productInfo": {
    "title": "${brand} Model Name Color/Feature ProductType (e.g. ${brand} Air Force 1 Low White Sneakers)",
    "description": "200-350 chars. Key features, design highlights.",
    "category": "${category}",
    "attributes": {
      "colors": ["Black", "White"],
      "styles": ["Streetwear", "Casual"],
      "occasions": ["Daily Wear", "Casual"],
      "seasons": ["Spring", "Summer"],
      "gender": "unisex"
    }
  },
  "confidence": 0.85
}

## 规则
1. groupKey: 品牌-款式（小写，连字符，不含颜色）
2. model: 具体款式名（如 "Air Force 1 Low"）
3. title: 英文，Title Case，格式 Brand + Model/款式名 + 配色/特征 + ProductType
4. description: 200-350字符，英文，描述设计和特点
5. colors: 图片中看到的所有颜色（最多8个）
6. styles: **必须且只能从以下列表选择（最多3个）**: Streetwear, Casual, Luxury, Classic, Sporty, Minimalist, Elegant, Retro, Athleisure, Avant-Garde
7. occasions: **必须且只能从以下列表选择（最多3个）**: Daily Wear, Casual, Sport, Travel, Party, Formal, Outdoor, School
8. seasons: **最多选2个，只能是**: Spring, Summer, Fall, Winter（不允许 "Mild Winter" 等变体）。根据产品类型判断：凉鞋/拖鞋/短袖/背心 → Summer 或 Spring+Summer；羽绒服/棉服/毛衣 → Fall+Winter；卫衣/长袖/运动鞋 → Spring+Fall 或 Fall+Winter；真正四季通用的（手表/包包/帽子）→ Spring+Fall。**禁止选3个或4个季节**
9. gender: **只能是**: men / women / unisex / kids（小写，不允许 "female"、"male"）
10. colors: 只能从以下 19 种标准色中选择：Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple, Brown, Beige, Gold, Silver, Navy, Burgundy, Army Green, Transparent, Multicolor。如果颜色不确定归类，选最接近的大类。拼色/印花/渐变 → Multicolor
11. 确保 JSON 完整有效
12. **所有 attributes 值必须使用英文！**绝对不要输出中文属性值
13. 联名/合作款标题必须包含双方品牌名，格式 "Brand A x Brand B + Model/款式名 + 配色/特征 + ProductType"，例如 "Nike x Off-White Air Jordan 1 Chicago Sneakers"

请分析：`;
}

/**
 * 阶段2：多品牌快速详情 Prompt（用于单品牌商品的快速路径）
 *
 * 当阶段1检测到单品牌时使用，一次生成完整信息
 */
export function buildSingleBrandDetailPrompt(options: {
  brand: string;
  brandSlug?: string;
  imageCount: number;
  productType: string;
  availableCategories: CategoryForPrompt[];
}): string {
  const { brand, brandSlug, imageCount, productType, availableCategories } =
    options;
  const categoryTree = formatCategoryTree(availableCategories);

  return `你是时尚产品识别专家。为 ${brand} 品牌商品生成完整信息。

## 已知信息
- 品牌: ${brand}
- 图片数量: ${imageCount}
- 产品类型: ${productType}

## 可用分类（缩进表示父子关系，必须选择最深层/最具体的分类）
${categoryTree}

## 返回 JSON

{
  "overview": {
    "totalImages": ${imageCount},
    "mixednessScore": {
      "overallScore": 0,
      "brandDiversity": 0,
      "modelDiversity": 0,
      "visualConsistency": 1
    },
    "isRecommendedToSplit": false,
    "detectedBrands": ["${brand}"],
    "detectedBrandSlugs": ["${brandSlug || brand.toLowerCase().replace(/\s+/g, '-')}"],
    "detectedModels": ["Model Name"]
  },
  "perImageAnalysis": [],
  "suggestedGroups": [
    {
      "groupKey": "${brandSlug || brand.toLowerCase().replace(/\s+/g, '-')}-model",
      "brand": "${brand}",
      "brandSlug": "${brandSlug || brand.toLowerCase().replace(/\s+/g, '-')}",
      "model": "款式名称",
      "productInfo": {
        "title": "${brand} Model Name Color/Feature ProductType (e.g. ${brand} Air Force 1 Low White Sneakers)",
        "description": "200-350 chars description.",
        "category": "从可用分类选择",
        "attributes": {
          "colors": ["Black", "White"],
          "styles": ["Streetwear", "Casual"],
          "occasions": ["Daily Wear", "Casual"],
          "seasons": ["Fall", "Winter"],
          "gender": "unisex"
        }
      },
      "imageIndexes": [0, 1, 2],
      "estimatedSkuCount": ${imageCount},
      "groupConfidence": 0.85
    }
  ],
  "overallConfidence": 0.85
}

## 规则
1. 这是单品牌商品，isMixedProduct=false
2. model: 识别具体款式名
3. title: 英文，Title Case，格式 Brand + Model/款式名 + 配色/特征 + ProductType
4. description: 200-350字符
5. colors: 列出所有颜色（≤8个）
6. styles: **必须且只能从以下列表选择（最多3个）**: Streetwear, Casual, Luxury, Classic, Sporty, Minimalist, Elegant, Retro, Athleisure, Avant-Garde
7. occasions: **必须且只能从以下列表选择（最多3个）**: Daily Wear, Casual, Sport, Travel, Party, Formal, Outdoor, School
8. seasons: **最多选2个，只能是**: Spring, Summer, Fall, Winter（不允许 "Mild Winter" 等变体）。根据产品类型判断：凉鞋/拖鞋/短袖/背心 → Summer 或 Spring+Summer；羽绒服/棉服/毛衣 → Fall+Winter；卫衣/长袖/运动鞋 → Spring+Fall 或 Fall+Winter；真正四季通用的（手表/包包/帽子）→ Spring+Fall。**禁止选3个或4个季节**
9. gender: **只能是**: men / women / unisex / kids（小写，不允许 "female"、"male"）
10. colors: 只能从以下 19 种标准色中选择：Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple, Brown, Beige, Gold, Silver, Navy, Burgundy, Army Green, Transparent, Multicolor。如果颜色不确定归类，选最接近的大类。拼色/印花/渐变 → Multicolor
11. **所有 attributes 值必须使用英文！**绝对不要输出中文属性值
12. 联名/合作款标题必须包含双方品牌名，格式 "Brand A x Brand B + Model/款式名 + 配色/特征 + ProductType"，例如 "Nike x Off-White Air Jordan 1 Chicago Sneakers"

请分析：`;
}

/**
 * 阶段1.5：图片品牌分类 Prompt (v3.1)
 *
 * 目标：对每张图片进行品牌分类，确定属于哪个品牌
 * 输入：所有图片 + 阶段1识别到的品牌列表
 * 输出：每张图片的品牌分类结果
 *
 * 关键：输出必须简洁，避免截断
 */
export function buildImageBrandClassificationPrompt(options: {
  imageCount: number;
  brands: Array<{ name: string; slug?: string }>;
  productType: string;
}): string {
  const { imageCount, brands, productType } = options;
  const brandList = brands
    .map((brand) => `${brand.name}${brand.slug ? ` (${brand.slug})` : ''}`)
    .join(', ');
  const brandFeatures = generateBrandRecognitionPrompt();

  return `你是时尚产品识别专家。为 ${imageCount} 张图片分类品牌。

## 已知品牌
${brandList}

## 产品类型
${productType}

## 品牌识别位置
- 服装: 胸口印花、衣领标签、袖标、背面
- 鞋类: 鞋舌、鞋侧面、鞋后跟、鞋底
- 包袋: 正面LOGO、五金件、内标
- 配饰: 表面刻字、吊牌

## 常见品牌特征
${brandFeatures}

## 任务
仔细观察每张图片，识别其品牌。输出格式必须简洁！

## 返回 JSON（极简格式）

{
  "classifications": [
    {"i": 0, "b": "Brand1", "s": "brand-1"},
    {"i": 1, "b": "Brand2", "s": "brand-2"},
    {"i": 2, "b": "Brand1", "s": "brand-1"}
  ]
}

## 规则
1. i = 图片索引（从0开始）
2. b = 品牌名（必须是已知品牌之一）
3. s = 品牌 slug（必须和 b 对应同一品牌）
4. 如果无法识别，b = "Unknown"，s = "unknown"
5. 必须为每张图片返回一个分类
6. 仔细看LOGO、标签、印花确定品牌
7. 同一款式不同颜色属于同一品牌
8. 拼图/合集图标记为 b="composite", s="composite"

请分析每张图片的品牌：`;
}
