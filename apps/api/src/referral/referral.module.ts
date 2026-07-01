import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralClick } from './entities/referral-click.entity';
import { ReferralAttribution } from './entities/referral-attribution.entity';
import { ReferralExperimentEvent } from './entities/referral-experiment-event.entity';
import { User } from '../users/entities/user.entity';
import { ReferralService } from './referral.service';
import { ReferralRiskService } from './referral-risk.service';
import { ReferralController } from './referral.controller';
import { PointsModule } from '../points/points.module';
import { ReferralExperimentService } from './referral-experiment.service';
import { ReferralAnalyticsService } from './referral-analytics.service';
import { ReferralCodeService } from './referral-code.service';
import { ReferralAttributionService } from './referral-attribution.service';
import { ReferralConversionService } from './referral-conversion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralCode,
      ReferralClick,
      ReferralAttribution,
      ReferralExperimentEvent,
      User,
    ]),
    PointsModule,
  ],
  providers: [
    ReferralService,
    ReferralRiskService,
    ReferralExperimentService,
    ReferralAnalyticsService,
    ReferralCodeService,
    ReferralAttributionService,
    ReferralConversionService,
  ],
  controllers: [ReferralController],
  exports: [ReferralService, ReferralRiskService],
})
export class ReferralModule {}
