import OpenGraphImage from '../opengraph-image';

export const runtime = 'edge';
export const revalidate = 86400;

export function GET() {
  return OpenGraphImage();
}
