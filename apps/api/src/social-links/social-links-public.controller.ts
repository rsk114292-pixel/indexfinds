import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SocialLinksService } from './social-links.service';

@ApiTags('Social Links')
@Controller('social-links')
export class SocialLinksPublicController {
  constructor(private service: SocialLinksService) {}

  @Public()
  @Get()
  async findActive() {
    return this.service.findAllActive();
  }
}
