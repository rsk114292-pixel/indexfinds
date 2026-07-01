import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FavoritesService } from './favorites.service';
import { QueryFavoritesDto } from './dto/collection.dto';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard) // 所有端点都需要登录
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * 获取当前用户的收藏列表
   * GET /favorites
   */
  @Get()
  async getMyFavorites(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryFavoritesDto,
  ) {
    return this.favoritesService.getUserFavorites(req.user.id, query);
  }

  /**
   * 批量检查收藏状态
   * POST /favorites/check-batch
   * Body: { productIds: string[] }
   *
   * 必须在 POST :productId 之前声明，否则 "check-batch" 会被当作 productId 参数
   */
  @Post('check-batch')
  async checkFavoriteBatch(
    @Request() req: AuthenticatedRequest,
    @Body('productIds') productIds: string[],
  ) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { favorites: {} };
    }
    // 限制单次最多 50 个
    const ids = productIds.slice(0, 50);
    const favorites = await this.favoritesService.checkMultipleFavorites(
      req.user.id,
      ids,
    );
    return { favorites };
  }

  /**
   * 添加收藏
   * POST /favorites/:productId
   */
  @Post(':productId')
  async addFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const referralCookie = req.cookies?.['mf_ref_attrib'];
    await this.favoritesService.addFavorite(
      req.user.id,
      productId,
      referralCookie,
    );
    return { message: 'Product added to favorites' };
  }

  /**
   * 取消收藏
   * DELETE /favorites/:productId
   */
  @Delete(':productId')
  async removeFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.favoritesService.removeFavorite(req.user.id, productId);
    return { message: 'Product removed from favorites' };
  }

  /**
   * 检查是否已收藏
   * GET /favorites/check/:productId
   */
  @Get('check/:productId')
  async checkFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const isFavorited = await this.favoritesService.isFavorited(
      req.user.id,
      productId,
    );
    return { isFavorited };
  }
}
