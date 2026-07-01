import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// 推荐码字符集（排除易混淆字符 0/O/I/L）
export const REFERRAL_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 6 })
  @Index()
  code: string;

  @Column({
    type: 'enum',
    enum: ['user', 'shop', 'campaign'],
    default: 'user',
  })
  ownerType: 'user' | 'shop' | 'campaign';

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ default: true })
  isActive: boolean;

  // Legacy raw field. New code paths should derive click metrics from referral_clicks.
  @Column({ default: 0 })
  totalClicks: number;

  @Column({ default: 0 })
  totalConversions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
