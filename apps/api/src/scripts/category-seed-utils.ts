import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';

export interface CategorySeedNode {
  name: string;
  slug: string;
  nameEn?: string;
  sortOrder?: number;
  aliases?: string[];
  children?: CategorySeedNode[];
}

interface CategorySeedFile {
  categories: CategorySeedNode[];
}

async function resolveCategorySeedPath(): Promise<string> {
  const candidates = [
    join(process.cwd(), 'src/seeds/data/categories.json'),
    join(process.cwd(), 'dist/seeds/data/categories.json'),
    join(__dirname, '../seeds/data/categories.json'),
    join(__dirname, '../../seeds/data/categories.json'),
  ];

  for (const filePath of candidates) {
    try {
      await access(filePath);
      return filePath;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `categories.json not found. Tried: ${candidates.join(', ')}`,
  );
}

export async function loadCategorySeedData(): Promise<CategorySeedNode[]> {
  const seedPath = await resolveCategorySeedPath();
  const raw = await readFile(seedPath, 'utf8');
  const parsed = JSON.parse(raw) as CategorySeedFile;

  if (!Array.isArray(parsed.categories)) {
    throw new Error('categories.json 格式无效：缺少 categories 数组');
  }

  return parsed.categories;
}

export function collectSeedSlugs(
  nodes: CategorySeedNode[],
  acc: string[] = [],
): string[] {
  for (const node of nodes) {
    acc.push(node.slug);
    if (node.children?.length) {
      collectSeedSlugs(node.children, acc);
    }
  }
  return acc;
}

export async function upsertCategoryTree(
  categoryRepo: Repository<Category>,
  nodes: CategorySeedNode[],
): Promise<{ created: number; updated: number }> {
  const existingCategories = await categoryRepo.find({ relations: ['parent'] });
  const existingBySlug = new Map(
    existingCategories.map((category) => [category.slug, category]),
  );

  let created = 0;
  let updated = 0;

  async function syncNodes(
    items: CategorySeedNode[],
    parent: Category | null,
    level: number,
  ): Promise<void> {
    for (const item of items) {
      const existing = existingBySlug.get(item.slug);
      const entity = {
        ...(existing ?? {}),
        name: item.name,
        nameEn: item.nameEn ?? existing?.nameEn ?? null,
        slug: item.slug,
        level,
        aliases: item.aliases?.length ? item.aliases : null,
        sortOrder: item.sortOrder ?? existing?.sortOrder ?? 0,
        isActive: true,
        translations: {
          ...(existing?.translations ?? {}),
          en: {
            ...(existing?.translations?.en ?? {}),
            name: item.nameEn ?? item.name,
          },
          zh: {
            ...(existing?.translations?.zh ?? {}),
            name: item.name,
          },
        },
        parent,
      } as Category;

      const saved = await categoryRepo.save(entity);
      existingBySlug.set(saved.slug, saved);

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }

      if (item.children?.length) {
        await syncNodes(item.children, saved, level + 1);
      }
    }
  }

  await syncNodes(nodes, null, 0);

  return { created, updated };
}

export async function rebuildCategoryClosureTable(
  categoryRepo: Pick<Repository<Category>, 'query'>,
): Promise<void> {
  await categoryRepo.query('DELETE FROM category_closure');

  await categoryRepo.query(`
    INSERT INTO category_closure (id_ancestor, id_descendant)
    SELECT id, id
    FROM category
  `);

  await categoryRepo.query(`
    WITH RECURSIVE category_paths AS (
      SELECT
        id AS descendant_id,
        "parentId" AS ancestor_id
      FROM category
      WHERE "parentId" IS NOT NULL

      UNION ALL

      SELECT
        category_paths.descendant_id,
        parent."parentId" AS ancestor_id
      FROM category_paths
      JOIN category parent ON parent.id = category_paths.ancestor_id
      WHERE parent."parentId" IS NOT NULL
    )
    INSERT INTO category_closure (id_ancestor, id_descendant)
    SELECT DISTINCT ancestor_id, descendant_id
    FROM category_paths
    WHERE ancestor_id IS NOT NULL
  `);
}
