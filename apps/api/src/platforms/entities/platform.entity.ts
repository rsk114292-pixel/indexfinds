import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('platforms')
export class Platform {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  @Index()
  key: string; // 'loongbuy', 'superbuy', 'pandabuy'

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 255 })
  description: string;

  @Column('simple-json', { nullable: true })
  translations: Record<string, { name?: string; description?: string }>;

  @Column()
  baseUrl: string; // https://www.loongbuy.com/product-details

  @Column({ nullable: true, length: 100 })
  inviteCode: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: 0 })
  sortOrder: number;

  // URL 模板，支持变量替换：{inviteCode}, {weidianItemId}, {productId}
  @Column({ nullable: true })
  urlTemplate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
