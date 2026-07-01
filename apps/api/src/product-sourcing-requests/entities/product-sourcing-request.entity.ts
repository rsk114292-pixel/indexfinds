import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ProductSourcingRequestStatus {
  NEW = 'new',
  REVIEWING = 'reviewing',
  PLANNED = 'planned',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

@Entity('product_sourcing_requests')
@Index(['userId'])
@Index(['status', 'createdAt'])
export class ProductSourcingRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'search_query',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  searchQuery: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'reference_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  referenceUrl: string | null;

  @Column({ name: 'image_urls', type: 'text', array: true, nullable: true })
  imageUrls: string[] | null;

  @Column({
    name: 'budget_min',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  budgetMin: string | null;

  @Column({
    name: 'budget_max',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  budgetMax: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale: string | null;

  @Column({ name: 'search_log_id', type: 'uuid', nullable: true })
  searchLogId: string | null;

  @Column({ name: 'filters_snapshot', type: 'jsonb', nullable: true })
  filtersSnapshot: Record<string, string> | null;

  @Column({
    type: 'enum',
    enum: ProductSourcingRequestStatus,
    default: ProductSourcingRequestStatus.NEW,
  })
  status: ProductSourcingRequestStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'linked_product_id', type: 'uuid', nullable: true })
  linkedProductId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
