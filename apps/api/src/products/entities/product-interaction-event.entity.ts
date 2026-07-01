import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

export enum ProductInteractionEventType {
  VIEW = 'view',
  CLICK = 'click',
}

@Entity('product_interaction_events')
@Index('IDX_product_interaction_events_product_type_createdAt', [
  'productId',
  'eventType',
  'createdAt',
])
@Index('IDX_product_interaction_events_visitor_type_createdAt', [
  'trustedVisitorId',
  'eventType',
  'createdAt',
])
@Index('IDX_product_interaction_events_user_type_createdAt', [
  'userId',
  'eventType',
  'createdAt',
])
export class ProductInteractionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({
    type: 'enum',
    enum: ProductInteractionEventType,
  })
  eventType: ProductInteractionEventType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trustedVisitorId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
