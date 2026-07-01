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

@Entity('brand_relations')
@Index(['parentBrandId', 'childBrandId', 'relationType'], { unique: true })
export class BrandRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  parentBrandId: string;

  @ManyToOne(() => Brand, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentBrandId' })
  parentBrand: Brand;

  @Column({ type: 'uuid' })
  @Index()
  childBrandId: string;

  @ManyToOne(() => Brand, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'childBrandId' })
  childBrand: Brand;

  @Column({ type: 'varchar', length: 32, default: 'parent_child' })
  relationType: string;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
