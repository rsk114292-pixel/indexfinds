import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SkuSplitBatch } from './sku-split-batch.entity';

export enum SkuSplitBatchItemStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  CREATING_JOB = 'creating_job',
  WAITING_JOB = 'waiting_job',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

@Entity('sku_split_batch_items')
export class SkuSplitBatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SkuSplitBatch, (batch) => batch.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: SkuSplitBatch;

  @Index()
  @Column({ type: 'uuid', name: 'batch_id' })
  batchId: string;

  @Column({
    type: 'enum',
    enum: SkuSplitBatchItemStatus,
    default: SkuSplitBatchItemStatus.PENDING,
  })
  @Index()
  status: SkuSplitBatchItemStatus;

  @Column({ type: 'text' })
  sourceUrl: string;

  @Column({ type: 'varchar', nullable: true })
  weidianItemId: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  splitJobId: string | null;

  @Column({ default: 0 })
  selectedCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

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

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;
}
