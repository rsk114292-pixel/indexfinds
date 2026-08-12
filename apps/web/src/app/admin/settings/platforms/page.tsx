'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Switch,
  App,
  Space,
  Form,
  Popconfirm,
  Tag,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAdminAuthReady } from '@/app/admin/useAdminAuthReady';
import { get, post, patch, del, request } from '@/lib/api';
import { TableSkeleton } from '../../components/PageSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import PlatformLogoBadge from '@/components/platforms/PlatformLogoBadge';

interface PlatformComparisonData {
  serviceFee?: string;
  shippingCoverage?: string;
  freeStorageDays?: number;
  qcService?: string;
  paymentMethods?: string;
  returnPolicy?: string;
  shippingBaseFeeUsd?: number;
  shippingRatePerKgUsd?: number;
  dataUpdatedAt?: string;
}

interface Platform {
  id: string;
  key: string;
  name: string;
  baseUrl: string;
  inviteCode: string | null;
  isActive: boolean;
  description: string | null;
  translations: Record<string, { name?: string; description?: string }> | null;
  logoUrl: string | null;
  sortOrder: number;
  urlTemplate: string | null;
  createdAt: string;
  updatedAt: string;
  comparisonData: PlatformComparisonData | null;
}

interface PlatformFormValues {
  key: string;
  name: string;
  baseUrl: string;
  inviteCode?: string;
  description?: string;
  translations?: Record<string, { name?: string; description?: string }>;
  logoUrl?: string;
  sortOrder?: number;
  urlTemplate?: string;
  isActive: boolean;
  comparisonData?: PlatformComparisonData;
}

const TRANSLATION_LOCALES = [
  {
    code: 'en',
    tabLabel: 'English',
    nameLabel: 'English Name',
    descriptionLabel: 'English Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Loongbuy proxy purchase platform',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Required when platform is active. Non-Chinese locales prefer this.',
  },
  {
    code: 'zh',
    tabLabel: '中文',
    nameLabel: '中文名称',
    descriptionLabel: '中文描述',
    namePlaceholder: '龙购',
    descriptionPlaceholder: 'Loongbuy 代购平台',
    nameTooltip: '可选。为空时回退到平台名称字段。',
    descriptionTooltip: '中文站点会优先使用这里。',
  },
  {
    code: 'fr',
    tabLabel: 'French',
    nameLabel: 'French Name',
    descriptionLabel: 'French Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Plateforme d’achat assisté Loongbuy',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. French users will use this when available.',
  },
  {
    code: 'de',
    tabLabel: 'German',
    nameLabel: 'German Name',
    descriptionLabel: 'German Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Loongbuy Einkaufsplattform',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. German users will use this when available.',
  },
  {
    code: 'es',
    tabLabel: 'Spanish',
    nameLabel: 'Spanish Name',
    descriptionLabel: 'Spanish Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Plataforma de compra asistida Loongbuy',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. Spanish users will use this when available.',
  },
  {
    code: 'it',
    tabLabel: 'Italian',
    nameLabel: 'Italian Name',
    descriptionLabel: 'Italian Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Piattaforma di acquisto assistito Loongbuy',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. Italian users will use this when available.',
  },
  {
    code: 'pt',
    tabLabel: 'Portuguese',
    nameLabel: 'Portuguese Name',
    descriptionLabel: 'Portuguese Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'Plataforma de compra assistida Loongbuy',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. Portuguese users will use this when available.',
  },
  {
    code: 'ar',
    tabLabel: 'Arabic',
    nameLabel: 'Arabic Name',
    descriptionLabel: 'Arabic Description',
    namePlaceholder: 'Loongbuy',
    descriptionPlaceholder: 'منصة Loongbuy للشراء بالوكالة',
    nameTooltip: 'Optional. Falls back to platform name when empty.',
    descriptionTooltip: 'Optional. Arabic users will use this when available.',
  },
] as const;

type TranslationLocaleCode = (typeof TRANSLATION_LOCALES)[number]['code'];

