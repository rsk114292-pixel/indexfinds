import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_checkins')
@Index('idx_uc_user_date', ['userId', 'checkinDate'], { unique: true })
@Index('idx_uc_user_recent', ['userId', 'checkinDate'])
export class UserCheckin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' })
  checkinDate: string;

  @Column({ type: 'int', default: 1 })
  streakCount: number;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
