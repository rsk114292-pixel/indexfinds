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
import { BatchJob } from './batch-job.entity';
import type {
  WeidianSourceData,
  AiGeneratedData,
  FinalProductData,
} from '../types/batch-data.types';

export enum BatchJobItemStatus {
  PENDING = 'pending',
  FETCHING = 'fetching',
  FETCHED = 'fetched',
  GENERATING = 'generating',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

@Entity('batch_job_items')
export class BatchJobItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BatchJob, (job) => job.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_job_id' })
  batchJob: BatchJob;

  @Index()
  @Column({ name: 'batch_job_id' })
  batchJobId: string;

  @Column({
    type: 'enum',
    enum: BatchJobItemStatus,
    default: BatchJobItemStatus.PENDING,
  })
  status: BatchJobItemStatus;

  @Column()
  sourceUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  sourceData: WeidianSourceData | null;

  @Column({ type: 'jsonb', nullable: true })
  aiGeneratedData: AiGeneratedData | null;

  @Column({ type: 'jsonb', nullable: true })
  finalData: FinalProductData | null;

  @Column({ nullable: true })
  weidianItemId: string;

  @Column({ nullable: true })
  productId: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  processingLog: {
    ts: string;
    event: string;
    data?: Record<string, unknown>;
  }[];
}