const PLATFORMS_CACHE_KEY = 'admin:settings:platforms';
const PLATFORMS_CACHE_TTL_MS = 10 * 60 * 1000;
const LazyPlatformConfigModal = dynamic(
  () => import('./components/PlatformConfigModal').then((mod) => mod.PlatformConfigModal),
  { loading: () => null },
);

function isManagedLogoUrl(value?: string | null): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.startsWith('/')) return true;
  if (normalized.startsWith('data:')) return true;
  return /\/uploads\/[^/]+$/i.test(normalized);
}

function isRemoteLogoUrl(value?: string | null): boolean {
  return typeof value === 'string' &&
    /^https?:\/\//i.test(value.trim()) &&
    !isManagedLogoUrl(value);
}

function buildLogoPrefix(platformKey?: string): string {
  const normalizedKey =
    platformKey?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'platform';
  return `platform-${normalizedKey}`;
}

function createPresetTranslations(
  name: string,
  zhDescription: string,
  enDescription?: string,
): Record<string, { name?: string; description?: string }> {
  return {
    en: {
      name,
      description: enDescription || `${name} proxy purchase platform`,
    },
    zh: {
      name,
      description: zhDescription,
    },
  };
}

// 预设的代购平台配置（包含官方图标）
// 支持的变量: {baseUrl}, {inviteCode}, {weidianItemId}, {weidianUrl}, {encodedWeidianUrl}, {productId}
const PRESET_PLATFORMS: Record<string, Omit<PlatformFormValues, 'key' | 'isActive'>> = {
  loongbuy: {
    name: 'Loongbuy',
    baseUrl: 'https://www.loongbuy.com/product-details',
    description: 'Loongbuy 代购平台',
    translations: createPresetTranslations('Loongbuy', 'Loongbuy 代购平台'),
    logoUrl: 'https://www.loongbuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?invitecode={inviteCode}&weidian={weidianItemId}',
  },
  lolobuy: {
    name: 'Lolobuy',
    baseUrl: 'https://www.lolobuy.com/productDetail/0',
    description: 'Lolobuy 代购平台',
    translations: createPresetTranslations('Lolobuy', 'Lolobuy 代购平台'),
    logoUrl: 'https://www.lolobuy.com/loloBuyIcon.png',
    urlTemplate: '{baseUrl}?url={weidianUrl}&inviteCode={inviteCode}',
  },
  lovegobuy: {
    name: 'Lovegobuy',
    baseUrl: 'https://www.lovegobuy.com/product',
    description: 'Lovegobuy 代购平台',
    translations: createPresetTranslations('Lovegobuy', 'Lovegobuy 代购平台'),
    logoUrl: 'https://www.lovegobuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?id={weidianItemId}&shop_type=weidian&invite_code={inviteCode}',
  },
  kakobuy: {
    name: 'Kakobuy',
    baseUrl: 'https://kakobuy.com/item/details',
    description: 'Kakobuy 代购平台',
    translations: createPresetTranslations('Kakobuy', 'Kakobuy 代购平台'),
    logoUrl: 'https://kakobuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?url={encodedWeidianUrl}&affcode={inviteCode}',
  },
  usfans: {
    name: 'USFans',
    baseUrl: 'https://www.usfans.com/product/3',
    description: 'USFans 代购平台',
    translations: createPresetTranslations('USFans', 'USFans 代购平台'),
    logoUrl: 'https://www.usfans.com/favicon.png',
    urlTemplate: '{baseUrl}/{weidianItemId}?ref={inviteCode}',
  },
  oopbuy: {
    name: 'Oopbuy',
    baseUrl: 'https://oopbuy.com/product',
    description: 'Oopbuy 代购平台',
    translations: createPresetTranslations('Oopbuy', 'Oopbuy 代购平台'),
    logoUrl: 'https://oopbuy.com/favicon.png',
    urlTemplate: '{baseUrl}/weidian/{weidianItemId}?inviteCode={inviteCode}',
  },
  allchinabuy: {
    name: 'AllChinaBuy',
    baseUrl: 'https://www.allchinabuy.com/cn/page/buy/',
    description: 'AllChinaBuy 代购平台',
    translations: createPresetTranslations('AllChinaBuy', 'AllChinaBuy 代购平台'),
    logoUrl: 'https://www.allchinabuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?nTag=Home-search&from=search-input&_search=url&url={weidianUrl}&partnercode={inviteCode}',
  },
  joyagoo: {
    name: 'Joyagoo',
    baseUrl: 'https://joyagoo.com/product',
    description: 'Joyagoo 代购平台',
    translations: createPresetTranslations('Joyagoo', 'Joyagoo 代购平台'),
    logoUrl: 'https://mgt.joyagoo.com/wp-content/themes/joyabuy/assets/img/joyagoo-logo.png',
    urlTemplate: '{baseUrl}?id={weidianItemId}&platform=WEIDIAN&ref={inviteCode}',
  },
  orientdig: {
    name: 'Orientdig',
    baseUrl: 'https://orientdig.com/product/',
    description: 'Orientdig 代购平台',
    translations: createPresetTranslations('Orientdig', 'Orientdig 代购平台'),
    logoUrl: 'https://orientdig.com/favicon.ico',
    urlTemplate: '{baseUrl}?shop_type=weidian&id={weidianItemId}&ref={inviteCode}',
  },
  superbuy: {
    name: 'Superbuy',
    baseUrl: 'https://www.superbuy.com/en/page/buy/',
    description: 'Superbuy 代购平台 - 老牌代购服务商',
    translations: createPresetTranslations(
      'Superbuy',
      'Superbuy 代购平台 - 老牌代购服务商',
      'Superbuy proxy purchase platform - established service provider',
    ),
    logoUrl: 'https://cdn.superbuy.com/starit-superbuy/dist/img/favicon/favicon-96x96.png',
    urlTemplate: '{baseUrl}?nTag=Home-search&from=search-input&url={encodedWeidianUrl}&partnercode={inviteCode}',
  },
  sugargoo: {
    name: 'Sugargoo',
    baseUrl: 'https://www.sugargoo.com/register',
    description: 'Sugargoo 代购平台',
    translations: createPresetTranslations('Sugargoo', 'Sugargoo 代购平台'),
    logoUrl: 'https://www.sugargoo.com/favicon.ico',
    urlTemplate: 'https://www.sugargoo.com/products?productLink={weidianUrl}&memberId={inviteCode}',
  },
  acbuy: {
    name: 'ACBuy',
    baseUrl: 'https://www.acbuy.com/product',
    description: 'ACBuy 代购平台',
    translations: createPresetTranslations('ACBuy', 'ACBuy 代购平台'),
    logoUrl: 'https://www.acbuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?id={weidianItemId}&source=WD&share_id={inviteCode}',
  },
  litbuy: {
    name: 'Litbuy',
    baseUrl: 'https://litbuy.com/product',
    description: 'Litbuy 代购平台',
    translations: createPresetTranslations('Litbuy', 'Litbuy 代购平台'),
    logoUrl: 'https://litbuy.com/favicon-new.ico',
    urlTemplate: '{baseUrl}/2/{weidianItemId}?inviteCode={inviteCode}',
  },
  rizzitgo: {
    name: 'RizzitGo',
    baseUrl: 'https://rizzitgo.com/detail-page/',
    description: 'RizzitGo 代购平台',
    translations: createPresetTranslations('RizzitGo', 'RizzitGo 代购平台'),
    logoUrl: 'https://rizzitgo.com/favicon.png',
    urlTemplate: '{baseUrl}?goodsId={weidianItemId}&source=3&rno={inviteCode}',
  },
  hipobuy: {
    name: 'Hipobuy',
    baseUrl: 'https://hipobuy.com/product/weidian',
    description: 'Hipobuy 代购平台',
    translations: createPresetTranslations('Hipobuy', 'Hipobuy 代购平台'),
    logoUrl: 'https://hipobuy.com/favicon.png',
    urlTemplate: '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
  },
  boonbuy: {
    name: 'Boonbuy',
    baseUrl: 'https://boonbuy.com/product/2',
    description: 'Boonbuy 代购平台',
    translations: createPresetTranslations('Boonbuy', 'Boonbuy 代购平台'),
    logoUrl: 'https://boonbuy.com/favicon.ico',
    urlTemplate: '{baseUrl}/{weidianItemId}?inviteCode={inviteCode}',
  },
  cssbuy: {
    name: 'CSSBuy',
    baseUrl: 'https://www.cssbuy.com',
    description: 'CSSBuy 代购平台',
    translations: createPresetTranslations('CSSBuy', 'CSSBuy 代购平台'),
    logoUrl: 'https://www.cssbuy.com/favicon.ico',
    urlTemplate: '{baseUrl}/item-micro-{weidianItemId}.html?promotionCode={inviteCode}',
  },
  pikobuy: {
    name: 'Pikobuy',
    baseUrl: 'https://www.pikobuy.com/product/detail',
    description: 'Pikobuy 代购平台',
    translations: createPresetTranslations('Pikobuy', 'Pikobuy 代购平台'),
    logoUrl: 'https://www.pikobuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?productUrl={weidianUrl}&invitedCode={inviteCode}',
  },
  esgobuy: {
    name: 'ESGOBuy',
    baseUrl: 'https://www.esgobuy.com/productdetail',
    description: 'ESGOBuy 代购平台',
    translations: createPresetTranslations('ESGOBuy', 'ESGOBuy 代购平台'),
    logoUrl: 'https://www.esgobuy.com/img/es-logo-white.DWuBym1F.svg',
    urlTemplate: '{baseUrl}?url={weidianUrl}&affcode={inviteCode}',
  },
  hubbuycn: {
    name: 'HubbuyCN',
    baseUrl: 'https://www.hubbuycn.com/product/item',
    description: 'HubbuyCN 代购平台',
    translations: createPresetTranslations('HubbuyCN', 'HubbuyCN 代购平台'),
    logoUrl: 'https://www.hubbuycn.com/favicon.ico',
    urlTemplate: '{baseUrl}?url={weidianUrl}&inviteCode={inviteCode}',
  },
  fishgoo: {
    name: 'Fishgoo',
    baseUrl: 'https://www.fishgoo.com/',
    description: 'Fishgoo 代购平台',
    translations: createPresetTranslations('Fishgoo', 'Fishgoo 代购平台'),
    logoUrl: 'https://www.fishgoo.com/favicon.ico',
    urlTemplate: '{baseUrl}#/product?productLink={encodedWeidianUrl}&memberId={inviteCode}',
  },
  mycnbox: {
    name: 'MyCNBox',
    baseUrl: 'https://mycnbox.com/goodsDetail',
    description: 'MyCNBox 代购平台',
    translations: createPresetTranslations('MyCNBox', 'MyCNBox 代购平台'),
    logoUrl: 'https://mycnbox.com/logo.ico',
    urlTemplate: '{baseUrl}?mallType=weidian&itemId={weidianItemId}&inviteCode={inviteCode}',
  },
  ootdbuy: {
    name: 'OOTDBuy',
    baseUrl: 'https://ootdbuy.com/goods/details',
    description: 'OOTDBuy 代购平台',
    translations: createPresetTranslations('OOTDBuy', 'OOTDBuy 代购平台'),
    logoUrl: 'https://ootdbuy.com/favicon.ico',
    urlTemplate: '{baseUrl}?id={weidianItemId}&channel=weidian&inviteCode={inviteCode}',
  },
  fansbuy: {
    name: 'Fansbuy',
    baseUrl: 'https://fansbuy.com',
    description: 'Fansbuy 代购平台',
    translations: createPresetTranslations('Fansbuy', 'Fansbuy 代购平台'),
    logoUrl: 'https://fansbuy.com/favicon2.ico',
    urlTemplate: '{baseUrl}/item-micro-{weidianItemId}.html?promotionCode={inviteCode}',
  },
};

