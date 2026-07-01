import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WeidianService } from './weidian.service';
import { WeidianController } from './weidian.controller';
import { WeidianCache } from '../products/entities/weidian-cache.entity';
import { Product } from '../products/entities/product.entity';
import { Sku } from '../products/entities/sku.entity';
import { WeidianEventListener } from './weidian-event.listener';
import { WeidianThorApiService } from './weidian-thor-api.service';
import { WeidianCacheService } from './weidian-cache.service';
import { WeidianHtmlParserService } from './weidian-html-parser.service';
import { CacheRefreshService } from './cache-refresh.service';
import { CacheRefreshProcessor } from '../queue/processors/cache-refresh.processor';
import { QUEUE_NAMES } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeidianCache, Product, Sku]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CACHE_REFRESH,
    }),
  ],
  controllers: [WeidianController],
  providers: [
    WeidianService,
    WeidianThorApiService,
    WeidianCacheService,
    WeidianHtmlParserService,
    WeidianEventListener, // 事件监听器
    CacheRefreshService, // 缓存刷新服务
    {
      provide: 'CacheRefreshService',
      useExisting: CacheRefreshService,
    },
    CacheRefreshProcessor, // 缓存刷新队列处理器
  ],
  exports: [WeidianService, CacheRefreshService],
})
export class WeidianModule {}
