import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { RecommendationService } from './recommendation.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@ApiTags('Recommendations')
@Controller('products/:productId/recommendations')
@Public()
@Throttle({ long: { limit: 120, ttl: 60000 } })
export class RecommendationsController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * 猜你喜欢 — 同品类相似商品
   *
   * GET /products/:productId/recommendations/similar?limit=12
   */
  @Get('similar')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000) // 1 小时
  async getSimilar(
    @Param('productId') productId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getSimilarProducts(
      productId,
      query.limit ?? 12,
    );
  }

  /**
   * 搭配推荐 — 跨品类互补商品
   *
   * GET /products/:productId/recommendations/complete-the-look?limit=12
   */
  @Get('complete-the-look')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600000) // 1 小时
  async getCompleteTheLook(
    @Param('productId') productId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getCompleteTheLook(
      productId,
      query.limit ?? 12,
    );
  }
}
