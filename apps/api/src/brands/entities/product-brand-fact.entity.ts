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
import { Product } from '../../products/entities/product.entity';
import { Brand } from './brand.entity';
import { BrandCandidate } from './brand-candidate.entity';

@Entity('product_brand_facts')
export class ProductBrandFact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'varchar', length: 255 })
  rawBrandName: string;

  @Column({ type: 'varchar', length: 255 })
  normalizedBrandName: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  matchedBrandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matchedBrandId' })
  matchedBrand: Brand | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  candidateId: string | null;

  @ManyToOne(() => BrandCandidate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'candidateId' })
  candidate: BrandCandidate | null;

  @Column({ type: 'varchar', length: 32, default: 'unknown' })
  classification: string;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  matchMethod: string;

  @Column({ type: 'float', nullable: true })
  matchConfidence: number | null;

  @Column({ type: 'varchar', length: 32, default: 'pending_review' })
  reviewStatus: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  resolverType: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resolverId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
