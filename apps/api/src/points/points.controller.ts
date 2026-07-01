import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PointsService } from './points.service';
import { PointTransactionType } from './entities/point-transaction.entity';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import {
  DAILY_REWARDS,
  POINT_REWARDS,
  isShareRewardChannel,
} from './points.constants';

@Controller('points')
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.pointsService.getBalance(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Req() req: any, @Query() query: QueryTransactionsDto) {
    return this.pointsService.getTransactions(req.user.id, {
      page: query.page || 1,
      limit: query.limit || 20,
      type: query.type,
    });
  }

  @Get('ways-to-earn')
  async getWaysToEarn(@Req() req: any) {
    return this.pointsService.getWaysToEarn(req.user.id);
  }

  @Get('share-status')
  async getShareStatus(@Req() req: any) {
    return this.pointsService.getShareRewardStatus(req.user.id);
  }

  @Post('track-share')
  async trackShare(
    @Req() req: any,
    @Body() body: { productId?: string; channel?: string },
  ) {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const channel = body.channel?.trim().toLowerCase();

    if (!channel || !isShareRewardChannel(channel)) {
      return { success: false, reason: 'channel_not_eligible' };
    }

    // 每个分享渠道每天只奖励 1 次
    const channelKey = `points:share:channel:${userId}:${channel}:${today}`;
    const channelSet = await this.redis.set(channelKey, '1', 'EX', 86400, 'NX');
    if (!channelSet) {
      return { success: false, reason: 'channel_already_rewarded' };
    }

    await this.pointsService.addPoints({
      userId,
      type: PointTransactionType.EARN,
      action: 'first_share',
      amount: POINT_REWARDS.FIRST_SHARE,
      referenceType: 'user',
      referenceId: userId,
      description: 'First share bonus',
      metadata: { channel, productId: body.productId ?? null },
    });

    // 发放积分
    const tx = await this.pointsService.addPoints({
      userId,
      type: PointTransactionType.EARN,
      action: 'share_product',
      amount: DAILY_REWARDS.SHARE_PRODUCT,
      referenceType: 'share',
      referenceId: `share_${today}_${channel}`,
      description: 'Product share reward',
      metadata: { channel, productId: body.productId ?? null },
    });

    if (!tx) {
      return { success: false, reason: 'duplicate' };
    }

    return { success: true, pointsEarned: DAILY_REWARDS.SHARE_PRODUCT };
  }
}
