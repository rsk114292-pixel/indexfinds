import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { SkuSplitItem } from './sku-split-item.entity';

export enum SkuSplitJobStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL_FAILED = 'partial_failed',
  FAILED = 'failed',
}

@Entity('sku_split_jobs')
export class SkuSplitJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SkuSplitJobStatus,
    default: SkuSplitJobStatus.PENDING,
  })
  @Index()
  status: SkuSplitJobStatus;

  @Column()
  weidianItemId: string; // 原始微店 ID

  @Column({ type: 'text', nullable: true })
  weidianTitle: string; // 微店原始标题（仅管理员参考）

  @Column()
  splitDimension: string; // 拆分维度名（如"颜色"）

  @Column({ default: 0 })
  totalVariantCount: number;

  @Column({ default: 0 })
  processedCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column({ default: 0 })
  duplicateCount: number;

  @Column({ type: 'uuid' })
  @Index()
  productGroupId: string; // 本次拆分生成的组 ID

  @Column({ nullable: true })
  sourceUrl: string; // 微店原始链接

  @Column({ nullable: true })
  shopId: string; // 目标店铺

  @Column({ nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  batchId: string; // 批量拆分的批次 ID，单个拆分为 null

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany('SkuSplitItem', 'job')
  items: SkuSplitItem[];
}
