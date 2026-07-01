import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { PublicStatsController } from './public-stats.controller';
import { AdminService } from './admin.service';
import { Product } from '../products/entities/product.entity';
import { ProductInteractionEvent } from '../products/entities/product-interaction-event.entity';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { SettingsModule } from '../settings/settings.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductInteractionEvent,
      Brand,
      Category,
      User,
    ]),
    MeilisearchModule,
    SettingsModule,
    ProductsModule,
  ],
  controllers: [AdminController, PublicStatsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
