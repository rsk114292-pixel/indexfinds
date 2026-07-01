import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HotSearchExperiment } from './hot-search-experiment.entity';

export enum ExperimentEventType {
  IMPRESSION = 'impression',
  CLICK = 'click',
  SEARCH = 'search',
}

@Entity('hot_search_experiment_events')
export class HotSearchExperimentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'experiment_id', type: 'uuid' })
  @Index('idx_hsee_experiment')
  experimentId: string;

  @ManyToOne(() => HotSearchExperiment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'experiment_id' })
  experiment: HotSearchExperiment;

  @Column({ name: 'variant_id', type: 'varchar', length: 50 })
  @Index('idx_hsee_variant')
  variantId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  @Index('idx_hsee_event_type')
  eventType: ExperimentEventType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keyword: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
