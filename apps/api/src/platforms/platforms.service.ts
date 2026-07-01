import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from './entities/platform.entity';
import { CreatePlatformDto, UpdatePlatformDto } from './dto';
import { UploadService } from '../upload/upload.service';
import {
  PLATFORM_TRANSLATION_LOCALES,
  PLATFORM_TRANSLATION_LOCALE_SET,
} from './constants/platform-translation-locales';

// 默认平台配置
const DEFAULT_PLATFORMS: Partial<Platform>[] = [
  {
    key: 'loongbuy',
    name: 'Loongbuy',
    description: 'Loongbuy proxy purchase platform',
    translations: {
      en: { description: 'Loongbuy proxy purchase platform' },
      zh: { description: 'Loongbuy 代购平台' },
    },
    baseUrl: 'https://www.loongbuy.com/product-details',
    inviteCode: '',
    isActive: true,
    sortOrder: 0,
    urlTemplate: '{baseUrl}?invitecode={inviteCode}&weidian={weidianItemId}',
  },
];

@Injectable()
export class PlatformsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformsService.name);

  constructor(
    @InjectRepository(Platform)
    private platformRepo: Repository<Platform>,
    private readonly uploadService: UploadService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  private async ensureDefaults() {
    for (const config of DEFAULT_PLATFORMS) {
      const exists = await this.platformRepo.findOne({
        where: { key: config.key },
      });
      if (!exists) {
        await this.platformRepo.save(this.platformRepo.create(config));
      }
    }
  }

  async findAll(): Promise<Platform[]> {
    const platforms = await this.platformRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return this.normalizeStoredLogos(platforms);
  }

  async findActive(): Promise<Platform[]> {
    const platforms = await this.platformRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return this.normalizeStoredLogos(platforms);
  }

  async findOne(id: string): Promise<Platform> {
    const platform = await this.platformRepo.findOne({ where: { id } });
    if (!platform) {
      throw new NotFoundException('Platform not found');
    }
    return platform;
  }

  async findByKey(key: string): Promise<Platform | null> {
    return this.platformRepo.findOne({ where: { key } });
  }

  async getDefaultPlatform(): Promise<Platform | null> {
    return this.platformRepo.findOne({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  private hasEnglishDescription(
    translations:
      | Record<string, { name?: string; description?: string }>
      | null
      | undefined,
  ): boolean {
    const description = translations?.en?.description;
    return typeof description === 'string' && description.trim().length > 0;
  }

  private validateActivePlatformTranslations(
    isActive: boolean,
    translations:
      | Record<string, { name?: string; description?: string }>
      | null
      | undefined,
  ) {
    if (!isActive) return;
    if (!this.hasEnglishDescription(translations)) {
      throw new BadRequestException(
        'Active platform requires translations.en.description',
      );
    }
  }

  private validateTranslationContract(
    translations:
      | Record<string, { name?: string; description?: string }>
      | null
      | undefined,
  ) {
    if (!translations) return;

    const invalidLocales = Object.keys(translations).filter(
      (locale) => !PLATFORM_TRANSLATION_LOCALE_SET.has(locale),
    );
    if (invalidLocales.length > 0) {
      throw new BadRequestException(
        `Unsupported translation locales: ${invalidLocales.join(', ')}. Allowed locales: ${PLATFORM_TRANSLATION_LOCALES.join(', ')}`,
      );
    }

    for (const [locale, fields] of Object.entries(translations)) {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw new BadRequestException(
          `Invalid translation payload for locale "${locale}"`,
        );
      }
      for (const [fieldKey, fieldValue] of Object.entries(fields)) {
        if (fieldKey !== 'name' && fieldKey !== 'description') {
          throw new BadRequestException(
            `Unsupported translation field "${fieldKey}" for locale "${locale}"`,
          );
        }
        if (
          fieldValue !== undefined &&
          fieldValue !== null &&
          typeof fieldValue !== 'string'
        ) {
          throw new BadRequestException(
            `Translation field "${fieldKey}" for locale "${locale}" must be a string`,
          );
        }
      }
    }
  }

  async create(dto: CreatePlatformDto): Promise<Platform> {
    // 检查 key 是否已存在
    const existing = await this.findByKey(dto.key);
    if (existing) {
      throw new ConflictException(
        `Platform with key "${dto.key}" already exists`,
      );
    }

    this.validateTranslationContract(dto.translations);
    this.validateActivePlatformTranslations(
      dto.isActive ?? true,
      dto.translations,
    );

    const platform = this.platformRepo.create({
      ...dto,
      logoUrl: await this.normalizeLogoUrl(dto.logoUrl, dto.key),
    });
    return this.platformRepo.save(platform);
  }

  async update(id: string, dto: UpdatePlatformDto): Promise<Platform> {
    const platform = await this.findOne(id);

    // 如果更新 key，检查是否重复
    if (dto.key && dto.key !== platform.key) {
      const existing = await this.findByKey(dto.key);
      if (existing) {
        throw new ConflictException(
          `Platform with key "${dto.key}" already exists`,
        );
      }
    }

    this.validateTranslationContract(dto.translations);

    const mergedTranslations = {
      ...(platform.translations || {}),
    };
    if (dto.translations) {
      for (const [locale, value] of Object.entries(dto.translations)) {
        mergedTranslations[locale] = {
          ...(mergedTranslations[locale] || {}),
          ...(value || {}),
        };
      }
    }
    const nextIsActive = dto.isActive ?? platform.isActive;
    this.validateActivePlatformTranslations(nextIsActive, mergedTranslations);

    Object.assign(platform, {
      ...dto,
      logoUrl: await this.normalizeLogoUrl(
        dto.logoUrl,
        dto.key || platform.key,
      ),
    });
    if (dto.translations) {
      platform.translations = mergedTranslations;
    }
    return this.platformRepo.save(platform);
  }

  async remove(id: string): Promise<void> {
    const platform = await this.findOne(id);
    await this.platformRepo.remove(platform);
  }

  private isManagedLogoUrl(logoUrl: string): boolean {
    if (!logoUrl) return false;
    if (logoUrl.startsWith('/uploads/')) return true;
    return /\/uploads\/[^/]+$/i.test(logoUrl);
  }

  private async normalizeLogoUrl(
    logoUrl: string | null | undefined,
    platformKey: string,
  ): Promise<string | undefined> {
    const normalized = logoUrl?.trim();
    if (!normalized) return undefined;
    if (this.isManagedLogoUrl(normalized)) return normalized;

    try {
      return await this.uploadService.downloadRemoteImage(normalized, {
        prefix: `platform-${platformKey}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to cache platform logo: ${message}`,
      );
    }
  }

  private async normalizeStoredLogos(
    platforms: Platform[],
  ): Promise<Platform[]> {
    const normalizedPlatforms: Platform[] = [];

    for (const platform of platforms) {
      if (!platform.logoUrl || this.isManagedLogoUrl(platform.logoUrl)) {
        normalizedPlatforms.push(platform);
        continue;
      }

      try {
        const normalizedLogoUrl = await this.uploadService.downloadRemoteImage(
          platform.logoUrl,
          {
            prefix: `platform-${platform.key}`,
          },
        );
        platform.logoUrl = normalizedLogoUrl;
        await this.platformRepo.save(platform);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to normalize logo for platform ${platform.key}: ${message}`,
        );
      }

      normalizedPlatforms.push(platform);
    }

    return normalizedPlatforms;
  }

  // 生成外跳链接
  generateBuyLink(
    platform: Platform,
    params: { weidianItemId?: string; productId?: string },
  ): string {
    let url =
      platform.urlTemplate ||
      '{baseUrl}?invitecode={inviteCode}&weidian={weidianItemId}';

    // 构建完整的微店链接
    const weidianUrl = params.weidianItemId
      ? `https://weidian.com/item.html?itemID=${params.weidianItemId}`
      : '';
    const encodedWeidianUrl = encodeURIComponent(weidianUrl);

    // 替换所有支持的变量
    url = url
      .replace(/\{baseUrl\}/g, platform.baseUrl || '')
      .replace(/\{inviteCode\}/g, platform.inviteCode || '')
      .replace(/\{weidianItemId\}/g, params.weidianItemId || '')
      .replace(/\{productId\}/g, params.productId || '')
      .replace(/\{weidianUrl\}/g, weidianUrl)
      .replace(/\{encodedWeidianUrl\}/g, encodedWeidianUrl);

    return url;
  }
}
