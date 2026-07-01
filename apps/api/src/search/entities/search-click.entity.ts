import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SearchLog } from './search-log.entity';

/**
 * 搜索点击记录
 * 记录用户在搜索结果中点击了哪个商品
 */
@Entity('search_clicks')
@Index(['searchLogId', 'productId'])
@Index(['productId', 'createdAt'])
@Index(['query', 'productId'])
@Index(['createdAt'])
export class SearchClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  searchLogId: string;

  @ManyToOne(() => SearchLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchLogId' })
  searchLog: SearchLog;

  @Column({ length: 255 })
  @Index()
  query: string; // 冗余存储搜索词，便于直接查询

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  @Column({ type: 'int' })
  position: number; // 点击时商品在搜索结果中的位置

  @Column({ type: 'int', default: 1 })
  page: number; // 第几页

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  sessionId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'visit_id', type: 'varchar', length: 255, nullable: true })
  visitId: string | null;

  @Column({ type: 'boolean', default: false })
  converted: boolean; // 是否转化（跳转到购买平台）

  @CreateDateColumn()
  createdAt: Date;
}
