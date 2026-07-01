import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  UserCollection,
  CollectionItem,
} from './entities/user-collection.entity';
import { UserFavorite } from './entities/user-favorite.entity';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

const MAX_COLLECTIONS = 20;

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(UserCollection)
    private collectionsRepo: Repository<UserCollection>,
    @InjectRepository(CollectionItem)
    private itemsRepo: Repository<CollectionItem>,
    @InjectRepository(UserFavorite)
    private favoritesRepo: Repository<UserFavorite>,
  ) {}

  async getCollections(userId: string) {
    const collections = await this.collectionsRepo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .loadRelationCountAndMap('c.itemCount', 'c.items')
      .orderBy('c.sort_order', 'ASC')
      .addOrderBy('c.created_at', 'ASC')
      .getMany();

    return collections;
  }

  async createCollection(userId: string, dto: CreateCollectionDto) {
    const count = await this.collectionsRepo.count({
      where: { user: { id: userId } },
    });

    if (count >= MAX_COLLECTIONS) {
      throw new BadRequestException(
        `Maximum ${MAX_COLLECTIONS} collections allowed`,
      );
    }

    const existing = await this.collectionsRepo.findOne({
      where: { user: { id: userId }, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Collection name already exists');
    }

    const collection = this.collectionsRepo.create({
      user: { id: userId },
      name: dto.name,
      sortOrder: count,
    });

    return this.collectionsRepo.save(collection);
  }

  async updateCollection(
    userId: string,
    collectionId: string,
    dto: UpdateCollectionDto,
  ) {
    const collection = await this.findUserCollection(userId, collectionId);

    const duplicate = await this.collectionsRepo.findOne({
      where: { user: { id: userId }, name: dto.name },
    });

    if (duplicate && duplicate.id !== collectionId) {
      throw new ConflictException('Collection name already exists');
    }

    collection.name = dto.name;
    return this.collectionsRepo.save(collection);
  }

  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.findUserCollection(userId, collectionId);
    await this.collectionsRepo.remove(collection);
  }

  async addItems(userId: string, collectionId: string, favoriteIds: string[]) {
    await this.findUserCollection(userId, collectionId);

    const favorites = await this.favoritesRepo.find({
      where: { id: In(favoriteIds), user: { id: userId } },
    });

    if (favorites.length === 0) {
      throw new NotFoundException('No valid favorites found');
    }

    const existing = await this.itemsRepo.find({
      where: {
        collection: { id: collectionId },
        favorite: { id: In(favorites.map((f) => f.id)) },
      },
      relations: ['favorite'],
    });

    const existingFavIds = new Set(existing.map((e) => e.favorite.id));
    const newItems = favorites
      .filter((f) => !existingFavIds.has(f.id))
      .map((f) =>
        this.itemsRepo.create({
          collection: { id: collectionId },
          favorite: { id: f.id },
        }),
      );

    if (newItems.length > 0) {
      await this.itemsRepo.save(newItems);
    }

    return { added: newItems.length };
  }

  async removeItem(userId: string, collectionId: string, favoriteId: string) {
    await this.findUserCollection(userId, collectionId);

    const item = await this.itemsRepo.findOne({
      where: {
        collection: { id: collectionId },
        favorite: { id: favoriteId },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found in collection');
    }

    await this.itemsRepo.remove(item);
  }

  async getMembership(userId: string, favoriteId: string): Promise<string[]> {
    const items = await this.itemsRepo.find({
      where: {
        favorite: { id: favoriteId },
        collection: { user: { id: userId } },
      },
      relations: ['collection'],
    });
    return items.map((item) => item.collection.id);
  }

  private async findUserCollection(
    userId: string,
    collectionId: string,
  ): Promise<UserCollection> {
    const collection = await this.collectionsRepo.findOne({
      where: { id: collectionId, user: { id: userId } },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }
}
