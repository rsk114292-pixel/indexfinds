import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Brand } from '../../brands/entities/brand.entity';
import { Sku } from './sku.entity';
import { ProductQcMedia } from './product-qc-media.entity';
import { ProductStatus } from '../product-status';

@Entity('products')
@Index('idx_products_category_status', ['primaryCategoryId', 'status'])
@Index('idx_products_brand_status', ['brandId', 'status'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========== 基础信息 ==========
  @Column()
  title: string; // AI 生成的英文标题（SEO 友好）

  @Column({ unique: true })
  slug: string; // URL 友好标识

  @Column({ type: 'text', nullable: true })
  description: string; // AI 生成的商品描述（HTML/Markdown）

  // ========== 原始数据（微店） ==========
  @Column({ type: 'text', nullable: true })
  originalTitle: string; // 微店原始标题（中文）

  @Column({ type: 'text', nullable: true })
  originalDescription: string; // 微店原始描述

  @Column({ nullable: true, unique: true })
  @Index()
  weidianItemId: string; // 微店商品 ID（唯一约束防止重复导入）

  @Column({ nullable: true })
  weidianShopId: string; // 微店店铺 ID

  @Column({ nullable: true })
  weidianShopName: string; // 微店店铺名称

  // ========== 品牌关联 ==========
  @ManyToOne(() => Brand, (brand) => brand.products, { nullable: true })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  brandId: string;

  // ========== AI 品牌识别（原始记录） ==========
  @Column({ type: 'varchar', length: 255, nullable: true })
  aiBrandName: string; // AI 识别的原始品牌名（用于追溯）

  @Column({ type: 'float', nullable: true })
  brandConfidence: number; // AI 品牌识别置信度 (0-1)

  // ========== 分类关联（主分类 + 副分类） ==========
  // 主分类（用于 URL 和面包屑）
  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'primaryCategoryId' })
  primaryCategory: Category;

  @Column({ type: 'uuid' })
  @Index()
  primaryCategoryId: string;

  // 副分类（多对多，用于筛选和曝光）
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'product_secondary_categories',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  secondaryCategories: Category[];

  // ========== 价格 ==========
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMin: number; // 最低价格（来自 SKU）

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMax: number; // 最高价格（来自 SKU）

  @Column({ type: 'varchar', length: 3, default: 'CNY' })
  currency: string; // 货币单位

  // ========== 图片 ==========
  @Column({ nullable: true })
  mainImage: string; // 主图 URL

  @Column('simple-json', { nullable: true })
  images: string[]; // 商品图片数组

  @Column('simple-json', { nullable: true })
  detailImages: string[]; // 详情图片数组（微店 getDetailDesc）

  @OneToMany(() => ProductQcMedia, (qcMedia) => qcMedia.product, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  qcMedia: ProductQcMedia[];

  qcMediaCount?: number;
  qcPhotoCount?: number;

  // ========== AI 提取的属性 ==========
  @Column('simple-json', { nullable: true })
  aiAttributes: {
    colors?: string[]; // AI 识别的颜色
    styles?: string[]; // 风格（Casual, Street, Vintage）
    occasions?: string[]; // 场景（Daily, Sports, Party）
    seasons?: string[]; // 季节（Summer, Winter）
    gender?: string; // 性别（Men, Women, Unisex）
    sizes?: string[]; // 尺码
  };

  // 商品原始属性（自由文本）
  @Column('simple-json', { nullable: true })
  attributes: Record<string, string | number | boolean>; // { "材质": "纯棉", "产地": "中国" }

  // ========== 微店原始数据缓存 ==========
  @Column('simple-json', { nullable: true })
  weidianRawData: {
    skuInfo?: unknown; // 微店 SKU 原始响应
    detailDesc?: unknown; // 微店详情描述原始响应
    lastFetchedAt?: string; // 最后抓取时间
  };

  // ========== 外跳链接 ==========
  @Column({ nullable: true })
  sourceUrl: string; // 微店商品 URL

  // ========== 商品状态 ==========
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @Index()
  status: ProductStatus;

  // ========== 统计与标记 ==========
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean; // 是否推荐

  @Column({ type: 'int', default: 0 })
  featuredSort: number; // 推荐排序（越小越靠前，0=未设置）

  @Column({ type: 'int', default: 0 })
  viewCount: number; // 浏览次数

  @Column({ type: 'int', default: 0 })
  salesCount: number; // 外跳次数（模拟销量）

  @Column({ type: 'int', default: 0 })
  clickCount: number; // 点击次数

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  ctr: number; // 点击率 (Click-Through Rate)

  @Column({ type: 'int', default: 0 })
  favoriteCount: number; // 收藏次数（冗余字段，由收藏操作实时递增）

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  @Index('idx_products_popularity_score')
  popularityScore: number; // 综合热度分（定时任务计算）

  // ========== 混合商品支持 (v2.1) ==========
  // 混合度评估
  @Column({
    name: 'mixednessScore',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  mixednessScore: number; // 混合度评分 (0-1)，越高越可能是混合商品

  @Column({ name: 'mixednessEvaluated', type: 'boolean', default: false })
  mixednessEvaluated: boolean; // 是否已评估混合度

  @Column({ name: 'potentialMixedProduct', type: 'boolean', default: false })
  @Index()
  potentialMixedProduct: boolean; // 疑似混合商品标记

  // 拆分支持（拆分后的商品共享同一 productGroupId）
  @Column({ name: 'productGroupId', type: 'uuid', nullable: true })
  @Index()
  productGroupId: string; // 商品组 ID（拆分后的商品共享）

  @Column({ name: 'isFromSplit', type: 'boolean', default: false })
  isFromSplit: boolean; // 是否从混合商品拆分而来

  @Column({ name: 'splitSourceUrl', type: 'text', nullable: true })
  splitSourceUrl: string; // 原始微店链接（拆分前）

  // SKU 拆分支持（按配色维度拆分）
  @Column({ name: 'skuVariantKey', type: 'varchar', nullable: true })
  skuVariantKey: string; // 变体标识（款式维度 attrId），用于去重

  @Column({ name: 'splitSourceWeidianId', type: 'varchar', nullable: true })
  @Index()
  splitSourceWeidianId: string; // 拆分来源微店 ID（weidianItemId 为 null 时用此追溯）

  @Column({ name: 'splitMetadata', type: 'simple-json', nullable: true })
  splitMetadata: {
    originalWeidianItemId?: string; // 原始微店商品 ID
    splitAt?: string; // 拆分时间
    splitReason?: string; // 拆分原因
    aiAnalysisSnapshot?: unknown; // AI 分析快照（ComprehensiveProductAnalysis）
    // v2.1 综合分析结果
    analysisTimestamp?: string; // 分析时间戳
    suggestedGroups?: unknown[]; // 分组建议
    overallConfidence?: number; // 整体置信度
    processingStrategy?: string; // 处理策略
  };

  // 变体支持（同系列不同款式，如 AF1 Low/Mid/High）
  @Column({ name: 'parentProductId', type: 'uuid', nullable: true })
  @Index()
  parentProductId: string; // 父商品 ID（如果是变体）

  @Column({ name: 'hasVariants', type: 'boolean', default: false })
  hasVariants: boolean; // 是否有变体子商品

  @Column({ name: 'variantAttributes', type: 'simple-json', nullable: true })
  variantAttributes: {
    type?: string; // 变体类型，如 'model_variant', 'size_variant', 'color_variant'
    value?: string; // 单一变体值，如 "Low Top", "Mid Top", "High Top"
    values?: string[]; // 变体值数组（用于多变体场景）
  };

  // ========== 死链检测 ==========
  @Column({ type: 'timestamp', nullable: true })
  weidianDeadLinkAt: Date; // 首次检测到死链的时间（null = 正常）

  @Column({ type: 'text', nullable: true })
  weidianDeadLinkReason: string; // API 返回的错误信息

  @Column({ type: 'int', default: 0 })
  weidianDeadLinkAttempts: number; // 连续失败次数（0=正常，1=疑似，2+=确认死链）

  // ========== SKU 关联 ==========
  @OneToMany(() => Sku, (sku) => sku.product, { cascade: true })
  skus: Sku[];

  // ========== 多语言支持（预留） ==========
  @Column('simple-json', { nullable: true })
  translations: Record<
    string,
    {
      title?: string;
      description?: string;
    }
  >; // { "zh": { title: "...", description: "..." } }

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
