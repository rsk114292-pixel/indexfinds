import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralModule } from '../referral/referral.module';
import { ReferralClick } from '../referral/entities/referral-click.entity';
import { VisitSession } from './entities/visit-session.entity';
import { TrafficBlock } from './entities/traffic-block.entity';
import { VisitSessionService } from './visit-session.service';
import { TrafficDefenseService } from './traffic-defense.service';
import { VisitSessionController } from './visit-session.controller';
import { AdminTrafficController } from './admin-traffic.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitSession, ReferralClick, TrafficBlock]),
    ReferralModule,
  ],
  providers: [VisitSessionService, TrafficDefenseService],
  controllers: [VisitSessionController, AdminTrafficController],
  exports: [VisitSessionService, TrafficDefenseService],
})
export class VisitTrackingModule {}
