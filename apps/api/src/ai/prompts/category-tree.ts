/**
 * 分类树格式化工具
 *
 * 将扁平的分类列表转换为层级树形字符串，
 * 让 AI 能理解分类之间的父子关系，从而选择最细粒度的分类。
 */

export interface CategoryForPrompt {
  name: string;
  slug: string;
  id?: string;
  level?: number;
  parent?: { id: string } | null;
}

/**
 * 将分类列表格式化为树形字符串
 *
 * 如果分类有层级信息（id + parent），输出树形格式：
 * clothing
 *   tops
 *     t-shirts
 *     hoodie
 *   outerwear
 *     jackets
 *
 * 如果没有层级信息，回退为扁平列表。
 */
export function formatCategoryTree(categories: CategoryForPrompt[]): string {
  // 如果没有层级信息，回退为扁平列表
  const hasHierarchy = categories.some((c) => c.id && c.level !== undefined);
  if (!hasHierarchy) {
    return categories.map((c) => c.slug).join(', ');
  }

  const childrenOf = new Map<string, CategoryForPrompt[]>();
  const roots: CategoryForPrompt[] = [];

  for (const cat of categories) {
    const parentId = cat.parent?.id;
    if (!parentId) {
      roots.push(cat);
    } else {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId)!.push(cat);
    }
  }

  const lines: string[] = [];
  function walk(node: CategoryForPrompt, depth: number) {
    lines.push('  '.repeat(depth) + node.slug);
    const children = node.id ? childrenOf.get(node.id) || [] : [];
    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }

  return lines.join('\n');
}
