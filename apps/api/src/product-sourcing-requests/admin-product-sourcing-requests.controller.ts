import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProductSourcingRequestsService } from './product-sourcing-requests.service';
import { QueryAdminProductSourcingRequestDto } from './dto/query-admin-product-sourcing-request.dto';
import { UpdateProductSourcingRequestDto } from './dto/update-product-sourcing-request.dto';

@ApiTags('Admin Product Sourcing Requests')
@Controller('admin/product-sourcing-requests')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProductSourcingRequestsController {
  constructor(
    private readonly productSourcingRequestsService: ProductSourcingRequestsService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryAdminProductSourcingRequestDto) {
    return this.productSourcingRequestsService.findAdminList(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productSourcingRequestsService.findAdminOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductSourcingRequestDto,
  ) {
    return this.productSourcingRequestsService.updateAdmin(id, dto);
  }
}
