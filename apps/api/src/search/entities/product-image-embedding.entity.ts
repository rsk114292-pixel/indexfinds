import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

/**
 * 商品图片向量实体
 *
 * 每张商品图片对应一个向量记录，支持多角度/多SKU搜索
 */
@Entity('product_image_embeddings')
@Index(['productId', 'imageUrl'], { unique: true })
export class ProductImageEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'image_index', type: 'integer', default: 0 })
  imageIndex: number;

  // embedding 字段使用原生 SQL 操作，不在 TypeORM 中定义
  // @Column({ type: 'vector', nullable: true })
  // embedding: number[];

  @Column({
    name: 'embedding_failure_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  embeddingFailureCode?: string | null;

  @Column({ name: 'embedding_failure_reason', type: 'text', nullable: true })
  embeddingFailureReason?: string | null;

  @Column({ name: 'embedding_failed_at', type: 'timestamptz', nullable: true })
  embeddingFailedAt?: Date | null;

  @Column({ name: 'embedding_failure_count', type: 'integer', default: 0 })
  embeddingFailureCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
