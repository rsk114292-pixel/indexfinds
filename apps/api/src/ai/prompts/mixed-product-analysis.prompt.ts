/**
 * 混合商品综合分析 Prompt 模板 (v3.3)
 *
 * v3.3 更新：
 * - description 长度调整为 500-800 字符，前 150 字符为精炼摘要（用于 SEO meta）
 *
 * v3.2 更新：
 * - 增加 description 长度要求 (150-300字符)
 * - 添加更完整的 attributes 要求
 * - 添加合集/拼图主图识别逻辑 (isComposite)
 */

import { generateBrandRecognitionPrompt } from '../brand-features';
import { CategoryForPrompt, formatCategoryTree } from './category-tree';

export interface PromptBuildOptions {
  imageCount: number;
  availableBrands: Array<{ name: string; slug: string }>;
  availableCategories: CategoryForPrompt[];
  skuAttributes?: Array<{ index: number; name: string }>;
}

/**
 * 构建综合分析 Prompt (v3.3 - 完整版)
 */
export function buildComprehensiveAnalysisPrompt(
  options: PromptBuildOptions,
): string {
  const { imageCount, availableBrands, availableCategories } = options;

  const brandFeatures = generateBrandRecognitionPrompt();
  const categoryTree = formatCategoryTree(availableCategories);
  const brandList =
    availableBrands.length > 0
      ? availableBrands
          .map((brand) => `- ${brand.name} | slug: ${brand.slug}`)
          .join('\n')
      : '';

  return `你是品牌识别专家。分析 ${imageCount} 张商品图片，识别品牌并分组。

## 品牌识别方法（按优先级）

1. **找LOGO** - 检查鞋舌、鞋侧面、鞋后跟的LOGO或品牌文字
2. **看设计** - 如果没有明显LOGO，根据设计特征判断

## 常见品牌LOGO
${brandFeatures}

${
  brandList
    ? `## 可选品牌（brand 和 brandSlug 必须精确选择以下同一行；无法确认时返回 Design / design）
${brandList}
`
    : ''
}

## 合集/拼图主图识别（非常重要！）

混合商品的主图通常是多个SKU的合集拼图，需要特殊处理：
- **合集主图特征**：一张图里展示多双不同颜色/款式的鞋子拼在一起
- **如何识别**：图片中有 ≥3 个不同产品/颜色并排或拼贴展示
- **处理方式**：在 perImageAnalysis 中标记 isComposite: true
- **合集图不应单独成为产品**，只用于展示目的

## 分组规则（非常重要！）
- **只按品牌分组！** 同一品牌的所有款式和颜色放在同一组
- 不同品牌 → 必须分组
- **同品牌不同款式 → 必须放在同一组！**
- **同款式不同颜色 → 必须放在同一组！**
- **合集拼图（isComposite: true）→ 不单独成组，忽略**

## groupKey命名规则
- groupKey = 品牌名（不含款式和颜色！）
- ✅ 正确: "louis-vuitton"（所有LV产品放一组）
- ❌ 错误: "lv-trainer", "lv-archlight"（不要按款式分）
- 例如：LV Trainer + LV Archlight + LV Run Away → 全部 groupKey = "louis-vuitton"

## 可用分类（缩进表示父子关系，必须选择最深层/最具体的分类）
${categoryTree}

## 返回JSON格式

{
  "overview": {
    "totalImages": ${imageCount},
    "mixednessScore": {"overallScore": 0.0},
    "isRecommendedToSplit": false,
    "detectedBrands": ["Nike", "Adidas"]
  },
  "perImageAnalysis": [
    {"imageIndex": 0, "brand": "Nike", "brandSlug": "nike", "groupKey": "nike-af1", "isComposite": false},
    {"imageIndex": 1, "brand": "composite", "brandSlug": "composite", "groupKey": "composite", "isComposite": true},
    {"imageIndex": 2, "brand": "Adidas", "brandSlug": "adidas", "groupKey": "adidas-superstar", "isComposite": false}
  ],
  "suggestedGroups": [
    {
      "groupKey": "nike-af1",
      "brand": "Nike",
      "brandSlug": "nike",
      "model": "Air Force 1",
      "productInfo": {
        "title": "Nike Air Force 1 Low Premium Leather Sneakers",
        "description": "The Nike Air Force 1 Low is a timeless streetwear icon featuring premium full-grain leather construction and legendary Nike Air cushioning for all-day comfort. First introduced in 1982 as a basketball shoe, the AF1 has since become one of the most influential sneakers in fashion history. The upper is crafted from smooth, durable leather that develops a beautiful patina over time, while the perforated toe box ensures excellent breathability during extended wear. The signature thick rubber cupsole features circular pivot points for superior traction and flexibility, originally designed for on-court performance. The padded collar and cushioned insole provide exceptional comfort whether you're walking city streets or standing all day. A versatile wardrobe essential that pairs effortlessly with jeans, joggers, or shorts for any casual occasion from daily commutes to weekend hangouts with friends.",
        "category": "sneakers",
        "attributes": {
          "colors": ["White", "Black", "Red"],
          "styles": ["Casual", "Streetwear", "Classic"],
          "occasions": ["Casual", "Daily Wear"],
          "seasons": ["Spring", "Summer"],
          "gender": "unisex"
        }
      },
      "imageIndexes": [0]
    },
    {
      "groupKey": "adidas-superstar",
      "brand": "Adidas",
      "brandSlug": "adidas",
      "model": "Superstar",
      "productInfo": {
        "title": "Adidas Superstar Shell-Toe Leather Sneakers",
        "description": "The Adidas Superstar is a legendary sneaker that defined an era, featuring the iconic rubber shell-toe cap and timeless three-stripe design that has remained virtually unchanged since 1969. Originally designed as a basketball shoe, the Superstar gained cultural significance in the 1980s when adopted by hip-hop pioneers Run-DMC, cementing its place in both sports and fashion history. The upper is constructed from premium full-grain leather for durability and a clean aesthetic, while the distinctive serrated three-stripe detailing provides both structural support and instantly recognizable style. The herringbone-pattern rubber cupsole delivers excellent grip and flexibility, with the shell-toe protecting your feet while adding that unmistakable silhouette. Inside, a cushioned sockliner ensures comfort throughout the day. Whether paired with cropped trousers for a smart-casual look or worn with athleisure wear for weekend outings, the Superstar remains a versatile essential for any fashion-conscious wardrobe.",
        "category": "sneakers",
        "attributes": {
          "colors": ["White"],
          "styles": ["Classic", "Streetwear", "Retro"],
          "occasions": ["Casual", "Daily Wear"],
          "seasons": ["Spring", "Summer"],
          "gender": "unisex"
        }
      },
      "imageIndexes": [2]
    }
  ]
}

## 重要规则

1. **perImageAnalysis** 需要5个字段: imageIndex, brand, brandSlug, groupKey, isComposite
1.1 **brand 和 brandSlug 必须与可选品牌列表中的同一行严格对应，不允许输出列表外的值；无法确认时统一返回 Design / design**
2. **合集图识别**: 多个产品拼贴在一张图里 → isComposite: true, groupKey: "composite"
3. **description 要求 500-800 字符（非常重要！）**:
   - **前 150 字符**：核心卖点摘要，精炼概括产品亮点（用于 SEO meta description）
   - **后 350-650 字符**：详细描述产品特点、材质工艺、设计细节、舒适性、历史背景、适用场景和穿搭建议
   - 用流畅的英文段落撰写，不要用列表
4. **attributes 必须包含以下5个字段**:
   - colors: 该分组包含的所有颜色 (如 ["White", "Black", "Red"])
   - styles: 风格标签，**必须且只能从以下列表选择**: ["Streetwear", "Casual", "Luxury", "Classic", "Sporty", "Minimalist", "Elegant", "Retro", "Athleisure", "Avant-Garde"] (最多3个)
   - occasions: 适用场合，**必须且只能从以下列表选择**: ["Daily Wear", "Casual", "Sport", "Travel", "Party", "Formal", "Outdoor", "School"] (最多3个)
   - seasons: **最多选2个，只能是**: Spring, Summer, Fall, Winter（不允许 "Mild Winter" 等变体）。根据产品类型判断：凉鞋/拖鞋/短袖/背心 → Summer 或 Spring+Summer；羽绒服/棉服/毛衣 → Fall+Winter；卫衣/长袖/运动鞋 → Spring+Fall 或 Fall+Winter；真正四季通用的（手表/包包/帽子）→ Spring+Fall。**禁止选3个或4个季节**
   - gender: **必须且只能是**: "men" / "women" / "unisex" / "kids"（全部小写，不允许 "female"、"male" 等变体）
   - colors: 只能从以下 19 种标准色中选择：Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple, Brown, Beige, Gold, Silver, Navy, Burgundy, Army Green, Transparent, Multicolor。如果颜色不确定归类，选最接近的大类。拼色/印花/渐变 → Multicolor
5. **不同品牌必须分组**
6. **同款不同颜色必须放同一组！** groupKey不含颜色，颜色放在attributes.colors数组里
7. JSON总长度控制在12000字符内
8. **所有 attributes 值必须使用英文！** colors、styles、occasions、seasons 的值必须是英文单词（如 "Black" 而非 "黑色"，"Casual" 而非 "休闲"）。绝对不要输出中文属性值
9. **title 格式**: 英文 Title Case，格式 Brand + Model/款式名 + 配色/特征 + ProductType（如 "Nike Air Force 1 Low White Sneakers"）。联名/合作款必须包含双方品牌名（如 "Nike x Off-White Air Jordan 1 Chicago Sneakers"）

请分析图片：
`;
}

