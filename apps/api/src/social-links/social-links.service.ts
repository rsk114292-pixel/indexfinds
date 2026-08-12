import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialLink } from './entities/social-link.entity';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

const TELEGRAM_LINK = {
  platform: 'telegram',
  label: 'Telegram',
  url: 'https://t.me/repindexfinds',
  icon: 'telegram',
  sortOrder: 0,
  isActive: true,
};

@Injectable()
export class SocialLinksService implements OnModuleInit {
  constructor(
    @InjectRepository(SocialLink)
    private repo: Repository<SocialLink>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  /** 公开接口：只返回激活的链接 */
  async findAllActive(): Promise<SocialLink[]> {
    return this.repo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /** 管理员：返回全部 */
  async findAll(): Promise<SocialLink[]> {
    return this.repo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SocialLink> {
    const link = await this.repo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Social link not found');
    return link;
  }

  async create(dto: CreateSocialLinkDto): Promise<SocialLink> {
    const link = this.repo.create(dto);
    return this.repo.save(link);
  }

  async update(id: string, dto: UpdateSocialLinkDto): Promise<SocialLink> {
    const link = await this.findOne(id);
    Object.assign(link, dto);
    return this.repo.save(link);
  }

  async remove(id: string): Promise<void> {
    const link = await this.findOne(id);
    await this.repo.remove(link);
  }

  private async ensureDefaults() {
    const links = await this.repo.find();
    const discordLinks = links.filter(
      (link) => link.platform.toLowerCase() === 'discord',
    );
    if (discordLinks.length > 0) {
      await this.repo.remove(discordLinks);
    }

    const telegramLinks = links.filter(
      (link) => link.platform.toLowerCase() === 'telegram',
    );
    const [telegram, ...duplicates] = telegramLinks;

    if (duplicates.length > 0) {
      await this.repo.remove(duplicates);
    }

    if (telegram) {
      Object.assign(telegram, TELEGRAM_LINK);
      await this.repo.save(telegram);
    } else {
      await this.repo.save(this.repo.create(TELEGRAM_LINK));
    }
  }
}
