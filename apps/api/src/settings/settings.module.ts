import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Setting } from './entities/setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ExchangeRatesController } from './exchange-rates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting]), HttpModule],
  providers: [SettingsService],
  controllers: [SettingsController, ExchangeRatesController],
  exports: [SettingsService],
})
export class SettingsModule {}
