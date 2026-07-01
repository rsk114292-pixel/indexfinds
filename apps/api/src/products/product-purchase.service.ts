import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PlatformsService } from '../platforms/platforms.service';

@Injectable()
export class ProductPurchaseService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly platformsService: PlatformsService,
  ) {}

  async generateBuyLink(productId: string, platformKey?: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const effectiveWeidianId =
      product.weidianItemId || product.splitSourceWeidianId;
    if (!effectiveWeidianId) {
      throw new BadRequestException('商品缺少微店 ID');
    }

    const platform = platformKey
      ? await this.platformsService.findByKey(platformKey)
      : await this.platformsService.getDefaultPlatform();

    if (!platform) {
      if (platformKey) {
        throw new NotFoundException(`平台 "${platformKey}" 不存在`);
      }
      throw new NotFoundException('没有可用的代购平台，请先在后台添加');
    }

    const url = this.platformsService.generateBuyLink(platform, {
      weidianItemId: effectiveWeidianId,
      productId: product.id,
    });

    return {
      url,
      platform: platform.key,
      platformName: platform.name,
      weidianItemId: effectiveWeidianId,
      productId: product.id,
      productTitle: product.title,
    };
  }

  async getAvailablePlatforms() {
    return this.platformsService.findActive();
  }
}
