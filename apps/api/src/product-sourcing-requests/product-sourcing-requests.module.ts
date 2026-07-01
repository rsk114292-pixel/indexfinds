import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductSourcingRequest } from './entities/product-sourcing-request.entity';
import { ProductSourcingRequestsService } from './product-sourcing-requests.service';
import { ProductSourcingRequestsController } from './product-sourcing-requests.controller';
import { AdminProductSourcingRequestsController } from './admin-product-sourcing-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductSourcingRequest])],
  providers: [ProductSourcingRequestsService],
  controllers: [
    ProductSourcingRequestsController,
    AdminProductSourcingRequestsController,
  ],
  exports: [ProductSourcingRequestsService],
})
export class ProductSourcingRequestsModule {}
