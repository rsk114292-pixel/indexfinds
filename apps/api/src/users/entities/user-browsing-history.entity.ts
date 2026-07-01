import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('user_browsing_history')
@Index(['user', 'product'], { unique: true })
@Index(['user', 'viewedAt'])
export class UserBrowsingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'brand_id', type: 'varchar', nullable: true })
  brandId: string | null;

  @Column({ name: 'category_id', type: 'varchar', nullable: true })
  categoryId: string | null;

  @UpdateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;
}
