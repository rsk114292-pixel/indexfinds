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
 * 搜索曝光记录
 * 记录每次搜索展示了哪些商品，在什么位置
 */
@Entity('search_impressions')
@Index(['searchLogId', 'productId'])
@Index(['productId', 'createdAt'])
@Index(['createdAt'])
export class SearchImpression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  searchLogId: string;

  @ManyToOne(() => SearchLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchLogId' })
  searchLog: SearchLog;

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  @Column({ type: 'int' })
  position: number; // 在搜索结果中的位置（从0开始）

  @Column({ type: 'int', default: 1 })
  page: number; // 第几页

  @CreateDateColumn()
  createdAt: Date;
}
