import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import {
  ProductStatusAction,
  ProductStatus,
  getNextStatus,
  getAvailableActions,
  STATUS_DISPLAY_NAMES,
  ACTION_DISPLAY_NAMES,
} from './product-status';

@Injectable()
export class ProductStatusService {
  private readonly logger = new Logger(ProductStatusService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * 获取商品（内部使用）
   */
  private async getProduct(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`商品 ${id} 不存在`);
    }
    return product;
  }

  /**
   * 执行状态流转动作
   * @param id 商品 ID
   * @param action 动作
   * @returns 更新后的商品
   * @throws BadRequestException 如果状态流转不合法
   */
  async performStatusAction(
    id: string,
    action: ProductStatusAction,
    options?: {
      allowParentCategory?: boolean;
    },
  ): Promise<Product> {
    const product = await this.getProduct(id);
    const currentStatus = product.status;

    // 检查是否可以执行该动作
    const nextStatus = getNextStatus(currentStatus, action);
    if (!nextStatus) {
      const currentStatusName =
        STATUS_DISPLAY_NAMES[currentStatus] || currentStatus;
      const actionName = ACTION_DISPLAY_NAMES[action] || action;
      throw new BadRequestException(
        `无法执行操作 "${actionName}"：商品当前状态为 "${currentStatusName}"`,
      );
    }

    if (nextStatus === ProductStatus.ACTIVE && !options?.allowParentCategory) {
      await this.categoriesService.ensureCanonicalLeafCategory(
        product.primaryCategoryId,
      );
    }

    // 更新状态
    product.status = nextStatus;
    const savedProduct = await this.productRepository.save(product);

    this.logger.log(
      `商品 ${id} 状态流转: ${currentStatus} -> ${nextStatus} (动作: ${action})`,
    );

    return savedProduct;
  }

  /**
   * 提交商品审核
   */
  async submitForReview(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.SUBMIT_FOR_REVIEW);
  }

  /**
   * 审核通过
   */
  async approveProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.APPROVE);
  }

  /**
   * 审核拒绝（退回草稿）
   */
  async rejectProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.REJECT);
  }

  /**
   * 直接发布（跳过审核，管理员权限）
   */
  async publishProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.PUBLISH);
  }

  /**
   * 下架商品
   */
  async unpublishProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.UNPUBLISH);
  }

  /**
   * 标记缺货
   */
  async markOutOfStock(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.MARK_OUT_OF_STOCK);
  }

  /**
   * 补货上架
   */
  async restockProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.RESTOCK);
  }

  /**
   * 获取商品可执行的动作列表
   */
  getAvailableStatusActions(
    status: string,
  ): Array<{ action: ProductStatusAction; label: string }> {
    const actions = getAvailableActions(status);
    return actions.map((action) => ({
      action,
      label: ACTION_DISPLAY_NAMES[action],
    }));
  }

  /**
   * 批量更新商品状态（用于批量审核等场景）
   */
  async batchUpdateStatus(
    ids: string[],
    action: ProductStatusAction,
    options?: {
      allowParentCategory?: boolean;
    },
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        await this.performStatusAction(id, action, options);
        success.push(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ id, reason: message });
      }
    }

    return { success, failed };
  }
}
