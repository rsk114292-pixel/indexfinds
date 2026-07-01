import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Legacy outbound click event log.
 * Kept only for referral purchase attribution compatibility.
 * Not used as the primary source for admin outbound analytics.
 */
@Entity('click_events')
@Index(['productId', 'createdAt'])
@Index(['referralCode', 'createdAt'])
export class ClickEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column({ length: 50 })
  platform: string;

  @Column({ nullable: true })
  weidianItemId: string;

  @Column({ type: 'jsonb', nullable: true })
  skuInfo: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @Column()
  sessionId: string;

  @Column({ nullable: true, length: 20 })
  referralCode: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true, length: 45 })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;
}
