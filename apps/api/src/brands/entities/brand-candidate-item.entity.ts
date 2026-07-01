import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { BrandCandidate } from './brand-candidate.entity';

@Entity('brand_candidate_items')
@Index(['candidateId', 'productId'], { unique: true })
export class BrandCandidateItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  candidateId: string;

  @ManyToOne(() => BrandCandidate, (candidate) => candidate.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateId' })
  candidate: BrandCandidate;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ type: 'varchar', length: 255 })
  rawBrandName: string;

  @Column({ type: 'varchar', length: 255 })
  normalizedBrandName: string;

  @Column({ type: 'float', nullable: true })
  matchConfidence: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
