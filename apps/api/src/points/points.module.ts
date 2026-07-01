import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PointAccount } from './entities/point-account.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { User } from '../users/entities/user.entity';
import { UserCheckin } from '../checkin/entities/user-checkin.entity';
import { ReferralCode } from '../referral/entities/referral-code.entity';
import { ReferralClick } from '../referral/entities/referral-click.entity';
import { ReferralAttribution } from '../referral/entities/referral-attribution.entity';
import { ProductInteractionEvent } from '../products/entities/product-interaction-event.entity';
import { PointsService } from './points.service';
import { PointsExpiryService } from './points-expiry.service';
import { PointsController } from './points.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointAccount,
      PointTransaction,
      User,
      UserCheckin,
      ReferralCode,
      ReferralClick,
      ReferralAttribution,
      ProductInteractionEvent,
    ]),
    ConfigModule,
  ],
  providers: [
    PointsService,
    PointsExpiryService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
        });
      },
      inject: [ConfigService],
    },
  ],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
