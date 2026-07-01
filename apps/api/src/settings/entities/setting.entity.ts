import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column('text')
  value: string;

  @Column({ nullable: true, length: 255 })
  description: string;

  @Column({ default: false })
  isSecret: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
