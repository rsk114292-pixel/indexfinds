import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { SkuStatus } from '../product-status';

@Entity('skus')
export class Sku {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // SKU 编码（可选，用于库存管理）
  @Column({ unique: true, nullable: true })
  skuCode: string;

  // 关联商品（多对一）
  @ManyToOne(() => Product, (product) => product.skus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  // ========== 微店 SKU 信息 ==========
  @Column({ nullable: true })
  weidianSkuId: string; // 微店 SKU ID

  @Column('simple-array', { nullable: true })
  weidianAttrIds: number[]; // 微店属性 ID 数组，例如 [9679297372, 9677463371]

  // ========== SKU 属性（颜色、尺码等） ==========
  @Column('simple-json')
  attributes: Record<string, string>; // { "颜色": "黑色", "尺码": "M" }

  // SKU 唯一标识（用于匹配）
  @Column({ nullable: true })
  skuKey: string; // 例如 "颜色=黑色;尺码=M"

  // ========== 价格与库存 ==========
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number; // SKU 价格（单位：元）

  @Column({ type: 'int', default: 0 })
  stock: number; // 库存数量

  // ========== SKU 图片 ==========
  @Column({ type: 'varchar', nullable: true })
  image: string | null; // SKU 专属图片（如颜色图）

  // ========== SKU 状态 ==========
  @Column({
    type: 'enum',
    enum: SkuStatus,
    default: SkuStatus.AVAILABLE,
  })
  status: SkuStatus;

  // ========== 微店原始数据 ==========
  @Column('simple-json', { nullable: true })
  weidianRawData: unknown; // 微店 SKU 原始数据

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
