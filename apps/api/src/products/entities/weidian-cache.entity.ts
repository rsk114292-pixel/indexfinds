import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ThorSkuInfoResponse,
  ThorDetailDescResponse,
} from '../../weidian/interfaces/thor-api.interface';

/**
 * 微店数据缓存表
 * 用于缓存从微店抓取的原始数据，避免频繁请求
 */
@Entity('weidian_cache')
export class WeidianCache {
  @PrimaryColumn()
  itemId: string; // 微店商品 ID

  // ========== 商品基础信息 ==========
  @Column({ type: 'text', nullable: true })
  title: string; // 商品标题

  @Column({ nullable: true })
  mainImage: string; // 主图 URL

  @Column('simple-json', { nullable: true })
  images: string[]; // 商品图片列表

  // ========== SKU 信息 ==========
  @Column('jsonb', { nullable: true })
  skuInfo: ThorSkuInfoResponse; // 微店 getItemSkuInfo 完整响应

  // ========== 详情描述 ==========
  @Column('jsonb', { nullable: true })
  detailDesc: ThorDetailDescResponse; // 微店 getDetailDesc 完整响应

  @Column('simple-json', { nullable: true })
  detailImages: string[]; // 详情图片列表

  // ========== 店铺信息 ==========
  @Column({ nullable: true })
  shopId: string; // 店铺 ID

  @Column({ nullable: true })
  shopName: string; // 店铺名称

  // ========== 价格范围 ==========
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMin: number; // 最低价（单位：元）

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMax: number; // 最高价（单位：元）

  // ========== 缓存状态 ==========
  @Column({
    type: 'enum',
    enum: ['success', 'partial', 'failed'],
    default: 'success',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // 错误信息（如果抓取失败）

  // ========== 时间戳 ==========
  @CreateDateColumn()
  createdAt: Date; // 首次抓取时间

  @UpdateDateColumn()
  updatedAt: Date; // 最后更新时间

  @Column({ type: 'timestamp', nullable: true })
  lastFetchedAt: Date; // 最后一次成功抓取时间
}
