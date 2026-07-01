import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSearchHistory } from './entities/user-search-history.entity';

const MAX_SEARCH_HISTORY = 50;

@Injectable()
export class SearchHistoryService {
  constructor(
    @InjectRepository(UserSearchHistory)
    private readonly repo: Repository<UserSearchHistory>,
  ) {}

  /**
   * 记录搜索（upsert：存在则更新 searchedAt）
   */
  async recordSearch(userId: string, query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > 200) return;

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(UserSearchHistory)
      .values({
        user: { id: userId },
        query: trimmed,
      })
      .orUpdate(['searched_at'], ['user_id', 'query'])
      .execute();

    // 清理超出上限的旧记录
    await this.pruneOldRecords(userId);
  }

  /**
   * 批量同步（登录时上传本地搜索历史）
   */
  async bulkSync(userId: string, items: string[]): Promise<{ synced: number }> {
    if (!items || items.length === 0) return { synced: 0 };

    let synced = 0;
    for (const query of items.slice(0, MAX_SEARCH_HISTORY)) {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length > 200) continue;

      try {
        await this.repo
          .createQueryBuilder()
          .insert()
          .into(UserSearchHistory)
          .values({
            user: { id: userId },
            query: trimmed,
          })
          .orIgnore()
          .execute();
        synced++;
      } catch {
        // 跳过无效记录
      }
    }

    await this.pruneOldRecords(userId);
    return { synced };
  }

  /**
   * 获取搜索历史
   */
  async getHistory(userId: string, limit = 10): Promise<{ data: string[] }> {
    const records = await this.repo.find({
      where: { user: { id: userId } },
      order: { searchedAt: 'DESC' },
      take: Math.min(limit, MAX_SEARCH_HISTORY),
    });

    return { data: records.map((r) => r.query) };
  }

  /**
   * 删除单条搜索历史
   */
  async removeItem(userId: string, query: string): Promise<void> {
    await this.repo.delete({
      user: { id: userId },
      query: query.trim(),
    });
  }

  /**
   * 清空搜索历史
   */
  async clearHistory(userId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId } });
  }

  private async pruneOldRecords(userId: string): Promise<void> {
    const count = await this.repo.count({
      where: { user: { id: userId } },
    });

    if (count <= MAX_SEARCH_HISTORY) return;

    const cutoff = await this.repo.find({
      where: { user: { id: userId } },
      order: { searchedAt: 'DESC' },
      skip: MAX_SEARCH_HISTORY,
      take: 1,
    });

    if (cutoff.length > 0) {
      await this.repo
        .createQueryBuilder()
        .delete()
        .from(UserSearchHistory)
        .where('user_id = :userId', { userId })
        .andWhere('searched_at <= :cutoffDate', {
          cutoffDate: cutoff[0].searchedAt,
        })
        .execute();
    }
  }
}
