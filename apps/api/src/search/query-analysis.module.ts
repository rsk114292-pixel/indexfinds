import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SynonymGroup } from './entities/synonym-group.entity';
import { Brand } from '../brands/entities/brand.entity';
import { SynonymService } from './synonym.service';
import { BrandCacheService } from './brand-cache.service';
import { IntentDetectorService } from './intent-detector.service';

/**
 * 查询分析模块
 *
 * 将同义词、品牌缓存、意图检测三个无外部模块依赖的服务
 * 抽取为独立模块，打断 SearchModule 内部的循环依赖链。
 *
 * 依赖关系：
 * - SynonymService → SynonymGroup entity
 * - BrandCacheService → Brand entity
 * - IntentDetectorService → 无依赖（纯逻辑）
 */
@Module({
  imports: [TypeOrmModule.forFeature([SynonymGroup, Brand])],
  providers: [SynonymService, BrandCacheService, IntentDetectorService],
  exports: [SynonymService, BrandCacheService, IntentDetectorService],
})
export class QueryAnalysisModule {}
