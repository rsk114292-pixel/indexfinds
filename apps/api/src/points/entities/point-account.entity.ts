import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('point_accounts')
export class PointAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /** 当前可用余额 */
  @Column({ type: 'int', default: 0 })
  balance: number;

  /** 累计获得 */
  @Column({ type: 'int', default: 0 })
  totalEarned: number;

  /** 累计使用（兑换等） */
  @Column({ type: 'int', default: 0 })
  totalSpent: number;

  /** 累计提现 */
  @Column({ type: 'int', default: 0 })
  totalWithdrawn: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
