import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';

/**
 * BrandReviewService
 * 负责品牌审核流程：
 * - 批准品牌
 * - 拒绝品牌
 * - 获取待审核列表
 */
@Injectable()
export class BrandReviewService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  /**
   * 获取待审核品牌列表（包含商品数量）
   */
  async findPending(): Promise<Brand[]> {
    return this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('brand.status = :status', { status: 'pending_review' })
      .orderBy('brand.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 批准品牌（pending_review -> active）
   */
  async approve(id: string, reviewedBy?: string): Promise<Brand> {
    const brand = await this.findOneById(id);

    if (brand.status !== 'pending_review') {
      throw new BadRequestException(
        `品牌当前状态为 "${brand.status}"，只有 pending_review 状态的品牌可以被批准`,
      );
    }

    brand.status = 'active';
    brand.metadata = {
      ...brand.metadata,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
    };

    return this.brandRepository.save(brand);
  }

  /**
   * 拒绝品牌（pending_review -> rejected）
   */
  async reject(
    id: string,
    reviewedBy?: string,
    reason?: string,
  ): Promise<Brand> {
    const brand = await this.findOneById(id);

    if (brand.status !== 'pending_review') {
      throw new BadRequestException(
        `品牌当前状态为 "${brand.status}"，只有 pending_review 状态的品牌可以被拒绝`,
      );
    }

    brand.status = 'rejected';
    brand.metadata = {
      ...brand.metadata,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejectReason: reason,
    };

    return this.brandRepository.save(brand);
  }

  /**
   * 内部方法：根据 ID 查找品牌
   */
  private async findOneById(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand ID ${id} not found`);
    }
    return brand;
  }
}
