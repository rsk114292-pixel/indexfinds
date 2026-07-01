export const channelLabels: Record<string, string> = {
  organic_search: '自然搜索',
  paid_search: '付费搜索',
  social_organic: '社交媒体',
  social_paid: '付费社交',
  referral: '外部引荐',
  owned_referral: '自有站导流',
  internal: '站内回流',
  direct: '直接/未归因访问',
  email: '邮件营销',
  affiliate: '联盟营销',
  other: '其他',
};

const sourceLabels: Record<string, string> = {
  referral_link: '推荐短链',
  telegram: 'Telegram',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  bing: 'Bing',
  yahoo: 'Yahoo',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  '(direct)': '直接/未归因访问',
  '(internal)': '站内来源',
  '(unknown)': '未知来源',
};

const browserContextLabels: Record<string, string> = {
  telegram_webview: 'Telegram 内置浏览器',
  facebook_webview: 'Facebook 内置浏览器',
  instagram_webview: 'Instagram 内置浏览器',
  line_webview: 'LINE 内置浏览器',
  wechat_webview: '微信内置浏览器',
  standard_browser: '普通浏览器',
  unknown: '未知',
};

const directReasonLabels: Record<string, string> = {
  true_direct: '正常 Direct',
  referral_share_unattributed: '推荐分享缺来源',
  webview_referrer_loss: 'WebView 丢来源',
  likely_automated_direct: '疑似自动化 Direct',
  other_unattributed: '其他待核实',
};

const deviceTypeLabels: Record<string, string> = {
  mobile: '手机',
  desktop: '桌面',
  tablet: '平板',
};

export function formatTrafficSourceLabel(value: string): string {
  return sourceLabels[value] || value;
}

export function formatBrowserContextLabel(value: string): string {
  return browserContextLabels[value] || value;
}

export function formatDeviceTypeLabel(value: string): string {
  return deviceTypeLabels[value] || value;
}

export function formatDirectReasonLabel(value: string): string {
  return directReasonLabels[value] || value;
}
