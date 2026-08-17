import { BadRequestException } from '@nestjs/common';

export type ProductPublicationQualityInput = {
  title?: string | null;
  originalTitle?: string | null;
  description?: string | null;
  originalDescription?: string | null;
  aiBrandName?: string | null;
  primaryCategoryId?: string | null;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  mainImage?: string | null;
  images?: string[] | null;
  potentialMixedProduct?: boolean | null;
};

export type ProductPublicationIssue = {
  code:
    | 'missing_title'
    | 'missing_ai_description'
    | 'missing_category'
    | 'invalid_price'
    | 'invalid_price_range'
    | 'missing_image'
    | 'high_risk_content'
    | 'mixed_product';
  message: string;
};

const HIGH_RISK_PATTERNS = [
  /\breplica\b/i,
  /\bcounterfeit\b/i,
  /\bknock[ -]?off\b/i,
  /\bfake\b/i,
  /高仿|精仿|仿品|复刻|假货|山寨/,
];

function nonEmpty(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function toFiniteNumber(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getProductPublicationIssues(
  product: ProductPublicationQualityInput,
): ProductPublicationIssue[] {
  const issues: ProductPublicationIssue[] = [];
  const priceMin = toFiniteNumber(product.priceMin);
  const priceMax = toFiniteNumber(product.priceMax);

  if (!nonEmpty(product.title)) {
    issues.push({ code: 'missing_title', message: '缺少可发布的商品标题' });
  }
  if (!nonEmpty(product.description)) {
    issues.push({
      code: 'missing_ai_description',
      message: 'AI 分析未成功生成商品描述',
    });
  }
  if (!nonEmpty(product.primaryCategoryId)) {
    issues.push({ code: 'missing_category', message: '缺少商品分类' });
  }
  if (priceMin === null || priceMin <= 0) {
    issues.push({ code: 'invalid_price', message: '商品价格必须大于 0' });
  }
  if (priceMax !== null && priceMin !== null && priceMax < priceMin) {
    issues.push({
      code: 'invalid_price_range',
      message: '最高价格不能低于最低价格',
    });
  }

  const hasImage =
    nonEmpty(product.mainImage) ||
    Boolean(product.images?.some((image) => nonEmpty(image)));
  if (!hasImage) {
    issues.push({ code: 'missing_image', message: '至少需要一张有效商品图片' });
  }

  const reviewText = [
    product.title,
    product.originalTitle,
    product.description,
    product.originalDescription,
    product.aiBrandName,
  ]
    .filter(nonEmpty)
    .join('\n');
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(reviewText))) {
    issues.push({
      code: 'high_risk_content',
      message: '标题、描述或品牌包含 replica/fake/仿品等高风险词，需要人工复核',
    });
  }

  if (product.potentialMixedProduct) {
    issues.push({
      code: 'mixed_product',
      message: '检测到混合商品，需要先完成人工拆分或复核',
    });
  }

  return issues;
}

export function assertProductPublicationQuality(
  product: ProductPublicationQualityInput,
): void {
  const issues = getProductPublicationIssues(product);
  if (issues.length === 0) return;

  throw new BadRequestException(
    `商品未通过发布质量门槛：${issues.map((issue) => issue.message).join('；')}`,
  );
}
