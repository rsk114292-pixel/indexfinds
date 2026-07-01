import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { ComprehensiveProductAnalysis } from '../../ai/ai.types';

/**
 * 商品拆分历史记录
 *
 * 用途：
 * - 记录混合商品的拆分操作
 * - 支持拆分回滚
 * - 追溯 AI 分析结果
 */
@Entity('product_split_history')
export class ProductSplitHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ========== 来源信息 ==========
  @Column({ name: 'sourceProductId', type: 'uuid' })
  @Index()
  sourceProductId: string; // 原始商品 ID（被拆分的商品）

  @Column({ name: 'sourceWeidianItemId', type: 'varchar', length: 64 })
  @Index()
  sourceWeidianItemId: string; // 原始微店商品 ID

  @Column({ name: 'sourceUrl', type: 'text' })
  sourceUrl: string; // 原始微店链接

  // ========== 拆分结果 ==========
  @Column({ name: 'resultProductIds', type: 'uuid', array: true })
  resultProductIds: string[]; // 拆分后的所有商品 ID

  // ========== AI 分析数据 ==========
  @Column({ name: 'aiAnalysisData', type: 'jsonb' })
  aiAnalysisData: ComprehensiveProductAnalysis; // AI 分析快照，便于回溯

  // ========== 拆分策略 ==========
  @Column({ name: 'splitStrategy', type: 'varchar', length: 20 })
  splitStrategy: 'auto' | 'manual' | 'semi_auto';

  // ========== 状态管理 ==========
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: 'active' | 'rolled_back' | 'superseded';

  @CreateDateColumn({ name: 'createdAt' })
  @Index()
  createdAt: Date;

  // ========== 回滚信息 ==========
  @Column({ name: 'rolledBackAt', type: 'timestamp', nullable: true })
  rolledBackAt: Date;

  @Column({ name: 'rolledBackReason', type: 'text', nullable: true })
  rolledBackReason: string;

  // ========== 操作人 ==========
  @Column({ name: 'operatorId', type: 'uuid', nullable: true })
  operatorId: string; // 操作人 ID（手动拆分时记录）
}
