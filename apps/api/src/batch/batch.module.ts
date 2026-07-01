import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch-job.entity';
import { BatchJobItem } from './entities/batch-job-item.entity';
import { BatchService } from './batch.service';
import { BatchImportProcessor } from '../queue/processors/batch-import.processor';
import { AiGenerationProcessor } from '../queue/processors/ai-generation.processor';
import { BatchController } from './batch.controller';
import { QueueModule } from '../queue/queue.module';
import { WeidianModule } from '../weidian/weidian.module';
import { ProductsModule } from '../products/products.module';
import { AIModule } from '../ai/ai.module';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadModule } from '../upload/upload.module';
import { SearchModule } from '../search/search.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchJob, BatchJobItem]),
    QueueModule,
    WeidianModule,
    ProductsModule,
    AIModule,
    BrandsModule,
    CategoriesModule,
    UploadModule,
    SearchModule,
    MeilisearchModule,
  ],
  controllers: [BatchController],
  providers: [BatchService, BatchImportProcessor, AiGenerationProcessor],
  exports: [BatchService],
})
export class BatchModule {}
