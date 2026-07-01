import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from './brand.entity';

@Entity('brand_aliases')
@Index(['brandId', 'alias'])
export class BrandAlias {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  brandId: string;

  @ManyToOne(() => Brand, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ type: 'varchar', length: 255 })
  alias: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  normalizedAlias: string;

  @Column({ type: 'varchar', length: 32, default: 'common_variant' })
  aliasType: string;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  source: string;

  @Column({ type: 'boolean', default: false })
  isPreferred: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
