import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { UserFavorite } from './user-favorite.entity';

@Entity('user_collections')
@Unique(['user', 'name'])
export class UserCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => CollectionItem, (item) => item.collection)
  items: CollectionItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('collection_items')
@Unique(['collection', 'favorite'])
export class CollectionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserCollection, (col) => col.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collection_id' })
  collection: UserCollection;

  @ManyToOne(() => UserFavorite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'favorite_id' })
  favorite: UserFavorite;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
