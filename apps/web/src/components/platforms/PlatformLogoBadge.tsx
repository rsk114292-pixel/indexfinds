'use client';

const PLATFORM_BADGE_STYLES: Record<
  string,
  { background: string; text: string; label?: string }
> = {
  loongbuy: { background: 'linear-gradient(135deg, #ff8a38, #ff5f2e)', text: '#ffffff', label: 'L' },
  lovegobuy: { background: 'linear-gradient(135deg, #7bcf52, #4aa838)', text: '#ffffff', label: 'LG' },
  kakobuy: { background: 'linear-gradient(135deg, #ff4d5a, #ff2240)', text: '#ffffff', label: 'K' },
  usfans: { background: 'linear-gradient(135deg, #ffffff, #f4f6fb)', text: '#f05a28', label: 'US' },
  oopbuy: { background: 'linear-gradient(135deg, #3d7cff, #245cff)', text: '#ffffff', label: 'O' },
  allchinabuy: { background: 'linear-gradient(135deg, #30c7d2, #19a8b7)', text: '#ffffff', label: 'AC' },
  joyagoo: { background: 'linear-gradient(135deg, #f5f5f5, #dddddd)', text: '#444444', label: 'J' },
  orientdig: { background: 'linear-gradient(135deg, #2a2d34, #111319)', text: '#ffffff', label: 'OD' },
  superbuy: { background: 'linear-gradient(135deg, #ff5f4d, #e4372b)', text: '#ffffff', label: 'S' },
  sugargoo: { background: 'linear-gradient(135deg, #ffd85a, #ffab1f)', text: '#7a3200', label: 'SG' },
  acbuy: { background: 'linear-gradient(135deg, #f4f8f7, #e8efed)', text: '#1db89a', label: 'B' },
  litbuy: { background: 'linear-gradient(135deg, #444a57, #222733)', text: '#ffffff', label: 'L' },
};

function canUseDirectLogo(logoUrl?: string): boolean {
  if (!logoUrl) return false;
  if (logoUrl.startsWith('/')) return true;
  if (logoUrl.startsWith('data:')) return true;
  return /\/uploads\/[^/]+$/i.test(logoUrl);
}

function getBadgeLabel(platformKey: string, name: string): string {
  const preset = PLATFORM_BADGE_STYLES[platformKey]?.label;
  if (preset) return preset;

  const compact = name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return compact || name.charAt(0).toUpperCase() || '?';
}

interface PlatformLogoBadgeProps {
  platformKey: string;
  name: string;
  logoUrl?: string;
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
}

export default function PlatformLogoBadge({
  platformKey,
  name,
  logoUrl,
  className = '',
  imageClassName = '',
  labelClassName = '',
}: PlatformLogoBadgeProps) {
  if (canUseDirectLogo(logoUrl)) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={imageClassName || className}
      />
    );
  }

  const style = PLATFORM_BADGE_STYLES[platformKey] || {
    background: 'linear-gradient(135deg, #f2f4f7, #dfe5ec)',
    text: '#445066',
  };

  return (
    <div
      className={className}
      style={{
        background: style.background,
        color: style.text,
      }}
      aria-label={name}
      title={name}
    >
      <span className={labelClassName}>{getBadgeLabel(platformKey, name)}</span>
    </div>
  );
}
