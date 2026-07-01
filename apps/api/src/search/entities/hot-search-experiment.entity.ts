import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface ExperimentVariant {
  id: string; // 'control' | 'variant_a' | ...
  name: string; // '对照组' | '新趋势算法'
  keywords?: string[]; // 显式关键词列表（可选）
  strategy?: string; // 算法策略名（可选）
  weight: number; // 流量占比 0-100
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

@Entity('hot_search_experiments')
export class HotSearchExperiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ExperimentStatus.DRAFT,
  })
  status: ExperimentStatus;

  @Column({ type: 'jsonb', default: [] })
  variants: ExperimentVariant[];

  @Column({ name: 'start_at', type: 'timestamptz', nullable: true })
  startAt: Date | null;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
