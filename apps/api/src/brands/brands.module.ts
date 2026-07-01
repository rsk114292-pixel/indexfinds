import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service';
import { BrandReviewService } from './brand-review.service';
import { BrandMatchService } from './brand-match.service';
import { BrandsController } from './brands.controller';
import { Brand } from './entities/brand.entity';
import { BrandEventListener } from './brand-event.listener';
import { Product } from '../products/entities/product.entity';
import { BrandAlias } from './entities/brand-alias.entity';
import { BrandRelation } from './entities/brand-relation.entity';
import { BrandCandidate } from './entities/brand-candidate.entity';
import { BrandCandidateItem } from './entities/brand-candidate-item.entity';
import { ProductBrandFact } from './entities/product-brand-fact.entity';
import { BrandGovernanceService } from './brand-governance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Brand,
      Product,
      BrandAlias,
      BrandRelation,
      BrandCandidate,
      BrandCandidateItem,
      ProductBrandFact,
    ]),
  ],
  controllers: [BrandsController],
  providers: [
    BrandsService,
    BrandReviewService,
    BrandMatchService,
    BrandGovernanceService,
    BrandEventListener,
  ],
  exports: [BrandsService, BrandGovernanceService], // 导出供 Product 模块使用
})
export class BrandsModule {}
