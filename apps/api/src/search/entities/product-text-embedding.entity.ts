import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * 商品文本向量实体
 *
 * 用于语义搜索：将商品的 title + description 转换为向量
 * 支持用户用自然语言搜索，如 "beach vacation outfit"
 */
@Entity('product_text_embeddings')
@Index(['productId'], { unique: true })
export class ProductTextEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /**
   * 用于生成向量的原始文本
   * 格式: "[title] [brand] [category] [description]"
   */
  @Column({ name: 'source_text', type: 'text' })
  sourceText: string;

  /**
   * 文本哈希值，用于检测内容变化
   * 当商品信息更新时，比较哈希决定是否需要重新生成向量
   */
  @Column({ name: 'text_hash', type: 'varchar', length: 64 })
  textHash: string;

  // embedding 字段使用原生 SQL 操作，不在 TypeORM 中定义
  // vector(384) 适用于 all-MiniLM-L6-v2 模型
  // 向量维度配置: SEMANTIC_CONFIG.vectorDimensions (config/search.config.ts)

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
