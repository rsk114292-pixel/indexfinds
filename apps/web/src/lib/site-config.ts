/** 站点 URL（构建时从 env 读取） */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
}

/** 站点名称（SITE_NAME 优先，兼容旧 APP_NAME） */
export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'MySite';
}

/** 联系邮箱 */
export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com';
}

/** 隐私邮箱 */
export function getPrivacyEmail(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'privacy@example.com';
}

/** 法务邮箱 */
export function getLegalEmail(): string {
  return process.env.NEXT_PUBLIC_LEGAL_EMAIL || 'legal@example.com';
}

/** 主题色 CSS 变量覆盖对象（用于 <html style={...}> 注入） */
export function getThemeVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  const map: Record<string, string> = {
    '--color-primary': process.env.NEXT_PUBLIC_PRIMARY_COLOR || '',
    '--color-primary-hover': process.env.NEXT_PUBLIC_PRIMARY_HOVER || '',
    '--color-secondary': process.env.NEXT_PUBLIC_SECONDARY_COLOR || '',
    '--color-accent': process.env.NEXT_PUBLIC_ACCENT_COLOR || '',
    '--color-bg': process.env.NEXT_PUBLIC_BG_COLOR || '',
  };
  for (const [key, value] of Object.entries(map)) {
    if (value) vars[key] = value;
  }
  return vars;
}

/** 主色调（供 Ant Design theme 使用） */
export function getPrimaryColor(): string {
  return process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#FF6B47';
}
