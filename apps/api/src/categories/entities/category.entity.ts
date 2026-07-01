import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';

@Entity()
@Tree('closure-table')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  nameEn: string; // 英文名称

  @Column({ unique: true })
  slug: string; // URL友好标识

  @Column({ default: 0 })
  level: number; // 层级深度

  @Column('simple-array', { nullable: true })
  aliases: string[]; // 别名数组，用于匹配

  @Column({ default: 0 })
  sortOrder: number; // 排序顺序

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 软删除标记

  @Column('simple-json', { nullable: true })
  translations: Record<string, { name?: string; description?: string }>;

  @Column({ type: 'varchar', nullable: true })
  coverImage: string | null;

  @TreeParent({ onDelete: 'CASCADE' })
  parent: Category | null;

  @TreeChildren()
  children: Category[];
}
