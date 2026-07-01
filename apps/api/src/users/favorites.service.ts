import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserFavorite } from './entities/user-favorite.entity';
import { Product } from '../products/entities/product.entity';
import { QueryFavoritesDto } from './dto/collection.dto';
import { ReferralService } from '../referral/referral.service';
import { AttributionEventType } from '../referral/entities/referral-attribution.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PointsEvents } from '../points/points.events';
import type { EarnPointsRequestEvent } from '../points/points.events';

const MAX_FAVORITES = 500;

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(UserFavorite)
    private favoritesRepository: Repository<UserFavorite>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private referralService: ReferralService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 添加收藏
   */
  async addFavorite(
    userId: string,
    productId: string,
    referralCookie?: string,
  ): Promise<UserFavorite> {
    // 检查收藏上限
    const totalCount = await this.favoritesRepository.count({
      where: { user: { id: userId } },
    });
    if (totalCount >= MAX_FAVORITES) {
      throw new BadRequestException(
        `Maximum ${MAX_FAVORITES} favorites allowed`,
      );
    }

    // 检查商品是否存在
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 检查是否已收藏
    const existing = await this.favoritesRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (existing) {
      throw new ConflictException('Product already favorited');
    }

    // 创建收藏
    const favorite = this.favoritesRepository.create({
      user: { id: userId },
      product: { id: productId },
    });

    const saved = await this.favoritesRepository.save(favorite);

    // 递增产品收藏计数（冗余字段）
    await this.productsRepository.increment(
      { id: productId },
      'favoriteCount',
      1,
    );

    // 首次高意图动作积分：沿用 legacy action=first_favorite，避免历史数据重复发放
    if (totalCount === 0) {
      this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
        userId,
        action: 'first_favorite',
        referenceType: 'user',
        referenceId: userId,
        metadata: {
          source: 'favorite',
          productId,
        },
      } as EarnPointsRequestEvent);
    }

    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId,
      action: 'daily_favorite_product',
      referenceType: 'daily_task',
      referenceId: new Date().toISOString().split('T')[0],
      metadata: {
        productId,
      },
    } as EarnPointsRequestEvent);

    // 推荐归因：记录收藏事件 + 检查转化条件
    if (referralCookie) {
      await this.referralService.triggerAttributionFromCookie(
        referralCookie,
        AttributionEventType.FAVORITE,
        userId,
        { productId },
      );
      await this.referralService.checkAndFinalizeConversion(userId);
    }

    return saved;
  }

  /**
   * 取消收藏
   */
  async removeFavorite(userId: string, productId: string): Promise<void> {
    const favorite = await this.favoritesRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoritesRepository.remove(favorite);

    // 递减产品收藏计数（冗余字段），确保不低于 0
    await this.productsRepository.decrement(
      { id: productId },
      'favoriteCount',
      1,
    );
    await this.productsRepository
      .createQueryBuilder()
      .update()
      .set({ favoriteCount: 0 })
      .where('id = :id AND "favoriteCount" < 0', { id: productId })
      .execute();
  }

  /**
   * 获取用户的收藏列表（分页 + Collection 筛选 + 排序）
   */
  async getUserFavorites(userId: string, query: QueryFavoritesDto) {
    const {
      page = 1,
      limit = 20,
      collectionId,
      sort = 'createdAt',
      order = 'DESC',
    } = query;

    const qb = this.favoritesRepository
      .createQueryBuilder('fav')
      .leftJoinAndSelect('fav.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'category')
      .where('fav.user_id = :userId', { userId });

    if (collectionId) {
      qb.innerJoin(
        'collection_items',
        'ci',
        'ci.favorite_id = fav.id AND ci.collection_id = :collectionId',
        { collectionId },
      );
    }

    if (sort === 'priceMin') {
      qb.orderBy('product.priceMin', order);
    } else {
      qb.orderBy('fav.createdAt', order);
    }

    qb.skip((page - 1) * limit).take(limit);

    const [favorites, total] = await qb.getManyAndCount();

    return {
      data: favorites.map((fav) => ({
        ...fav.product,
        favoriteId: fav.id,
        favoritedAt: fav.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 检查用户是否收藏了某商品
   */
  async isFavorited(userId: string, productId: string): Promise<boolean> {
    const count = await this.favoritesRepository.count({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    return count > 0;
  }

  /**
   * 批量检查收藏状态
   */
  async checkMultipleFavorites(
    userId: string,
    productIds: string[],
  ): Promise<Record<string, boolean>> {
    const favorites = await this.favoritesRepository.find({
      where: {
        user: { id: userId },
        product: { id: In(productIds) },
      },
      relations: ['product'],
    });

    const result: Record<string, boolean> = {};
    productIds.forEach((id) => {
      result[id] = favorites.some((fav) => fav.product.id === id);
    });

    return result;
  }

  /**
   * 获取收藏记录 ID（前端操作 Collection 时需要）
   */
  async getFavoriteId(
    userId: string,
    productId: string,
  ): Promise<string | null> {
    const fav = await this.favoritesRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
      select: ['id'],
    });
    return fav?.id ?? null;
  }
}
