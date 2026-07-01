import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { encryptedTransformer } from '../../utils/crypto';

export enum OAuthProvider {
  GOOGLE = 'google',
  DISCORD = 'discord',
  APPLE = 'apple',
}

@Entity('user_oauth_accounts')
@Unique(['provider', 'providerAccountId'])
export class UserOAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 20,
  })
  provider: OAuthProvider;

  @Column({ name: 'provider_account_id', length: 255 })
  providerAccountId: string;

  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ nullable: true, length: 255 })
  name?: string;

  @Column({ nullable: true, length: 500 })
  avatar?: string;

  @Column({
    name: 'access_token',
    type: 'text',
    nullable: true,
    transformer: encryptedTransformer,
  })
  accessToken?: string;

  @Column({
    name: 'refresh_token',
    type: 'text',
    nullable: true,
    transformer: encryptedTransformer,
  })
  refreshToken?: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
