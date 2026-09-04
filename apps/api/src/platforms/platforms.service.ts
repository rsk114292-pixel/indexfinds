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
import {
  DEFAULT_PLATFORM_COMPARISON_DATA,
  hasConfiguredComparisonData,
} from './constants/platform-comparison-defaults';

const DEFAULT_PLATFORM_LOGO_URLS: Record<string, string> = {
  loongbuy: 'https://www.loongbuy.com/favicon.ico',
  kakobuy: 'https://kakobuy.com/favicon.ico',
  lovegobuy: 'https://www.lovegobuy.com/favicon.ico',
  litbuy: 'https://litbuy.com/favicon-new.ico',
  // Use the platform's own published brand asset as the cache source.
  joyagoo:
    'https://mgt.joyagoo.com/wp-content/themes/joyabuy/assets/img/joyagoo-logo.png',
  sugargoo: 'https://www.sugargoo.com/favicon.ico',
  rizzitgo: 'https://rizzitgo.com/favicon.png',
  oopbuy: 'https://oopbuy.com/favicon.png',
  superbuy:
    'https://cdn.superbuy.com/starit-superbuy/dist/img/favicon/favicon-96x96.png',
  usfans: 'https://www.usfans.com/favicon.png',
  hipobuy: 'https://hipobuy.com/favicon.png',
  boonbuy: 'https://boonbuy.com/favicon.ico',
  cssbuy: 'https://www.cssbuy.com/favicon.ico',
  pikobuy: 'https://www.pikobuy.com/favicon.ico',
  // ESGOBuy publishes this wordmark from its own production bundle.
  esgobuy: 'https://www.esgobuy.com/img/es-logo-white.DWuBym1F.svg',
  hubbuycn: 'https://www.hubbuycn.com/favicon.ico',
  fishgoo: 'https://www.fishgoo.com/favicon.ico',
  mycnbox: 'https://mycnbox.com/logo.ico',
  ootdbuy: 'https://ootdbuy.com/favicon.ico',
  fansbuy: 'https://fansbuy.com/favicon2.ico',
  lolobuy:
    'https://www.lolobuy.com/loloBuyIcon.png?v=1.0.1%402026-08-03T06%3A13%3A41.845Z',
  acbuy: 'https://www.acbuy.com/favicon1.ico',
  allchinabuy: 'https://www.allchinabuy.com/favicon.ico',
  bbdbuy: 'https://www.bbdbuyeu.com/favicon.ico',
  cnshopper:
    'https://api.cnshopper.com/storage/admin/20260323-LXIFltkjsB35tcs5.png',
  eastmallbuy: 'https://eastmallbuy.com/web/favicon.jpg',
  goatedbuy: 'https://goatedbuy.com/static/logo_white.svg?v=2',
  gtbuy: 'https://gtbuy.com/static/favicon/64x64.png',
  hoobuy: 'https://cdn.static.hoobuy.com/favicon/favicon_64.ico',
  itaobuy: 'https://www.itaobuy.com/favicon.ico',
  kameymall: 'https://www.kameymall.com/favicon.ico',
  mulebuy: 'https://mulebuy.com/favicon.ico?v=20260114',
  orientdig: 'https://orientdig.com/site.ico',
  parcelup: 'https://parcelup.com/favicon.ico',
  yoybuy: 'https://img.yoybuy.com/v7/imgs/favicon.ico',
  pantherbuy: 'https://pantherbuy.com/favicon.ico',
  ponybuy: 'https://www.ponybuy.com/favicon.ico',
  ossbuy: 'https://www.ossbuy.com/favicon.ico',
  okeyhaul: 'https://www.okeyhaul.com/logo.png',
  dgobuy: 'https://dgobuy.com/images/jy.ico?id=bbd0d1dde6339378b921',
  hubbuy: 'https://cdn.hubbuy.app/favicon/favicon_64.ico',
  tigbuy: 'https://tigbuy.com/favicon.ico',
  spanbuy: 'https://spanbuy.com/favicon.ico',
  vigorbuy: 'https://cdn.static.vigorbuy.com/assets/favicon/favicon_64.ico',
};

