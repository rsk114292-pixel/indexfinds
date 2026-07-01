import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('colors')
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // 标准颜色名称，例如 "红色"

  @Column({ unique: true })
  slug: string; // URL 友好标识，例如 "red"

  @Column({ nullable: true })
  nameEn: string; // 英文名称，例如 "Red"

  @Column('simple-array', { nullable: true })
  aliases: string[]; // 别名数组，例如 ["酒红", "枣红", "砖红", "玫红"]

  @Column('simple-array', { nullable: true })
  aliasesEn: string[]; // 英文别名，例如 ["wine red", "burgundy"]

  @Column({ nullable: true })
  hexCode: string; // 颜色代码，例如 "#FF0000"

  @Column({ default: 0 })
  sortOrder: number; // 排序顺序

  @Column({ default: true })
  isActive: boolean; // 是否启用

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
