import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('synonym_groups')
@Index(['isActive'])
export class SynonymGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'canonical_term', length: 100 })
  @Index()
  canonicalTerm: string;

  @Column('text', { array: true })
  synonyms: string[];

  @Column({ length: 50, default: 'general' })
  @Index()
  category: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
