import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { BatchJobItem } from './batch-job-item.entity';

export enum BatchJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
}

export enum BatchJobType {
  IMPORT = 'import',
  UPDATE = 'update',
}

@Entity('batch_jobs')
export class BatchJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BatchJobType })
  type: BatchJobType;

  @Column({
    type: 'enum',
    enum: BatchJobStatus,
    default: BatchJobStatus.PENDING,
  })
  status: BatchJobStatus;

  @Column()
  totalItems: number;

  @Column({ default: 0 })
  processedItems: number;

  @Column({ default: 0 })
  successItems: number;

  @Column({ default: 0 })
  failedItems: number;

  @Column({ default: 0 })
  inProgressItems: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany('BatchJobItem', 'batchJob')
  items: BatchJobItem[];
}
