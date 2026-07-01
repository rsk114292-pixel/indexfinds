/**
 * Ant Design 主题配置
 * 基于设计系统 Design_System.md
 */
import type { ThemeConfig } from 'antd';
import { getPrimaryColor } from '@/lib/site-config';

export function getAntdTheme(): ThemeConfig {
  return {
  token: {
    // 主色（珊瑚橙 — 与 globals.css 设计系统对齐）
    colorPrimary: getPrimaryColor(),
    colorPrimaryHover: '#E5553A',
    colorPrimaryActive: '#CC4A30',

    // 成功/警告/错误色（与 globals.css 对齐）
    colorSuccess: '#10B981',
    colorWarning: '#faad14',
    colorError: '#EF4444',
    colorInfo: '#FF6B47',

    // 文字色
    colorText: 'rgba(38, 38, 38, 0.85)',
    colorTextSecondary: 'rgba(140, 140, 140, 0.65)',
    colorTextDisabled: 'rgba(191, 191, 191, 0.45)',
    colorTextPlaceholder: 'rgba(217, 217, 217, 0.25)',

    // 背景色
    colorBgContainer: '#ffffff',
    colorBgLayout: '#fafafa',
    colorBgElevated: '#ffffff',

    // 边框色
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    // 圆角
    borderRadius: 4,
    borderRadiusLG: 8,
    borderRadiusSM: 2,

    // 字体
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // 间距（基于 4px 网格）
    marginXS: 4,
    marginSM: 8,
    margin: 12,
    marginMD: 16,
    marginLG: 24,
    marginXL: 32,
    marginXXL: 48,

    // 内边距
    paddingXS: 4,
    paddingSM: 8,
    padding: 12,
    paddingMD: 16,
    paddingLG: 24,
    paddingXL: 32,

    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 1px 2px rgba(0, 0, 0, 0.05)',

    // 行高
    lineHeight: 1.6,
    lineHeightHeading1: 1.4,
    lineHeightHeading2: 1.4,
    lineHeightHeading3: 1.5,
  },
  components: {
    // 按钮组件
    Button: {
      primaryShadow: '0 2px 8px rgba(255, 107, 71, 0.2)',
    },
    // 卡片组件
    Card: {
      borderRadiusLG: 8,
      boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    // 输入框组件
    Input: {
      borderRadius: 4,
      paddingBlock: 8,
      paddingInline: 12,
    },
    // 标签组件
    Tag: {
      borderRadiusSM: 2,
    },
  },
  };
}
