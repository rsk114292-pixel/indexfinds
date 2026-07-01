import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PointAccount } from './point-account.entity';

export enum PointTransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  WITHDRAW = 'withdraw',
  EXPIRE = 'expire',
  ADMIN_ADJUST = 'admin_adjust',
}

@Entity('point_transactions')
@Index(['userId', 'createdAt'])
@Index(['accountId', 'createdAt'])
@Index(['action', 'createdAt'])
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => PointAccount)
  @JoinColumn({ name: 'accountId' })
  account: PointAccount;

  @Column({ type: 'uuid' })
  userId: string;

  /** earn / spend / withdraw / expire / admin_adjust */
  @Column({
    type: 'enum',
    enum: PointTransactionType,
  })
  type: PointTransactionType;

  /** 具体动作：daily_checkin / referral_conversion / share / registration 等 */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /** 正数=收入，负数=支出 */
  @Column({ type: 'int' })
  amount: number;

  /** 变动后余额 */
  @Column({ type: 'int' })
  balanceAfter: number;

  /** 关联业务类型 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  /** 关联业务 ID */
  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /** 收入类积分的过期时间 */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
