import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { SimilarProductsService } from './similar-products.service';
import { CompleteTheLookService } from './complete-the-look.service';
import { SearchModule } from '../search/search.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    SearchModule,
    CategoriesModule,
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationService,
    SimilarProductsService,
    CompleteTheLookService,
  ],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
