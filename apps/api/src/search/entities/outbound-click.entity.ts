import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 外跳来源类型
 */
export enum OutboundSource {
  SEARCH = 'search', // 搜索结果页
  IMAGE_SEARCH = 'image_search', // 图搜结果
  HOME = 'home', // 首页
  CATEGORY = 'category', // 分类页
  RECOMMENDATION = 'recommendation', // 相关推荐
  DIRECT = 'direct', // 直接访问
}

export enum OutboundPageType {
  HOME = 'home',
  SEARCH = 'search',
  PRODUCT = 'product',
  CATEGORY = 'category',
  BRAND = 'brand',
  PLATFORM_LANDING = 'platform_landing',
  OTHER = 'other',
}

export enum OutboundViewportDeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

/**
 * 外跳点击记录
 * 记录所有点击"购买"按钮跳转到代购平台的行为
 * 独立于搜索追踪，统计所有来源的外跳
 */
@Entity('outbound_clicks')
@Index(['productId', 'createdAt'])
@Index(['source', 'createdAt'])
@Index(['platformType', 'createdAt'])
@Index(['pageType', 'createdAt'])
@Index(['locale', 'createdAt'])
@Index(['viewportDeviceType', 'createdAt'])
@Index(['buttonVariant', 'createdAt'])
@Index(['query', 'createdAt'])
@Index(['createdAt'])
export class OutboundClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  @Column({ length: 50 })
  @Index()
  platformType: string; // 平台类型：weidian, taobao, 1688 等

  @Column({ length: 1000, nullable: true })
  platformUrl: string; // 跳转的具体链接

  @Column({
    type: 'varchar',
    length: 20,
    default: OutboundSource.DIRECT,
  })
  @Index()
  source: OutboundSource; // 来源

  @Column({ type: 'uuid', nullable: true })
  searchClickId: string; // 如果来源是搜索，关联 search_clicks

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  pageType: OutboundPageType | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  pagePath: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  query: string | null;

  @Column({
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  buttonVariant: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  locale: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  viewportDeviceType: OutboundViewportDeviceType | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  sessionId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  deviceId: string | null;

  @Column({ name: 'visit_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  visitId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
