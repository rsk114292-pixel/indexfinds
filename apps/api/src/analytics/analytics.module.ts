import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClickEvent } from './entities/click-event.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { ReferralModule } from '../referral/referral.module';
import { SearchModule } from '../search/search.module';
import { AnalyticsAlertsService } from './analytics-alerts.service';
import { Product } from '../products/entities/product.entity';
import { ProductInteractionEvent } from '../products/entities/product-interaction-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClickEvent, Product, ProductInteractionEvent]),
    ReferralModule,
    SearchModule, // Admin analytics overview/clicks now read outbound analytics from SearchModule
  ],
  providers: [AnalyticsService, AnalyticsAlertsService],
  controllers: [AnalyticsController, AdminAnalyticsController],
  exports: [AnalyticsService, AnalyticsAlertsService],
})
export class AnalyticsModule {}
