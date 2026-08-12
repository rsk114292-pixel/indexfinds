'use client';

import '@ant-design/v5-patch-for-react-19';

/**
 * Ant Design ConfigProvider 包装组件
 * 使用 @ant-design/nextjs-registry 解决 SSR hydration 不匹配问题
 */
import { ConfigProvider, App } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { getAntdTheme } from '@/lib/antd-theme';
import { usePathname } from 'next/navigation';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import deDE from 'antd/locale/de_DE';
import esES from 'antd/locale/es_ES';
import itIT from 'antd/locale/it_IT';
import ptBR from 'antd/locale/pt_BR';
import arEG from 'antd/locale/ar_EG';
import { isRTL } from '@/i18n/config';

const ANTD_LOCALE_MAP: Record<string, typeof enUS> = {
  en: enUS,
  zh: zhCN,
  fr: frFR,
  de: deDE,
  es: esES,
  it: itIT,
  pt: ptBR,
  ar: arEG,
};

// 抑制 Ant Design CSS-in-JS 在 React 19 严格模式下的警告
// 这是已知的兼容性问题，不影响功能
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const fullMessage = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    // 抑制 React 19 cleanup 警告
    if (fullMessage.includes('You are registering a cleanup function after unmount')) {
      return;
    }
    // 抑制 Ant Design CSS hydration mismatch 警告（开发环境）
    // css-dev-only-do-not-override hash 在 SSR/CSR 间不一致是已知问题
    if (
      fullMessage.includes('A tree hydrated but some attributes') &&
      fullMessage.includes('css-dev-only-do-not-override')
    ) {
      return;
    }
    // 抑制 antd v5 + React 19 兼容性警告（已安装 @ant-design/v5-patch-for-react-19）
    if (fullMessage.includes('antd v5 support React is 16 ~ 18')) {
      return;
    }
    // 抑制 rc-util isEqual 的循环引用警告（form.setFieldValue 触发的深比较，不影响功能）
    if (fullMessage.includes('There may be circular references')) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Derive locale from URL path instead of useLocale() to avoid requiring NextIntlClientProvider
  // This works for all routes: /en/..., /zh/..., /admin/..., /auth/...
  const pathname = usePathname();
  const localeMatch = pathname?.match(/^\/(en|zh|fr|de|es|it|pt|ar)/);
  const locale = localeMatch ? localeMatch[1] : 'en';
  const antdLocale = ANTD_LOCALE_MAP[locale] || enUS;

  return (
    <AntdRegistry>
      <StyleProvider hashPriority="high">
        <ConfigProvider theme={getAntdTheme()} locale={antdLocale} direction={isRTL(locale) ? 'rtl' : 'ltr'}>
          <App>
            {children}
          </App>
        </ConfigProvider>
      </StyleProvider>
    </AntdRegistry>
  );
}
