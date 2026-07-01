import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckinService } from './checkin.service';

@ApiTags('Checkin')
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async checkin(@CurrentUser() user: { id: string }) {
    return this.checkinService.doCheckin(user.id);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentUser() user: { id: string }) {
    return this.checkinService.getCheckinStatus(user.id);
  }
}
