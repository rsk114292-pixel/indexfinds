/**
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const publicDir = join(process.cwd(), 'public');
const iconsDir = join(publicDir, 'icons');

describe('IndexFinds brand icon assets', () => {
  it('keeps the primary logo as real vector artwork', () => {
    const svg = readFileSync(join(iconsDir, 'logo.svg'), 'utf8');

    expect(svg).toContain('IF monogram');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('base64');
  });

  it.each([
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['favicon-48x48.png', 48],
    ['apple-touch-icon.png', 180],
    ['icon-192x192.png', 192],
    ['icon-512x512.png', 512],
  ])('renders %s at the expected square size', async (filename, size) => {
    const metadata = await sharp(join(iconsDir, filename)).metadata();

    expect(metadata.width).toBe(size);
    expect(metadata.height).toBe(size);
  });

  it('provides a multi-size root favicon for browsers and search crawlers', () => {
    const ico = readFileSync(join(publicDir, 'favicon.ico'));

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
});
