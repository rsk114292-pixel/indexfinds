import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { locales } from '@/i18n/config';
import { getProductDetailTag } from '@/lib/cache-tags';

/**
 * 缓存重新验证 API
 * POST /api/revalidate
 *
 * Body:
 * - path: 要重新验证的路径，如 "/products/nike-air-max"
 * - tag: 要重新验证的标签
 * - type: "page" | "layout" | 默认重新验证整个路径
 * - all: true 表示清除所有产品缓存
 *
 * 鉴权：必须携带管理员 JWT（Authorization: Bearer <token>）
 */

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * 通过 NestJS /auth/me 验证请求方是否为管理员
 */
async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: authHeader },
    });
    if (!response.ok) return false;
    const user = await response.json();
    return ADMIN_ROLES.includes(user.role);
  } catch {
    return false;
  }
}

/**
 * 验证服务端共享密钥（供 NestJS 后端调用，无需 JWT）
 */
function verifySecret(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  return request.headers.get('x-revalidate-secret') === secret;
}

function revalidateProductSlugPaths(slug: string, revalidated: string[]) {
  const paths = new Set<string>([`/products/${slug}`]);

  for (const locale of locales) {
    paths.add(`/${locale}/products/${slug}`);
  }

  for (const path of paths) {
    revalidatePath(path, 'page');
    revalidated.push(path);
  }
}

export async function POST(request: NextRequest) {
  const isSecret = verifySecret(request);
  const isAdmin = isSecret || await verifyAdmin(request.headers.get('authorization'));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, tag, type, all, slug } = body;

    const revalidated: string[] = [];

    // 清除所有产品相关缓存
    if (all) {
      revalidatePath('/products', 'page');
      revalidatePath('/', 'page');
      revalidated.push('/products', '/');
    }

    // 清除特定产品缓存
    if (slug) {
      revalidateProductSlugPaths(slug, revalidated);
      revalidateTag(getProductDetailTag(slug));
      revalidated.push(`tag:${getProductDetailTag(slug)}`);
    }

    // 清除特定路径缓存
    if (path) {
      if (type === 'page') {
        revalidatePath(path, 'page');
      } else if (type === 'layout') {
        revalidatePath(path, 'layout');
      } else {
        revalidatePath(path);
      }
      revalidated.push(path);
    }

    // 清除特定标签缓存
    if (tag) {
      revalidateTag(tag);
      revalidated.push(`tag:${tag}`);
    }

    return NextResponse.json({
      success: true,
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Revalidate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    );
  }
}

// GET 请求：供管理员调试用，同样需要鉴权
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request.headers.get('authorization'));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const slug = searchParams.get('slug');

  if (!path && !slug) {
    return NextResponse.json(
      { error: 'Missing path or slug parameter' },
      { status: 400 }
    );
  }

  try {
    if (slug) {
      return NextResponse.json({
        success: true,
        revalidated: (() => {
          const revalidated: string[] = [];
          revalidateProductSlugPaths(slug, revalidated);
          revalidateTag(getProductDetailTag(slug));
          revalidated.push(`tag:${getProductDetailTag(slug)}`);
          return revalidated;
        })(),
        timestamp: new Date().toISOString(),
      });
    }

    if (path) {
      revalidatePath(path);
      return NextResponse.json({
        success: true,
        revalidated: path,
        timestamp: new Date().toISOString(),
      });
    }
    return NextResponse.json(
      { error: 'Missing path or slug parameter' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    );
  }
}
