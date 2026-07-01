import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReferralCode } from './referral-code.entity';

@Entity('referral_clicks')
@Index(['referralCodeId', 'createdAt'])
@Index(['sessionId', 'createdAt'])
export class ReferralClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referralCodeId: string;

  @ManyToOne(() => ReferralCode)
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode;

  @Column()
  sessionId: string;

  @Column({ nullable: true })
  landingPage: string;

  @Column({ nullable: true })
  redirectTo: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true, length: 45 })
  ip: string;

  @Column({ nullable: true })
  referer: string;

  @CreateDateColumn()
  createdAt: Date;
}