export default function PlatformConfigPage() {
  const { message } = App.useApp();
  const { isReady } = useAdminAuthReady();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [form] = Form.useForm<PlatformFormValues>();
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [activeTranslationLocale, setActiveTranslationLocale] =
    useState<TranslationLocaleCode>('en');
  const watchedTranslations = Form.useWatch('translations', form);

  useEffect(() => {
    const cached = readSessionCache<Platform[]>(
      PLATFORMS_CACHE_KEY,
      PLATFORMS_CACHE_TTL_MS,
    );
    if (!cached) return;

    setPlatforms(cached);
    setLoading(false);
  }, []);

  const sanitizeTranslations = (
    translations?: Record<string, { name?: string; description?: string }>,
  ) => {
    if (!translations) return undefined;

    const cleaned = Object.entries(translations).reduce(
      (acc, [locale, fields]) => {
        const name = fields?.name?.trim();
        const description = fields?.description?.trim();
        if (name || description) {
          acc[locale] = { ...(name ? { name } : {}), ...(description ? { description } : {}) };
        }
        return acc;
      },
      {} as Record<string, { name?: string; description?: string }>,
    );

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };

  const sanitizeComparisonData = (
    comparisonData?: PlatformComparisonData,
  ): PlatformComparisonData | undefined => {
    if (!comparisonData) return undefined;
    const cleaned = Object.entries(comparisonData).reduce(
      (acc, [key, value]) => {
        if (typeof value === 'string') {
          const normalized = value.trim();
          if (normalized) acc[key as keyof PlatformComparisonData] = normalized as never;
          return acc;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
          acc[key as keyof PlatformComparisonData] = value as never;
        }
        return acc;
      },
      {} as PlatformComparisonData,
    );
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };

  const hasEnglishDescription = (
    translations?: Record<string, { name?: string; description?: string }> | null,
  ) => {
    const description = translations?.en?.description;
    return typeof description === 'string' && description.trim().length > 0;
  };

  const getMissingDescriptionLocales = (
    translations?: Record<string, { name?: string; description?: string }> | null,
  ) => {
    return TRANSLATION_LOCALES.filter(({ code }) => {
      const description = translations?.[code]?.description;
      return !(typeof description === 'string' && description.trim().length > 0);
    }).map(({ code }) => code);
  };

  const fetchPlatforms = useCallback(async () => {
    try {
      const data = await get<Platform[]>('/admin/platforms');
      setPlatforms(data);
      writeSessionCache(PLATFORMS_CACHE_KEY, data);
    } catch {
      message.error('加载平台配置失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    if (!isReady) return;
    fetchPlatforms();
  }, [fetchPlatforms, isReady]);

  const handleCreate = () => {
    setEditingPlatform(null);
    form.resetFields();
    setActiveTranslationLocale('en');
    const emptyTranslations = TRANSLATION_LOCALES.reduce(
      (acc, locale) => {
        acc[locale.code] = {};
        return acc;
      },
      {} as Record<TranslationLocaleCode, { name?: string; description?: string }>,
    );
    form.setFieldsValue({
      isActive: true,
      sortOrder: 0,
      urlTemplate: '{baseUrl}?invitecode={inviteCode}&weidian={weidianItemId}',
      translations: emptyTranslations,
    });
    setLogoPreview('');
    setModalOpen(true);
  };

  const handleEdit = (platform: Platform) => {
    const mappedTranslations = TRANSLATION_LOCALES.reduce(
      (acc, locale) => {
        acc[locale.code] = {
          name: platform.translations?.[locale.code]?.name || '',
          description: platform.translations?.[locale.code]?.description || '',
        };
        return acc;
      },
      {} as Record<TranslationLocaleCode, { name?: string; description?: string }>,
    );

    setEditingPlatform(platform);
    setActiveTranslationLocale('en');
    form.setFieldsValue({
      key: platform.key,
      name: platform.name,
      baseUrl: platform.baseUrl,
      inviteCode: platform.inviteCode || '',
      description: platform.description || '',
      translations: mappedTranslations,
      logoUrl: platform.logoUrl || '',
      sortOrder: platform.sortOrder,
      urlTemplate: platform.urlTemplate || '',
      isActive: platform.isActive,
      comparisonData: platform.comparisonData || undefined,
    });
    setLogoPreview(platform.logoUrl || '');
    setModalOpen(true);
    if (isRemoteLogoUrl(platform.logoUrl)) {
      void syncLogoToManagedUrl(platform.logoUrl, platform.key).catch((error) => {
        message.warning(
          error instanceof Error
            ? `平台图标暂未转存：${error.message}`
            : '平台图标暂未转存',
        );
      });
    }
  };

  const handleLogoUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file as Blob);

    try {
      const data = await request<{ url: string }>('/upload/image', {
        method: 'POST',
        body: formData,
      });
      form.setFieldsValue({ logoUrl: data.url });
      setLogoPreview(data.url);
      message.success('图标上传成功');
      onSuccess?.(data);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '上传失败';
      message.error(errMsg);
      onError?.(new Error(errMsg));
    } finally {
      setUploading(false);
    }
  };

  const importRemoteLogo = useCallback(
    async (logoUrl: string, platformKey?: string) => {
      const data = await post<{ url: string }>('/upload/image-from-url', {
        url: logoUrl,
        prefix: buildLogoPrefix(platformKey),
      });
      return data.url;
    },
    [],
  );

  const syncLogoToManagedUrl = useCallback(
    async (logoUrl?: string | null, platformKey?: string) => {
      const normalizedLogoUrl = logoUrl?.trim() || '';
      if (!normalizedLogoUrl) {
        form.setFieldsValue({ logoUrl: '' });
        setLogoPreview('');
        return '';
      }

      if (!isRemoteLogoUrl(normalizedLogoUrl)) {
        form.setFieldsValue({ logoUrl: normalizedLogoUrl });
        setLogoPreview(normalizedLogoUrl);
        return normalizedLogoUrl;
      }

      const managedUrl = await importRemoteLogo(
        normalizedLogoUrl,
        platformKey || form.getFieldValue('key'),
      );
      form.setFieldsValue({ logoUrl: managedUrl });
      setLogoPreview(managedUrl);
      return managedUrl;
    },
    [form, importRemoteLogo],
  );

  // 当输入平台标识时，自动填充预设信息
  const handleKeyChange = async (key: string) => {
    const lowerKey = key.toLowerCase();
    const preset = PRESET_PLATFORMS[lowerKey];

    if (preset && !editingPlatform) {
      // 只在创建新平台时自动填充
      form.setFieldsValue({
        key: lowerKey,
        name: preset.name,
        baseUrl: preset.baseUrl,
        description: preset.description,
        translations: preset.translations
          ? JSON.parse(JSON.stringify(preset.translations))
          : undefined,
        logoUrl: '',
        urlTemplate: preset.urlTemplate,
      });
      setLogoPreview('');
      if (preset.logoUrl) {
        try {
          await syncLogoToManagedUrl(preset.logoUrl, lowerKey);
        } catch (error) {
          message.warning(
            error instanceof Error
              ? `平台图标暂未转存：${error.message}`
              : '平台图标暂未转存',
          );
          form.setFieldsValue({ logoUrl: preset.logoUrl });
          setLogoPreview(preset.logoUrl);
        }
      }
      message.success(`已自动填充 ${preset.name} 的预设信息`);
    }
  };

  // 一键填充预设平台
  const handleQuickFill = async (key: string) => {
    const preset = PRESET_PLATFORMS[key];
    if (preset) {
      form.setFieldsValue({
        key,
        name: preset.name,
        baseUrl: preset.baseUrl,
        description: preset.description,
        translations: preset.translations
          ? JSON.parse(JSON.stringify(preset.translations))
          : undefined,
        logoUrl: '',
        urlTemplate: preset.urlTemplate,
        isActive: true,
        sortOrder: 0,
      });
      setLogoPreview('');
      if (preset.logoUrl) {
        try {
          await syncLogoToManagedUrl(preset.logoUrl, key);
        } catch (error) {
          message.warning(
            error instanceof Error
              ? `平台图标暂未转存：${error.message}`
              : '平台图标暂未转存',
          );
          form.setFieldsValue({ logoUrl: preset.logoUrl });
          setLogoPreview(preset.logoUrl);
        }
      }
    }
  };

  // 自动解析完整链接为模板
  // 例如: https://www.lovegobuy.com/product?id=7286451013&shop_type=weidian&invite_code=YOUR_CODE
  // 转换为: {baseUrl}?id={weidianItemId}&shop_type=weidian&invite_code={inviteCode}
  const parseUrlToTemplate = (url: string): string | null => {
    // 如果已经包含占位符，不处理
    if (url.includes('{')) return null;

    // 如果不是完整 URL，不处理
    if (!url.startsWith('http')) return null;

    const baseUrl = form.getFieldValue('baseUrl') || '';
    const inviteCode = form.getFieldValue('inviteCode') || '';

    let template = url;

    // 替换基础 URL
    if (baseUrl && template.includes(baseUrl)) {
      template = template.replace(baseUrl, '{baseUrl}');
    }

    // 替换邀请码
    if (inviteCode && template.includes(inviteCode)) {
      template = template.replace(new RegExp(inviteCode, 'g'), '{inviteCode}');
    }

    // 检测微店商品 ID（10位数字）
    const weidianIdMatch = template.match(/[?&=\/](\d{10,13})(?=[?&]|$)/);
    if (weidianIdMatch) {
      template = template.replace(weidianIdMatch[1], '{weidianItemId}');
    }

    // 检测完整微店 URL (URL 编码或未编码)
    const weidianUrlPatterns = [
      /https?%3A%2F%2Fweidian\.com%2Fitem\.html%3FitemID%3D\d+/gi,
      /https?:\/\/weidian\.com\/item\.html\?itemID=\d+/gi,
    ];
    for (const pattern of weidianUrlPatterns) {
      if (pattern.test(template)) {
        template = template.replace(pattern, (match) => {
          return match.includes('%3A') ? '{encodedWeidianUrl}' : '{weidianUrl}';
        });
      }
    }

    // 如果有变化，返回模板
    return template !== url ? template : null;
  };

  const handleUrlTemplateBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const parsed = parseUrlToTemplate(value);
    if (parsed) {
      form.setFieldsValue({ urlTemplate: parsed });
      message.success('已自动转换为模板格式');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/admin/platforms/${id}`);
      message.success('平台已删除');
      fetchPlatforms();
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleActive = async (platform: Platform) => {
    try {
      const nextIsActive = !platform.isActive;
      if (nextIsActive && !hasEnglishDescription(platform.translations)) {
        message.error('启用失败：请先填写 English Description');
        return;
      }
      await patch(`/admin/platforms/${platform.id}`, { isActive: nextIsActive });
      message.success(`平台已${!platform.isActive ? '启用' : '禁用'}`);
      fetchPlatforms();
    } catch {
      message.error('更新失败');
    }
  };

  const handleSubmit = async (values: PlatformFormValues) => {
    setSaving(true);
    try {
      const translations = sanitizeTranslations(values.translations);
      if (values.isActive && !hasEnglishDescription(translations)) {
        form.setFields([
          {
            name: ['translations', 'en', 'description'],
            errors: ['启用状态下必须填写 English Description'],
          },
        ]);
        throw new Error('启用状态下必须填写 English Description');
      }
      const fallbackDescription =
        values.description?.trim() ||
        translations?.en?.description ||
        translations?.zh?.description;
      const payload: PlatformFormValues = {
        ...values,
        description: fallbackDescription,
        translations,
        comparisonData: sanitizeComparisonData(values.comparisonData),
      };

      if (payload.logoUrl && isRemoteLogoUrl(payload.logoUrl)) {
        const remoteLogoUrl = payload.logoUrl;
        payload.logoUrl = await importRemoteLogo(
          remoteLogoUrl,
          payload.key || editingPlatform?.key,
        );
        form.setFieldsValue({ logoUrl: payload.logoUrl });
        setLogoPreview(payload.logoUrl);
      }

      if (editingPlatform) {
        await patch(`/admin/platforms/${editingPlatform.id}`, payload);
      } else {
        await post('/admin/platforms', payload);
      }
      message.success(editingPlatform ? '平台已更新' : '平台已创建');
      setModalOpen(false);
      fetchPlatforms();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 60,
      render: (order: number) => (
        <span className="text-gray-500">{order}</span>
      ),
    },
    {
      title: '平台',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: Platform) => (
        <div className="flex items-center gap-2">
          <PlatformLogoBadge
            platformKey={record.key}
            name={name}
            logoUrl={record.logoUrl || undefined}
            className="flex h-8 w-8 items-center justify-center rounded bg-gray-100"
            imageClassName="h-8 w-8 rounded object-contain bg-gray-100"
            labelClassName="text-[11px] font-semibold tracking-[0.04em]"
          />
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-xs text-gray-500 font-mono">{record.key}</div>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: Platform) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '基础 URL',
      dataIndex: 'baseUrl',
      key: 'baseUrl',
      ellipsis: true,
      render: (url: string) => (
        <span className="text-xs text-gray-600 font-mono">{url}</span>
      ),
    },
    {
      title: '邀请码',
      dataIndex: 'inviteCode',
      key: 'inviteCode',
      width: 120,
      render: (code: string | null) =>
        code ? (
          <Tag color="blue" className="font-mono">
            {code}
          </Tag>
        ) : (
          <span className="text-gray-400">未设置</span>
        ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (_desc: string | null, record: Platform) => (
        <span className="text-gray-500">
          {record.translations?.en?.description ||
            record.translations?.zh?.description ||
            record.description ||
            '-'}
        </span>
      ),
    },
    {
      title: '翻译状态',
      key: 'translationStatus',
      width: 140,
      render: (_: unknown, record: Platform) => {
        if (hasEnglishDescription(record.translations)) {
          return <Tag color="success">英文描述已配置</Tag>;
        }
        if (record.isActive) {
          return <Tag color="error">缺少英文描述</Tag>;
        }
        return <Tag color="warning">待补英文描述</Tag>;
      },
    },
    {
      title: '对比资料',
      key: 'comparisonStatus',
      width: 120,
      render: (_: unknown, record: Platform) => {
        const count = Object.values(record.comparisonData || {}).filter(
          (value) => value !== undefined && value !== null && value !== '',
        ).length;
        return count > 0 ? <Tag color="processing">已配置 {count} 项</Tag> : <Tag>未配置</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Platform) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">代购平台配置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          添加平台
        </Button>
      </div>

      <Card>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            配置代购平台信息。用户在商品页面点击&ldquo;购买&rdquo;按钮时，会使用这里配置的平台和邀请码生成外跳链接。
          </p>
        </div>
        <Table
          dataSource={platforms}
          columns={columns}
          rowKey="id"
          locale={{
            emptyText: (
              <EmptyState
                icon={<ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                title="暂无平台配置"
                description="点击「添加平台」或使用预设快速添加"
              />
            ),
          }}
          pagination={false}
        />
      </Card>

      {modalOpen && (
        <LazyPlatformConfigModal
          open={modalOpen}
          editingPlatform={editingPlatform ? { id: editingPlatform.id } : null}
          saving={saving}
          uploading={uploading}
          logoPreview={logoPreview}
          setLogoPreview={setLogoPreview}
          form={form}
          activeTranslationLocale={activeTranslationLocale}
          setActiveTranslationLocale={setActiveTranslationLocale}
          watchedTranslations={watchedTranslations}
          translationLocales={TRANSLATION_LOCALES}
          presetPlatforms={PRESET_PLATFORMS}
          getMissingDescriptionLocales={getMissingDescriptionLocales}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onKeyBlur={handleKeyChange}
          onQuickFill={handleQuickFill}
          onUrlTemplateBlur={handleUrlTemplateBlur}
          onLogoUrlBlur={(logoUrl) => {
            if (!isRemoteLogoUrl(logoUrl)) return;
            void syncLogoToManagedUrl(logoUrl).catch((error) => {
              message.warning(
                error instanceof Error
                  ? `平台图标暂未转存：${error.message}`
                  : '平台图标暂未转存',
              );
            });
          }}
          onLogoUpload={handleLogoUpload}
        />
      )}
    </div>
  );
}
