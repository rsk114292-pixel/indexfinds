import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LockService } from './services/lock.service';
import { AnalyticsDedupService } from './services/analytics-dedup.service';

/**
 * 共享模块
 * 提供跨模块通信的基础设施（事件总线、分布式锁）
 * 使用 @Global() 装饰器使其在整个应用中可用
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // 使用通配符监听
      wildcard: true,
      // 分隔符
      delimiter: '.',
      // 如果事件没有监听器，不抛出错误
      ignoreErrors: false,
      // 最大监听器数量
      maxListeners: 20,
      // 新监听器添加时是否触发事件
      verboseMemoryLeak: true,
    }),
  ],
  providers: [LockService, AnalyticsDedupService],
  exports: [EventEmitterModule, LockService, AnalyticsDedupService],
})
export class SharedModule {}
