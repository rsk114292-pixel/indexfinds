import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductSourcingRequest,
  ProductSourcingRequestStatus,
} from './entities/product-sourcing-request.entity';
import { CreateProductSourcingRequestDto } from './dto/create-product-sourcing-request.dto';
import { QueryAdminProductSourcingRequestDto } from './dto/query-admin-product-sourcing-request.dto';
import { UpdateProductSourcingRequestDto } from './dto/update-product-sourcing-request.dto';

@Injectable()
export class ProductSourcingRequestsService {
  constructor(
    @InjectRepository(ProductSourcingRequest)
    private readonly requestRepo: Repository<ProductSourcingRequest>,
  ) {}

  async create(
    userId: string,
    dto: CreateProductSourcingRequestDto,
  ): Promise<ProductSourcingRequest> {
    const description = dto.description?.trim() || null;
    const imageUrls = dto.imageUrls?.filter(Boolean) || [];

    if (!description && imageUrls.length === 0) {
      throw new BadRequestException(
        'Please provide either a description or at least one image',
      );
    }

    if (
      dto.budgetMin !== undefined &&
      dto.budgetMax !== undefined &&
      dto.budgetMin > dto.budgetMax
    ) {
      throw new BadRequestException(
        'budgetMin cannot be greater than budgetMax',
      );
    }

    const request = this.requestRepo.create({
      userId,
      searchQuery: dto.searchQuery?.trim() || null,
      productName: dto.productName.trim(),
      description,
      referenceUrl: dto.referenceUrl?.trim() || null,
      imageUrls,
      budgetMin: dto.budgetMin != null ? dto.budgetMin.toFixed(2) : null,
      budgetMax: dto.budgetMax != null ? dto.budgetMax.toFixed(2) : null,
      locale: dto.locale?.trim() || null,
      searchLogId: dto.searchLogId || null,
      filtersSnapshot: dto.filtersSnapshot || null,
      status: ProductSourcingRequestStatus.NEW,
    });

    return this.requestRepo.save(request);
  }

  async findAdminList(query: QueryAdminProductSourcingRequestDto) {
    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .orderBy('request.createdAt', 'DESC')
      .skip(((query.page || 1) - 1) * (query.limit || 20))
      .take(query.limit || 20);

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }

    if (query.hasImages) {
      qb.andWhere('array_length(request.image_urls, 1) > 0');
    }

    if (query.search?.trim()) {
      qb.andWhere(
        `(
          request.search_query ILIKE :search OR
          request.product_name ILIKE :search OR
          COALESCE(request.description, '') ILIKE :search OR
          user.email ILIKE :search OR
          COALESCE(user.username, '') ILIKE :search
        )`,
        { search: `%${query.search.trim()}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findAdminOne(id: string): Promise<ProductSourcingRequest> {
    const item = await this.requestRepo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!item) {
      throw new NotFoundException('Product sourcing request not found');
    }
    return item;
  }

  async updateAdmin(
    id: string,
    dto: UpdateProductSourcingRequestDto,
  ): Promise<ProductSourcingRequest> {
    const item = await this.findAdminOne(id);

    if (dto.status) {
      item.status = dto.status;
    }

    if (dto.adminNotes !== undefined) {
      item.adminNotes = dto.adminNotes?.trim() || null;
    }

    if (dto.linkedProductId !== undefined) {
      item.linkedProductId = dto.linkedProductId || null;
    }

    return this.requestRepo.save(item);
  }
}
