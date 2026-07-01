import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { BrowsingHistoryService } from './browsing-history.service';
import {
  RecordViewDto,
  BulkSyncBrowsingHistoryDto,
} from './dto/browsing-history.dto';

@ApiTags('Browsing History')
@Controller('users/browsing-history')
@UseGuards(JwtAuthGuard)
export class BrowsingHistoryController {
  constructor(
    private readonly browsingHistoryService: BrowsingHistoryService,
  ) {}

  /**
   * 记录浏览
   * POST /users/browsing-history
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordView(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RecordViewDto,
  ) {
    await this.browsingHistoryService.recordView(req.user.id, dto);
  }

  /**
   * 批量同步（登录时上传本地历史）
   * POST /users/browsing-history/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async bulkSync(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BulkSyncBrowsingHistoryDto,
  ) {
    return this.browsingHistoryService.bulkSync(req.user.id, dto);
  }

  /**
   * 获取浏览历史
   * GET /users/browsing-history?limit=50
   */
  @Get()
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.browsingHistoryService.getHistory(
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * 清空浏览历史
   * DELETE /users/browsing-history
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearHistory(@Request() req: AuthenticatedRequest) {
    await this.browsingHistoryService.clearHistory(req.user.id);
  }
}
