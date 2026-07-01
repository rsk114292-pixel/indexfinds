import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { SkuSplitBatchItem } from './sku-split-batch-item.entity';

export enum SkuSplitBatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  PARTIAL_FAILED = 'partial_failed',
  FAILED = 'failed',
}

@Entity('sku_split_batches')
export class SkuSplitBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SkuSplitBatchStatus,
    default: SkuSplitBatchStatus.PENDING,
  })
  @Index()
  status: SkuSplitBatchStatus;

  @Column()
  totalUrls: number;

  @Column({ default: 0 })
  processedUrls: number;

  @Column({ default: 0 })
  successUrls: number;

  @Column({ default: 0 })
  failedUrls: number;

  @Column({ default: 0 })
  skippedUrls: number;

  @Column({ default: 0 })
  cancelledUrls: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany('SkuSplitBatchItem', 'batch')
  items: SkuSplitBatchItem[];
}
