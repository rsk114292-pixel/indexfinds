import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brand } from './brand.entity';
import { BrandCandidateItem } from './brand-candidate-item.entity';

@Entity('brand_candidates')
export class BrandCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  rawBrandName: string;

  @Column({ type: 'varchar', length: 255 })
  normalizedBrandName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  candidateKey: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  @Index()
  reviewStatus: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  suggestedBrandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggestedBrandId' })
  suggestedBrand: Brand | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  suggestedRelationType: string | null;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  @Column({ type: 'int', default: 1 })
  hitCount: number;

  @Column({ type: 'int', default: 0 })
  sampleProductCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'varchar', length: 32, default: 'import_ai' })
  source: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BrandCandidateItem, (item) => item.candidate)
  items: BrandCandidateItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
