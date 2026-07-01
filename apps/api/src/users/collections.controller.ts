import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  AddCollectionItemsDto,
} from './dto/collection.dto';

@ApiTags('Collections')
@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  async getCollections(@Request() req: AuthenticatedRequest) {
    return this.collectionsService.getCollections(req.user.id);
  }

  @Post()
  async createCollection(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.createCollection(req.user.id, dto);
  }

  @Patch(':id')
  async updateCollection(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.updateCollection(req.user.id, id, dto);
  }

  @Delete(':id')
  async deleteCollection(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.collectionsService.deleteCollection(req.user.id, id);
    return { message: 'Collection deleted' };
  }

  @Get('membership/:favoriteId')
  async getMembership(
    @Request() req: AuthenticatedRequest,
    @Param('favoriteId') favoriteId: string,
  ) {
    const collectionIds = await this.collectionsService.getMembership(
      req.user.id,
      favoriteId,
    );
    return { collectionIds };
  }

  @Post(':id/items')
  async addItems(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddCollectionItemsDto,
  ) {
    const result = await this.collectionsService.addItems(
      req.user.id,
      id,
      dto.favoriteIds,
    );
    return { message: 'Items added to collection', added: result.added };
  }

  @Delete(':id/items/:favoriteId')
  async removeItem(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('favoriteId') favoriteId: string,
  ) {
    await this.collectionsService.removeItem(req.user.id, id, favoriteId);
    return { message: 'Item removed from collection' };
  }
}
