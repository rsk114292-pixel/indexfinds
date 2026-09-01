type Rgb = readonly [red: number, green: number, blue: number];

const WHITE: Rgb = [255, 255, 255];

function parseHexColor(value: string): Rgb | null {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number) {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([red, green, blue]: Rgb) {
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(first: Rgb, second: Rgb) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex([red, green, blue]: Rgb) {
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Preserve a tenant's hue while ensuring it works for text on light surfaces
 * and for white text on filled controls. Invalid values are left untouched so
 * the existing CSS fallback remains available.
 */
export function accessibleTenantPrimary(
  value: string,
  minimumRatio = 4.75,
) {
  const source = parseHexColor(value);
  if (!source || contrastRatio(source, WHITE) >= minimumRatio) return value;

  for (let step = 1; step <= 100; step += 1) {
    const factor = 1 - step / 100;
    const candidate: Rgb = source.map((channel) =>
      Math.round(channel * factor),
    ) as unknown as Rgb;
    if (contrastRatio(candidate, WHITE) >= minimumRatio) {
      return toHex(candidate);
    }
  }

  return "#000000";
}
