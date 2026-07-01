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
import { Product } from './product.entity';

export enum ProductQcMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('product_qc_media')
@Index('idx_product_qc_media_product_sort', ['productId', 'sortOrder'])
export class ProductQcMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.qcMedia, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    type: 'enum',
    enum: ProductQcMediaType,
    default: ProductQcMediaType.IMAGE,
  })
  type: ProductQcMediaType;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  posterUrl?: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  duration?: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
