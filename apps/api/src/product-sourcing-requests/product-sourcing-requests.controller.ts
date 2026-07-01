import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { ProductSourcingRequestsService } from './product-sourcing-requests.service';
import { CreateProductSourcingRequestDto } from './dto/create-product-sourcing-request.dto';

@Controller('product-sourcing-requests')
@UseGuards(JwtAuthGuard)
export class ProductSourcingRequestsController {
  constructor(
    private readonly productSourcingRequestsService: ProductSourcingRequestsService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductSourcingRequestDto,
  ) {
    return this.productSourcingRequestsService.create(user.id, dto);
  }
}
