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

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
}

@Entity('point_withdrawals')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class PointWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** 提现积分数量 */
  @Column({ type: 'int' })
  amount: number;

  /** 美元金额 = amount / 10 */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  cashAmount: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ type: 'varchar', length: 30 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 500 })
  paymentAccount: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  adminNote: string | null;

  /** 转账凭证截图 URL */
  @Column({ type: 'varchar', length: 500, nullable: true })
  proofImage: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
