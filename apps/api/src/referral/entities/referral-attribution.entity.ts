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
import { ReferralClick } from './referral-click.entity';
import { User } from '../../users/entities/user.entity';

export enum AttributionEventType {
  REGISTRATION = 'registration',
  PURCHASE_CLICK = 'purchase_click',
  FAVORITE = 'favorite',
  PRODUCT_VIEW = 'product_view',
}

export enum AttributionStatus {
  PENDING = 'pending',
  VALID = 'valid',
  REJECTED = 'rejected',
}

@Entity('referral_attributions')
@Index(['referralCodeId', 'createdAt'])
@Index(['userId', 'eventType'])
export class ReferralAttribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referralCodeId: string;

  @ManyToOne(() => ReferralCode)
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode;

  @Column()
  referralClickId: string;

  @ManyToOne(() => ReferralClick)
  @JoinColumn({ name: 'referralClickId' })
  referralClick: ReferralClick;

  @Column({
    type: 'enum',
    enum: AttributionEventType,
  })
  eventType: AttributionEventType;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', nullable: true })
  eventData: Record<string, any>;

  @Column({
    type: 'enum',
    enum: AttributionStatus,
    default: AttributionStatus.PENDING,
  })
  status: AttributionStatus;

  @Column({ nullable: true, length: 50 })
  rejectReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
