import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Attribute } from './attribute.entity';
import { Color } from '../../colors/entities/color.entity';

@Entity('attribute_values')
@Unique(['attribute', 'slug'])
export class AttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  value: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Attribute, (attribute) => attribute.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @ManyToOne(() => Color, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ref_color_id' })
  refColor: Color;

  @Column({ name: 'ref_color_id', nullable: true })
  refColorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
