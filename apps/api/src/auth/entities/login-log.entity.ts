import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum LoginEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  FAILED = 'failed',
  OAUTH = 'oauth',
}

export enum LoginProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  DISCORD = 'discord',
  APPLE = 'apple',
}

@Entity('login_logs')
export class LoginLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 20,
  })
  eventType: LoginEventType;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  provider: LoginProvider;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'geo_location', length: 100, nullable: true })
  geoLocation?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  email?: string; // 用于记录登录失败时的邮箱（此时可能没有 userId）

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
