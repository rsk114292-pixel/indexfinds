import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

@Injectable()
export class ProductSkuService {
  private readonly logger = new Logger(ProductSkuService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
  ) {}

  /**
   * 创建 SKU
   */
  async createSku(createSkuDto: CreateSkuDto): Promise<Sku> {
    // 验证 product 是否存在
    const product = await this.productRepository.findOne({
      where: { id: createSkuDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`商品 ID ${createSkuDto.productId} 不存在`);
    }

    // 检查 SKU code 是否重复（如果提供）
    if (createSkuDto.skuCode) {
      const existingSku = await this.skuRepository.findOne({
        where: { skuCode: createSkuDto.skuCode },
      });

      if (existingSku) {
        throw new ConflictException('SKU Code 已存在');
      }
    }

    // 自动生成 skuKey（如果未提供）
    if (!createSkuDto.skuKey && createSkuDto.attributes) {
      createSkuDto.skuKey = Object.entries(createSkuDto.attributes)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
    }

    const sku = this.skuRepository.create(createSkuDto);
    const savedSku = await this.skuRepository.save(sku);

    // 更新商品的价格范围
    await this.updateProductPriceRange(createSkuDto.productId);

    return savedSku;
  }

  /**
   * 获取商品的所有 SKU
   */
  async findSkusByProduct(productId: string): Promise<Sku[]> {
    return this.skuRepository.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取单个 SKU
   */
  async findOneSku(id: string): Promise<Sku> {
    const sku = await this.skuRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!sku) {
      throw new NotFoundException(`SKU ID ${id} 不存在`);
    }

    return sku;
  }

  /**
   * 更新 SKU
   */
  async updateSku(id: string, updateSkuDto: UpdateSkuDto): Promise<Sku> {
    const sku = await this.findOneSku(id);

    // 如果更新 SKU code，检查是否重复
    if (updateSkuDto.skuCode && updateSkuDto.skuCode !== sku.skuCode) {
      const existingSku = await this.skuRepository.findOne({
        where: { skuCode: updateSkuDto.skuCode },
      });

      if (existingSku) {
        throw new ConflictException('SKU Code 已存在');
      }
    }

    // 更新 skuKey（如果更新了 attributes）
    if (updateSkuDto.attributes) {
      updateSkuDto.skuKey = Object.entries({
        ...sku.attributes,
        ...updateSkuDto.attributes,
      })
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
    }

    Object.assign(sku, updateSkuDto);
    const savedSku = await this.skuRepository.save(sku);

    // 更新商品的价格范围
    await this.updateProductPriceRange(sku.productId);

    return savedSku;
  }

  /**
   * 删除 SKU
   */
  async removeSku(id: string): Promise<void> {
    const sku = await this.findOneSku(id);
    const productId = sku.productId;
    await this.skuRepository.remove(sku);

    // 更新商品的价格范围
    await this.updateProductPriceRange(productId);
  }

  /**
   * 批量创建 SKU（用于导入场景）
   */
  async batchCreateSkus(
    productId: string,
    skuDataList: Partial<CreateSkuDto>[],
  ): Promise<Sku[]> {
    const skus: Sku[] = [];

    for (const skuData of skuDataList) {
      const sku = this.skuRepository.create({
        ...skuData,
        productId,
      });
      skus.push(sku);
    }

    const savedSkus = await this.skuRepository.save(skus);

    // 更新商品的价格范围
    await this.updateProductPriceRange(productId);

    return savedSkus;
  }

  /**
   * 清除引用已删除图片的 SKU image 字段
   * 当从 product.images 中删除图片时，同步清除所有引用这些图片的 SKU
   */
  async clearSkuImagesForRemovedUrls(
    productId: string,
    removedImageUrls: string[],
  ): Promise<number> {
    if (!removedImageUrls || removedImageUrls.length === 0) {
      return 0;
    }

    // 找到所有引用这些图片的 SKU
    const skusToUpdate = await this.skuRepository
      .createQueryBuilder('sku')
      .where('sku.productId = :productId', { productId })
      .andWhere('sku.image IN (:...urls)', { urls: removedImageUrls })
      .getMany();

    if (skusToUpdate.length === 0) {
      return 0;
    }

    // 批量清除 image 字段
    const skuIds = skusToUpdate.map((sku) => sku.id);
    await this.skuRepository
      .createQueryBuilder()
      .update(Sku)
      .set({ image: null })
      .whereInIds(skuIds)
      .execute();

    this.logger.log(
      `已清除 ${skusToUpdate.length} 个 SKU 的图片引用 (产品: ${productId})`,
    );

    return skusToUpdate.length;
  }

  /**
   * 更新商品的价格范围（从 SKU 计算）
   */
  async updateProductPriceRange(productId: string): Promise<void> {
    const skus = await this.skuRepository.find({
      where: { productId },
    });

    if (skus.length === 0) {
      // 如果没有 SKU，清空价格
      await this.productRepository.update(productId, {
        priceMin: undefined,
        priceMax: undefined,
      });
      return;
    }

    const prices = skus
      .map((sku) => sku.price)
      .filter((price) => price !== null && price !== undefined);

    if (prices.length > 0) {
      const priceMin = Math.min(...prices);
      const priceMax = Math.max(...prices);

      await this.productRepository.update(productId, {
        priceMin,
        priceMax,
      });
    }
  }
}
