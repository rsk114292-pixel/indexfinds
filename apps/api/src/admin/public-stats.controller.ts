import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminService } from './admin.service';

@ApiTags('Public')
@Controller('public')
export class PublicStatsController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get('stats')
  async getStats() {
    return this.adminService.getPublicStats();
  }
}
