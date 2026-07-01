/**
 * 类型定义统一导出
 */

// 通用类型
export type {
  ApiResponse,
  ApiListResponse,
  PaginationMeta,
  ApiError,
  Price,
  Image,
  Translations,
  DashboardStats,
  OverviewData,
} from './common';

// 分类类型
export type { Category, CategorySimple, Breadcrumb } from './category';

// 品牌类型
export type {
  Brand,
  BrandSimple,
  BrandStatus,
  BrandCandidate,
  BrandCandidateDetail,
  BrandCandidateSampleProduct,
  BrandCandidateSignalBucket,
} from './brand';

// SKU 类型
export type { SKU, SKUAttribute } from './sku';

// 商品类型
export type {
  Product,
  AdminProductShopOption,
  AdminProductShopOverview,
  ProductQcMedia,
  ProductQcMediaType,
  ProductQcPhoto,
  ProductListItem,
  FavoriteItem,
  CollectionResponse,
  AIAttributes,
  VisualSearchResult,
  ProductFormData,
  ProcessingLogEntry,
  BatchItem,
  BatchJob,
  ReviewItemData,
  ReviewItem,
  MixedProduct,
  MixedProductsResponse,
} from './product';

// 筛选器类型
export type {
  FilterParams,
  FacetValue,
  Facets,
  FilterResponse,
  SortBy,
} from './filter';
