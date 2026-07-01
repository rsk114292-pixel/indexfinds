import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Platforms')
@Controller('platforms')
export class PlatformsPublicController {
  constructor(private platformsService: PlatformsService) {}

  @Public()
  @Get('active')
  async findActive() {
    return this.platformsService.findActive();
  }
}
