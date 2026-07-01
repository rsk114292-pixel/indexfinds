import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { BatchService } from './batch.service';
import { CreateBatchJobDto } from './dto/create-batch-job.dto';
import { UpdateBatchItemDto } from './dto/update-batch-item.dto';
import { BatchOperationDto } from './dto/batch-operation.dto';
import { BatchJobType } from './entities/batch-job.entity';
import { VisualSearchService } from '../search/visual-search.service';

@ApiTags('Batch Import')
@Controller('admin/batch')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BatchController {
  constructor(
    private readonly batchService: BatchService,
    private readonly visualSearchService: VisualSearchService,
  ) {}

  @Post('jobs')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createJob(
    @Body() dto: CreateBatchJobDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const job = await this.batchService.createBatchJob(
      dto.urls,
      req.user.id,
      dto.type || BatchJobType.IMPORT,
    );

    const warnings: string[] = [];
    if (dto.type !== BatchJobType.UPDATE) {
      const dedupAvailable =
        await this.visualSearchService.refreshServiceAvailability();
      if (!dedupAvailable) {
        warnings.push('图片去重服务不可用，本批次将跳过视觉重复检测');
      }
    }

    return {
      jobId: job.id,
      totalItems: job.totalItems,
      ...(warnings.length > 0 && { warnings }),
    };
  }

  @Post('jobs/:id/start')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async startJob(@Param('id') id: string) {
    await this.batchService.startBatchJob(id);
    return { message: 'Job started' };
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.batchService.findJobById(id);
  }

  @Get('jobs/:id/items')
  async getJobItems(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const safePage = Math.max(1, Math.min(Number(page) || 1, 500));
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    return this.batchService.getJobItems(id, safePage, safeLimit, status);
  }

  @Sse('jobs/:id/progress')
  getJobProgress(@Param('id') id: string): Observable<MessageEvent> {
    return this.batchService.getJobProgressStream(id);
  }

  @Post('jobs/:id/cancel')
  async cancelJob(@Param('id') id: string) {
    return this.batchService.cancelJob(id);
  }

  @Post('jobs/:id/retry')
  async retryFailedItems(@Param('id') id: string) {
    return this.batchService.retryFailedItems(id);
  }

  @Post('jobs/:id/retry-stuck')
  async retryStuckItems(@Param('id') id: string) {
    return this.batchService.retryStuckItems(id);
  }

  @Get('jobs')
  async getMyJobs(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.batchService.getJobs(Number(page), Number(limit));
  }

  @Get('items/review')
  async getReviewItems(@Query('jobId') jobId?: string) {
    return this.batchService.getReviewItems(jobId);
  }

  @Get('items/duplicates')
  async getDuplicateReviewItems() {
    return this.batchService.getDuplicateReviewItems();
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string) {
    return this.batchService.getReviewItem(id);
  }

  @Patch('items/:id')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateBatchItemDto) {
    if (dto.finalData) {
      await this.batchService.updateFinalData(id, dto.finalData);
    }
    return { success: true };
  }

  @Post('items/:id/regenerate')
  async regenerateItem(@Param('id') id: string) {
    await this.batchService.regenerateItem(id);
    return { success: true, message: 'AI regeneration queued' };
  }

  @Post('items/:id/approve')
  async approveItem(@Param('id') id: string) {
    await this.batchService.approveItem(id);
    return { success: true };
  }

  @Post('items/:id/publish')
  async publishItem(@Param('id') id: string) {
    return this.batchService.publishItem(id);
  }

  @Post('items/batch-publish')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async batchPublish(@Body() dto: BatchOperationDto) {
    return this.batchService.batchPublish(dto.itemIds);
  }

  @Post('items/batch-delete')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async batchDelete(@Body() dto: BatchOperationDto) {
    return this.batchService.batchDelete(dto.itemIds);
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string) {
    await this.batchService.deleteJob(id);
    return { success: true, message: 'Job deleted successfully' };
  }

  @Get('debug/item/:id/raw')
  async getItemRawData(@Param('id') id: string) {
    const item = await this.batchService.getReviewItem(id);
    return {
      id: item?.id,
      status: item?.status,
      sourceData: item?.sourceData,
      aiGeneratedData: item?.aiGeneratedData,
      finalData: item?.finalData,
    };
  }
}
