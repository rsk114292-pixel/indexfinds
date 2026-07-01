import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';

/**
 * 商品数据访问模块
 *
 * 将 ProductQueryFacadeService 从 ProductsModule 中抽取为独立模块，
 * 彻底消除 SearchModule ↔ ProductsModule 的循环依赖。
 *
 * 依赖关系（修复后）：
 *   ProductsModule → SearchModule → ProductDataModule
 *   ProductsModule → ProductDataModule
 *
 * 不再存在：SearchModule → ProductsModule（已消除）
 */
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [ProductQueryFacadeService],
  exports: [ProductQueryFacadeService],
})
export class ProductDataModule {}
