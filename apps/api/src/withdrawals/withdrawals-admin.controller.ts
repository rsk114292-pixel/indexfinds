import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalStatus } from './entities/point-withdrawal.entity';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, AdminGuard)
export class WithdrawalsAdminController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get()
  async list(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalsService.getAdminWithdrawals(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/approve')
  async approve(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    return this.withdrawalsService.approveWithdrawal(
      req.user.id,
      id,
      dto.proofImage,
      dto.adminNote,
    );
  }

  @Post(':id/reject')
  async reject(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalsService.rejectWithdrawal(
      req.user.id,
      id,
      dto.adminNote,
    );
  }
}