function createDefaultPlatform(
  key: string,
  name: string,
  baseUrl: string,
  urlTemplate: string,
  sortOrder: number,
): Partial<Platform> {
  return {
    key,
    name,
    description: `${name} proxy purchase platform`,
    translations: {
      en: {
        name,
        description: `${name} proxy purchase platform`,
      },
      zh: {
        name,
        description: `${name} 代购平台`,
      },
    },
    baseUrl,
    logoUrl: DEFAULT_PLATFORM_LOGO_URLS[key],
    inviteCode: '',
    isActive: true,
    sortOrder,
    urlTemplate,
    comparisonData: DEFAULT_PLATFORM_COMPARISON_DATA[key],
  };
}

// 默认平台配置。邀请码留空，站点管理员可在后台填写自己的推广码。
export const DEFAULT_PLATFORMS: Partial<Platform>[] = [
  createDefaultPlatform(
    'loongbuy',
    'Loongbuy',
    'https://www.loongbuy.com/product-details',
    '{baseUrl}?url={encodedWeidianUrl}&invitecode={inviteCode}',
    0,
  ),
  createDefaultPlatform(
    'kakobuy',
    'Kakobuy',
    'https://kakobuy.com/item/details',
    '{baseUrl}?url={encodedWeidianUrl}&affcode={inviteCode}',
    1,
  ),
  createDefaultPlatform(
    'lovegobuy',
    'Lovegobuy',
    'https://www.lovegobuy.com/product',
    '{baseUrl}?id={weidianItemId}&shop_type=weidian&invite_code={inviteCode}',
    2,
  ),
  createDefaultPlatform(
    'litbuy',
    'Litbuy',
    'https://litbuy.com/product',
    '{baseUrl}/2/{weidianItemId}?inviteCode={inviteCode}',
    3,
  ),
  createDefaultPlatform(
    'joyagoo',
    'Joyagoo',
    'https://joyagoo.com/product',
    '{baseUrl}?id={weidianItemId}&platform=WEIDIAN&ref={inviteCode}',
    4,
  ),
  createDefaultPlatform(
    'sugargoo',
    'Sugargoo',
    'https://www.sugargoo.com/',
    '{baseUrl}#/home/productDetail?productLink={doubleEncodedWeidianUrl}&memberId={inviteCode}',
    5,
  ),
  createDefaultPlatform(
    'rizzitgo',
    'RizzitGo',
    'https://rizzitgo.com/detail-page/',
    '{baseUrl}?goodsId={weidianItemId}&source=3&rno={inviteCode}',
    6,
  ),
  createDefaultPlatform(
    'oopbuy',
    'Oopbuy',
    'https://www.oopbuy.com/product',
    '{baseUrl}/weidian/{weidianItemId}?inviteCode={inviteCode}',
    7,
  ),
  createDefaultPlatform(
    'superbuy',
    'Superbuy',
    'https://www.superbuy.com/en/page/buy/',
    '{baseUrl}?from=search-input&url={encodedWeidianUrl}&partnercode={inviteCode}',
    8,
  ),
  createDefaultPlatform(
    'usfans',
    'USFans',
    'https://www.usfans.com/product/3',
    '{baseUrl}/{weidianItemId}?ref={inviteCode}',
    9,
  ),
  createDefaultPlatform(
    'hipobuy',
    'Hipobuy',
    'https://hipobuy.com/product/weidian',
    '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
    10,
  ),
  createDefaultPlatform(
    'boonbuy',
    'Boonbuy',
    'https://boonbuy.com/product/2',
    '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
    11,
  ),
  createDefaultPlatform(
    'cssbuy',
    'CSSBuy',
    'https://www.cssbuy.com/shop/goodsDetail',
    '{baseUrl}?type=micro&id={weidianItemId}&promotionCode={inviteCode}',
    12,
  ),
  createDefaultPlatform(
    'pikobuy',
    'Pikobuy',
    'https://www.pikobuy.com/product/detail',
    '{baseUrl}?productUrl={encodedWeidianUrl}&invitedCode={inviteCode}',
    13,
  ),
  createDefaultPlatform(
    'esgobuy',
    'ESGOBuy',
    'https://www.esgobuy.com/productdetail',
    '{baseUrl}?url={encodedWeidianUrl}&affcode={inviteCode}',
    14,
  ),
  createDefaultPlatform(
    'hubbuycn',
    'HubbuyCN',
    'https://www.hubbuycn.com/product/item',
    '{baseUrl}?url={encodedWeidianUrl}&invitation_code={inviteCode}',
    15,
  ),
  createDefaultPlatform(
    'fishgoo',
    'Fishgoo',
    'https://www.fishgoo.com/',
    '{baseUrl}#/product?productLink={doubleEncodedWeidianUrl}&memberId={inviteCode}',
    16,
  ),
  createDefaultPlatform(
    'mycnbox',
    'MyCNBox',
    'https://mycnbox.com/goodsDetail',
    '{baseUrl}?mallType=weidian&itemId={weidianItemId}&inviteCode={inviteCode}',
    17,
  ),
  createDefaultPlatform(
    'ootdbuy',
    'OOTDBuy',
    'https://ootdbuy.com/goods/details',
    '{baseUrl}?id={weidianItemId}&channel=weidian&inviteCode={inviteCode}',
    18,
  ),
  createDefaultPlatform(
    'fansbuy',
    'Fansbuy',
    'https://fansbuy.com',
    '{baseUrl}/item-micro-{weidianItemId}.html?promotionCode={inviteCode}',
    19,
  ),
  createDefaultPlatform(
    'lolobuy',
    'Lolobuy',
    'https://www.lolobuy.com/productDetail/0',
    '{baseUrl}?url={encodedWeidianUrl}&inviteCode={inviteCode}',
    20,
  ),
  createDefaultPlatform(
    'acbuy',
    'ACBuy',
    'https://www.acbuy.com/product',
    '{baseUrl}?id={weidianItemId}&platform=WEIDIAN',
    21,
  ),
  createDefaultPlatform(
    'allchinabuy',
    'AllChinaBuy',
    'https://www.allchinabuy.com/en/page/buy/',
    '{baseUrl}?nTag=Home-search&from=search-input&_search=url&url={encodedWeidianUrl}&partnercode={inviteCode}',
    22,
  ),
  createDefaultPlatform(
    'bbdbuy',
    'BBDBuyEU',
    'https://bbdbuy.com/index/item/index.html',
    '{baseUrl}?tp=micro&tid={weidianItemId}',
    23,
  ),
  createDefaultPlatform(
    'cnshopper',
    'CNShopper',
    'https://cnshopper.com/goods/detail',
    '{baseUrl}?keyword={weidianItemId}&platform=weidian&invite_id={inviteCode}',
    24,
  ),
  createDefaultPlatform(
    'eastmallbuy',
    'EastMallBuy',
    'https://eastmallbuy.com/index/item/index.html',
    '{baseUrl}?searchlang=en&url={encodedWeidianUrl}',
    25,
  ),
  createDefaultPlatform(
    'goatedbuy',
    'GoatedBuy',
    'https://goatedbuy.com/pages/search/result',
    '{baseUrl}?keyword={encodedWeidianUrl}',
    26,
  ),
  createDefaultPlatform(
    'gtbuy',
    'GTBuy',
    'https://www.gtbuy.com/product/2',
    '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
    27,
  ),
  createDefaultPlatform(
    'hoobuy',
    'HooBuy',
    'https://www.hoobuy.com/product/2',
    '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
    28,
  ),
  createDefaultPlatform(
    'itaobuy',
    'iTaoBuy',
    'https://www.itaobuy.com/product-detail',
    '{baseUrl}?url={encodedWeidianUrl}&inviteCode={inviteCode}',
    29,
  ),
  createDefaultPlatform(
    'kameymall',
    'KameyMall',
    'https://www.kameymall.com/purchases',
    '{baseUrl}?url={encodedWeidianUrl}',
    30,
  ),
  createDefaultPlatform(
    'mulebuy',
    'MuleBuy',
    'https://mulebuy.com/product',
    '{baseUrl}?id={weidianItemId}&platform=WEIDIAN&ref={inviteCode}',
    31,
  ),
  createDefaultPlatform(
    'orientdig',
    'OrientDig',
    'https://orientdig.com/product',
    '{baseUrl}?id={weidianItemId}&platform=WEIDIAN&inviteCode={inviteCode}',
    32,
  ),
  createDefaultPlatform(
    'parcelup',
    'Parcel Up',
    'https://parcelup.com/order',
    '{baseUrl}?url={encodedWeidianUrl}',
    33,
  ),
  createDefaultPlatform(
    'yoybuy',
    'YoyBuy',
    'https://www.yoybuy.com/en/AddUrl.html',
    '{baseUrl}?url={encodedWeidianUrl}&remark={encodedWeidianUrl}',
    34,
  ),
  createDefaultPlatform(
    'pantherbuy',
    'PantherBuy',
    'https://pantherbuy.com/Shop/SearchproductDetails',
    '{baseUrl}?tp=weidian&url={encodedWeidianUrl}',
    35,
  ),
  createDefaultPlatform(
    'ponybuy',
    'PonyBuy',
    'https://www.ponybuy.com/products/weidian',
    '{baseUrl}/{weidianItemId}',
    36,
  ),
  createDefaultPlatform(
    'ossbuy',
    'OssBuy',
    'https://www.ossbuy.com/product-detail',
    '{baseUrl}?url={encodedWeidianUrl}',
    37,
  ),
  createDefaultPlatform(
    'okeyhaul',
    'OKEYHAUL',
    'https://www.okeyhaul.com/mall/detail',
    '{baseUrl}?spuid={weidianItemId}&shop_type=weidian&inviteCode={inviteCode}',
    38,
  ),
  createDefaultPlatform(
    'dgobuy',
    'DgoBuy',
    'https://dgobuy.com/en_US/goods/detail',
    '{baseUrl}?spuId={weidianItemId}',
    39,
  ),
  createDefaultPlatform(
    'hubbuy',
    'HubBuy',
    'https://hubbuy.com/product/weidian',
    '{baseUrl}/{weidianItemId}',
    40,
  ),
  createDefaultPlatform(
    'tigbuy',
    'TigBuy',
    'https://tigbuy.com/productlist',
    '{baseUrl}?keyWork={encodedWeidianUrl}',
    41,
  ),
  createDefaultPlatform(
    'spanbuy',
    'SpanBuy',
    'https://spanbuy.com/en/detail/micro',
    '{baseUrl}?url={encodedWeidianUrl}',
    42,
  ),
  createDefaultPlatform(
    'vigorbuy',
    'VigorBuy',
    'https://vigorbuy.com/product/weidian',
    '{baseUrl}/{weidianItemId}',
    43,
  ),
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
    const batchSize = 4;
    for (let index = 0; index < DEFAULT_PLATFORMS.length; index += batchSize) {
      const batch = DEFAULT_PLATFORMS.slice(index, index + batchSize);
      await Promise.all(batch.map((config) => this.ensureDefault(config)));
    }
  }

  private async ensureDefault(config: Partial<Platform>) {
    const exists = await this.platformRepo.findOne({
      where: { key: config.key },
    });

    if (exists) {
      let shouldSave = false;

      if (
        !hasConfiguredComparisonData(exists.comparisonData) &&
        config.comparisonData
      ) {
        exists.comparisonData = config.comparisonData;
        shouldSave = true;
      }

      // Built-in platforms use application-managed product routes. Keep the
      // administrator-owned invite code and presentation fields, but upgrade
      // stale homepage/legacy routes whenever the API is restarted.
      if (config.baseUrl && exists.baseUrl !== config.baseUrl) {
        exists.baseUrl = config.baseUrl;
        shouldSave = true;
      }
      if (config.urlTemplate && exists.urlTemplate !== config.urlTemplate) {
        exists.urlTemplate = config.urlTemplate;
        shouldSave = true;
      }

      if (shouldSave) {
        await this.platformRepo.save(exists);
      }
    }

    if (exists?.logoUrl || !config.logoUrl || !config.key) {
      if (!exists) {
        await this.platformRepo.save(this.platformRepo.create(config));
      }
      return;
    }

    let logoUrl: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        logoUrl = await this.normalizeLogoUrl(config.logoUrl, config.key);
        break;
      } catch (error) {
        if (attempt === 3) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to cache default logo for ${config.key}: ${message}`,
          );
        }
      }
    }

    if (exists) {
      if (logoUrl) {
        exists.logoUrl = logoUrl;
        await this.platformRepo.save(exists);
      }
      return;
    }

    await this.platformRepo.save(
      this.platformRepo.create({ ...config, logoUrl }),
    );
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
    const doubleEncodedWeidianUrl = encodeURIComponent(encodedWeidianUrl);

    // 替换所有支持的变量
    url = url
      .replace(/\{baseUrl\}/g, platform.baseUrl || '')
      .replace(/\{inviteCode\}/g, platform.inviteCode || '')
      .replace(/\{weidianItemId\}/g, params.weidianItemId || '')
      .replace(/\{productId\}/g, params.productId || '')
      .replace(/\{weidianUrl\}/g, weidianUrl)
      .replace(/\{encodedWeidianUrl\}/g, encodedWeidianUrl)
      .replace(/\{doubleEncodedWeidianUrl\}/g, doubleEncodedWeidianUrl);

    return url;
  }
}
