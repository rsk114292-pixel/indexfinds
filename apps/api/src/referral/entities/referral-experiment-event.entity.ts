import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReferralExperimentEventType {
  MODAL_EXPOSURE = 'modal_exposure',
  HUB_EXPOSURE = 'hub_exposure',
  COPY_LINK = 'copy_link',
  SHARE_INVITE = 'share_invite',
}

@Entity('referral_experiment_events')
@Index(['experimentKey', 'createdAt'])
@Index(['variantId', 'createdAt'])
@Index(['eventType', 'createdAt'])
@Index(['userId', 'createdAt'])
export class ReferralExperimentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  experimentKey: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  variantId: string;

  @Column({ type: 'varchar', length: 40 })
  eventType: ReferralExperimentEventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
