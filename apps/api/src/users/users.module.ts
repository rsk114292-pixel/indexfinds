import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserFavorite } from './entities/user-favorite.entity';
import { UserBrowsingHistory } from './entities/user-browsing-history.entity';
import { UserSearchHistory } from './entities/user-search-history.entity';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { BrowsingHistoryService } from './browsing-history.service';
import { BrowsingHistoryController } from './browsing-history.controller';
import { SearchHistoryService } from './search-history.service';
import { SearchHistoryController } from './search-history.controller';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Product } from '../products/entities/product.entity';
import {
  UserCollection,
  CollectionItem,
} from './entities/user-collection.entity';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserFavorite,
      UserBrowsingHistory,
      UserSearchHistory,
      Product,
      UserCollection,
      CollectionItem,
    ]),
    ReferralModule,
  ],
  controllers: [
    FavoritesController,
    CollectionsController,
    UsersController,
    BrowsingHistoryController,
    SearchHistoryController,
  ],
  providers: [
    FavoritesService,
    CollectionsService,
    UsersService,
    BrowsingHistoryService,
    SearchHistoryService,
  ],
  exports: [
    FavoritesService,
    CollectionsService,
    UsersService,
    BrowsingHistoryService,
    SearchHistoryService,
  ],
})
export class UsersModule {}
