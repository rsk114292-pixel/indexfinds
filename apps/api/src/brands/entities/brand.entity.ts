import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // 品牌标准名称，例如 "Nike"

  @Column({ unique: true })
  slug: string; // URL 友好标识，例如 "nike"

  @Column('simple-array', { nullable: true })
  aliases: string[]; // 别名数组，例如 ["耐克", "NIKE", "nike官方"]

  @Column({ type: 'int', default: 0 })
  tier: number; // 品牌层级：1=核心品牌, 2=热门品牌, 0/3=长尾品牌（数字越小优先级越高）

  @Column({ type: 'varchar', length: 32, default: 'canonical' })
  brandType: string; // canonical / child / line

  @Column({ type: 'varchar', length: 32, default: 'independent' })
  displayMode: string; // independent / inherit_parent / hidden

  @Column({ type: 'varchar', length: 32, default: 'approved' })
  governanceStatus: string; // approved / pending_review / archived

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  canonicalKey: string | null; // 规范化键，用于治理期的同物归并

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'pending_review', 'merged', 'rejected'],
    default: 'pending_review',
  })
  @Index()
  status: string;

  @Column({ nullable: true })
  logoUrl: string; // 品牌 Logo URL

  @Column({ type: 'text', nullable: true })
  description: string; // 品牌描述

  @Column({ type: 'uuid', nullable: true })
  mergedIntoId: string; // 如果被合并，指向目标品牌的 ID

  @Column('simple-json', { nullable: true })
  metadata: {
    aiConfidence?: number; // AI recognition confidence (0-1)
    aiSource?: string; // AI source (e.g., "vision", "text")
    reviewedBy?: string; // Reviewer user ID
    reviewedAt?: string; // Review timestamp
    notes?: string; // Admin notes
    rejectReason?: string; // Reject reason
    reactivatedAt?: string; // Reactivation timestamp
    reactivatedBy?: string; // Reactivation source
  };

  // ========== 父子品牌关系 ==========
  @Column({ type: 'uuid', nullable: true })
  parentId: string; // 父品牌 ID

  @ManyToOne(() => Brand, (brand) => brand.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Brand; // 父品牌

  @OneToMany(() => Brand, (brand) => brand.parent)
  children: Brand[]; // 子品牌列表

  @Column({ default: false })
  isIndependent: boolean; // 是否独立展示（不折叠到父品牌）

  // ========== 精选品牌 ==========
  @Column({ default: false })
  isFeatured: boolean; // 是否在首页精选位展示

  @Column({ type: 'int', default: 0 })
  featuredSort: number; // 精选排序，数字越小越靠前

  // ========== 商品关联 ==========
  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];

  // 商品数量（虚拟字段，通过查询动态计算）
  productCount?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
