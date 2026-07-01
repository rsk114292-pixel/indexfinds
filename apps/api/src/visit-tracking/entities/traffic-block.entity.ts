import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TrafficBlockTargetType {
  IPV4 = 'ipv4',
  IPV4_CIDR = 'ipv4_cidr',
}

export enum TrafficBlockScope {
  PRODUCT_PATHS = 'product_paths',
}

export enum TrafficBlockStatus {
  PENDING_SYNC = 'pending_sync',
  ACTIVE = 'active',
  IGNORED = 'ignored',
  EXPIRED = 'expired',
}

@Entity('traffic_blocks')
@Index(['target', 'scope', 'status'])
@Index(['status', 'expiresAt'])
export class TrafficBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: TrafficBlockTargetType;

  @Column({ type: 'varchar', length: 64 })
  target: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: TrafficBlockScope.PRODUCT_PATHS,
  })
  scope: TrafficBlockScope;

  @Column({ type: 'varchar', length: 30 })
  status: TrafficBlockStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'metrics_snapshot', type: 'jsonb', nullable: true })
  metricsSnapshot: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
