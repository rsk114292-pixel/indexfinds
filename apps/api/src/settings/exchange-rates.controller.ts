import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Exchange Rates')
@Controller('settings')
export class ExchangeRatesController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Get('exchange-rates')
  async getExchangeRates() {
    const rates = await this.settingsService.getExchangeRates();
    const lastSync = await this.settingsService.getLastSyncTime();
    return { ...rates, _lastSync: lastSync };
  }

  @Public()
  @Get('tracking')
  async getTrackingConfig() {
    return this.settingsService.getTrackingConfig();
  }
}
