import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_search_history')
@Index(['user', 'query'], { unique: true })
@Index(['user', 'searchedAt'])
export class UserSearchHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  query: string;

  @UpdateDateColumn({ name: 'searched_at' })
  searchedAt: Date;
}
