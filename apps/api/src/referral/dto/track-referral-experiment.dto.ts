import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReferralExperimentEventType } from '../entities/referral-experiment-event.entity';

export class TrackReferralExperimentDto {
  @IsEnum(ReferralExperimentEventType)
  eventType: ReferralExperimentEventType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  placement?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  channelId?: string;
}
