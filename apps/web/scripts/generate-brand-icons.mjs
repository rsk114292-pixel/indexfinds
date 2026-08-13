import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const webRoot = resolve(import.meta.dirname, '..');
const iconsDir = resolve(webRoot, 'public', 'icons');
const logoSvg = await readFile(resolve(iconsDir, 'logo.svg'));
const maskableSvg = await readFile(resolve(iconsDir, 'logo-maskable.svg'));

async function renderPng(source, size, filename) {
  const output = await sharp(source)
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(resolve(iconsDir, filename), output);
  return output;
}

const favicon16 = await renderPng(logoSvg, 16, 'favicon-16x16.png');
const favicon32 = await renderPng(logoSvg, 32, 'favicon-32x32.png');
const favicon48 = await renderPng(logoSvg, 48, 'favicon-48x48.png');
await renderPng(maskableSvg, 180, 'apple-touch-icon.png');
await renderPng(logoSvg, 192, 'icon-192x192.png');
await renderPng(logoSvg, 512, 'icon-512x512.png');
await renderPng(maskableSvg, 192, 'icon-maskable-192x192.png');
await renderPng(maskableSvg, 512, 'icon-maskable-512x512.png');

function createIco(images) {
  const headerSize = 6;
  const directorySize = images.length * 16;
  let dataOffset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directories = images.map(({ size, data }) => {
    const directory = Buffer.alloc(16);
    directory.writeUInt8(size >= 256 ? 0 : size, 0);
    directory.writeUInt8(size >= 256 ? 0 : size, 1);
    directory.writeUInt8(0, 2);
    directory.writeUInt8(0, 3);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(data.length, 8);
    directory.writeUInt32LE(dataOffset, 12);
    dataOffset += data.length;
    return directory;
  });

  return Buffer.concat([header, ...directories, ...images.map(({ data }) => data)]);
}

await writeFile(
  resolve(webRoot, 'public', 'favicon.ico'),
  createIco([
    { size: 16, data: favicon16 },
    { size: 32, data: favicon32 },
    { size: 48, data: favicon48 },
  ]),
);

console.log('Generated IndexFinds SVG, PNG and ICO brand icons.');
