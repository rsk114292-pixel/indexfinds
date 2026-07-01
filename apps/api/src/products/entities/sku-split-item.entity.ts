import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SkuSplitJob } from './sku-split-job.entity';

export enum SkuSplitItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  DUPLICATE = 'duplicate',
}

@Entity('sku_split_items')
export class SkuSplitItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SkuSplitJob, (job) => job.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: SkuSplitJob;

  @Index()
  @Column({ name: 'job_id' })
  jobId: string;

  @Column({ type: 'bigint' })
  attrId: number; // 款式维度的 attrId

  @Column()
  variantValue: string; // 变体值（如"White Black DD1391-100"）

  @Column({ nullable: true })
  imageUrl: string; // SKU 款式图

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number; // 该款式最低价

  @Column({ default: 0 })
  skuCount: number; // 该款式下的尺码数量

  @Column({
    type: 'enum',
    enum: SkuSplitItemStatus,
    default: SkuSplitItemStatus.PENDING,
  })
  status: SkuSplitItemStatus;

  @Column({ type: 'uuid', nullable: true })
  productId: string; // 创建成功后的产品 ID

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  processingLog: {
    ts: string;
    event: string;
    data?: Record<string, unknown>;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
