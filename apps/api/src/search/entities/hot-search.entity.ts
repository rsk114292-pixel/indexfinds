import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

export enum HotSearchSource {
  AUTO = 'auto',
  MANUAL = 'manual',
}

@Entity('hot_searches')
export class HotSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  @Index()
  keyword: string;

  @Column({ name: 'search_count', type: 'int', default: 0 })
  @Index()
  searchCount: number;

  @Column({ name: 'search_count_24h', type: 'int', default: 0 })
  searchCount24h: number;

  @Column({ name: 'search_count_7d', type: 'int', default: 0 })
  @Index('idx_hot_searches_search_count_7d')
  searchCount7d: number;

  @Column({ name: 'avg_result_count', type: 'int', default: 0 })
  avgResultCount: number;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'sort_order', type: 'int', nullable: true, default: null })
  sortOrder: number | null;

  @Column({
    name: 'source',
    type: 'varchar',
    length: 20,
    default: HotSearchSource.AUTO,
  })
  source: HotSearchSource;

  @Column({
    name: 'display_start_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  displayStartAt: Date | null;

  @Column({
    name: 'display_end_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  displayEndAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