/**
 * 简化版 Prompt（用于图片数量多的情况，>15张）
 */
export function buildSimplifiedAnalysisPrompt(options: {
  imageCount: number;
  availableBrands: Array<{ name: string; slug: string }>;
  availableCategories: CategoryForPrompt[];
}): string {
  const { imageCount, availableBrands, availableCategories } = options;
  const categoryTree = formatCategoryTree(availableCategories);
  const brandList =
    availableBrands.length > 0
      ? availableBrands
          .map((brand) => `- ${brand.name} | slug: ${brand.slug}`)
          .join('\n')
      : '';

  return `你是时尚产品识别专家。快速分析 ${imageCount} 张商品图片。

## 任务
1. 识别品牌（可能多个）
2. 判断是否混合商品
3. 生成精简的商品信息

${
  brandList
    ? `## 可选品牌（brand 和 brandSlug 必须精确选择以下同一行；无法确认时返回 Design / design）
${brandList}
`
    : ''
}

## 可用分类（缩进表示父子关系，必须选择最深层/最具体的分类）
${categoryTree}

## 返回JSON格式（保持精简！）

{
  "overview": {
    "totalImages": ${imageCount},
    "mixednessScore": {"overallScore": 0.0},
    "isRecommendedToSplit": false,
    "detectedBrands": ["Brand"]
  },
  "suggestedGroups": [
    {
      "groupKey": "brand-type",
      "brand": "Brand",
      "brandSlug": "brand-slug",
      "model": "Model",
      "imageCount": 10,
      "productInfo": {
        "title": "Brand Model Name Color/Feature ProductType (e.g. Nike Air Force 1 Low White Sneakers)",
        "description": "200-350 chars max. Key features and design highlights.",
        "category": "t-shirts",
        "attributes": {
          "colors": ["Black", "White"],
          "styles": ["Streetwear", "Casual"],
          "occasions": ["Daily Wear", "Casual"],
          "seasons": ["Spring", "Summer"],
          "gender": "unisex"
        }
      }
    }
  ],
  "overallConfidence": 0.8
}

## 重要规则
1. **不需要 perImageAnalysis 字段**
1.1 **brand 和 brandSlug 必须与可选品牌列表中的同一行严格对应，不允许输出列表外的值；无法确认时统一返回 Design / design**
2. **description 最多 350 字符**
3. **attributes 必须完整**
4. styles: **必须且只能从以下列表选择（最多3个）**: Streetwear, Casual, Luxury, Classic, Sporty, Minimalist, Elegant, Retro, Athleisure, Avant-Garde
5. occasions: **必须且只能从以下列表选择（最多3个）**: Daily Wear, Casual, Sport, Travel, Party, Formal, Outdoor, School
6. seasons: **最多选2个，只能是**: Spring, Summer, Fall, Winter（不允许 "Mild Winter" 等变体）。根据产品类型判断：凉鞋/拖鞋/短袖 → Summer 或 Spring+Summer；羽绒服/毛衣 → Fall+Winter；运动鞋/卫衣 → Spring+Fall 或 Fall+Winter；四季通用的 → Spring+Fall。**禁止选3个或4个季节**
7. gender: **只能是**: men / women / unisex / kids（小写，不允许 "female"、"male"）
8. colors: 只能从以下 19 种标准色中选择：Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple, Brown, Beige, Gold, Silver, Navy, Burgundy, Army Green, Transparent, Multicolor。如果颜色不确定归类，选最接近的大类。拼色/印花/渐变 → Multicolor
9. 确保返回完整有效的 JSON
7. **所有 attributes 值必须使用英文！** colors、styles、occasions、seasons 的值必须是英文单词（如 "Black" 而非 "黑色"，"Casual" 而非 "休闲"）。绝对不要输出中文属性值

请分析：
`;
}
