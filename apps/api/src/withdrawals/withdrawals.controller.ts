import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.createWithdrawal(req.user.id, dto);
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalsService.getUserWithdrawals(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/cancel')
  async cancel(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalsService.cancelWithdrawal(req.user.id, id);
  }
}
