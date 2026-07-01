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
import { SearchHistoryService } from './search-history.service';
import {
  RecordSearchDto,
  BulkSyncSearchHistoryDto,
  RemoveSearchItemDto,
} from './dto/search-history.dto';

@ApiTags('Search History')
@Controller('users/search-history')
@UseGuards(JwtAuthGuard)
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  /**
   * 记录搜索
   * POST /users/search-history
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordSearch(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RecordSearchDto,
  ) {
    await this.searchHistoryService.recordSearch(req.user.id, dto.query);
  }

  /**
   * 批量同步（登录时上传本地搜索历史）
   * POST /users/search-history/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async bulkSync(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BulkSyncSearchHistoryDto,
  ) {
    return this.searchHistoryService.bulkSync(req.user.id, dto.items);
  }

  /**
   * 获取搜索历史
   * GET /users/search-history?limit=10
   */
  @Get()
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.searchHistoryService.getHistory(
      req.user.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * 删除单条搜索历史
   * DELETE /users/search-history/item
   */
  @Delete('item')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RemoveSearchItemDto,
  ) {
    await this.searchHistoryService.removeItem(req.user.id, dto.query);
  }

  /**
   * 清空搜索历史
   * DELETE /users/search-history
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearHistory(@Request() req: AuthenticatedRequest) {
    await this.searchHistoryService.clearHistory(req.user.id);
  }
}
