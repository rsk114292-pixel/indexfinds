import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

/**
 * 品牌层级修复脚本（通用版，不依赖硬编码 ID）
 *
 * 功能：
 * 1. 确保母品牌存在且为 active（如被合并则恢复）
 * 2. 确保子品牌存在且为 active，parentId 正确
 *    - 如果子品牌是 merged/inactive → 恢复为 active
 *    - 如果子品牌不存在 → 自动创建
 *    - 如果子品牌 active 但 parentId 缺失 → 修复 parentId
 * 3. 根据标题关键词，将母品牌下的产品重新分配到子品牌
 *
 * 使用方法：
 *   # 预览模式（只看不改）
 *   node scripts/ops/repair-brand-hierarchy.js
 *
 *   # 执行修复
 *   node scripts/ops/repair-brand-hierarchy.js --execute
 */

// ============================================================
// 品牌层级规则（按名称定义，不依赖 ID）
// ============================================================
const HIERARCHY_RULES = [
  {
    parentBrand: 'Nike',
    subBrands: [
      {
        name: 'Air Jordan',
        slug: 'air-jordan',
        titleKeywords: ['jordan', 'jumpman'],
        aliases: 'jordan,aj,jumpman,air jordan',
        tier: 2,
      },
      {
        name: 'Nike SB',
        slug: 'nike-sb',
        titleKeywords: ['nike sb', 'sb dunk', 'dunk sb'],
        aliases: 'sb,nikesb',
        tier: 2,
      },
      {
        name: 'Nike ACG',
        slug: 'nike-acg',
        titleKeywords: ['nike acg', 'acg '],
        aliases: 'acg,nikeacg',
        tier: 3,
      },
    ],
  },
  {
    parentBrand: 'Adidas',
    subBrands: [
      {
        name: 'Adidas Yeezy',
        slug: 'adidas-yeezy',
        titleKeywords: ['yeezy'],
        aliases: 'yeezy,YEEZY,adidasyeezy',
        tier: 2,
      },
      {
        name: 'Adidas Y-3',
        slug: 'adidas-y3',
        titleKeywords: ['y-3', 'y3 '],
        aliases: 'y3,y-3,adidasy3',
        tier: 3,
      },
      {
        name: 'Adidas Originals',
        slug: 'adidas-originals',
        titleKeywords: ['adidas originals', 'originals'],
        aliases: 'originals,adidasoriginals',
        tier: 2,
      },
    ],
  },
  {
    parentBrand: 'Converse',
    subBrands: [
      {
        name: 'Converse x CDG',
        slug: 'converse-cdg',
        titleKeywords: ['cdg', 'comme des garcons'],
        aliases: 'cdg,converseplay',
        tier: 3,
      },
    ],
  },
  {
    parentBrand: 'Dior',
    subBrands: [
      {
        name: 'Dior Homme',
        slug: 'dior-homme',
        titleKeywords: ['dior homme', 'dior men'],
        aliases: 'diorhomme,dior men',
        tier: 2,
      },
    ],
  },
  {
    parentBrand: 'Prada',
    subBrands: [
      {
        name: 'Miu Miu',
        slug: 'miu-miu',
        titleKeywords: ['miu miu'],
        aliases: 'miumiu',
        tier: 2,
      },
    ],
  },
  {
    parentBrand: 'Puma',
    subBrands: [
      {
        name: 'Puma x Fenty',
        slug: 'puma-fenty',
        titleKeywords: ['fenty'],
        aliases: 'fenty,pumafenty',
        tier: 3,
      },
    ],
  },
  {
    parentBrand: 'Marc Jacobs',
    subBrands: [
      {
        name: 'Marc by Marc Jacobs',
        slug: 'marc-by-marc-jacobs',
        titleKeywords: ['marc by marc'],
        aliases: 'mbmj,marc by marc',
        tier: 3,
      },
    ],
  },
  {
    parentBrand: 'Ralph Lauren',
    subBrands: [
      {
        name: 'Polo Ralph Lauren',
        slug: 'polo-ralph-lauren',
        titleKeywords: ['polo ralph', 'polo rl'],
        aliases: 'polo,polorl',
        tier: 2,
      },
      {
        name: 'Purple Label',
        slug: 'ralph-lauren-purple-label',
        titleKeywords: ['purple label'],
        aliases: 'purplelabel,ralph lauren purple label',
        tier: 2,
      },
    ],
  },
];

// ============================================================
// 辅助函数
// ============================================================

/** 按名称查找品牌（不限状态） */
async function findBrandByName(
  ds: DataSource,
  name: string,
): Promise<{
  id: string;
  name: string;
  status: string;
  parentId: string | null;
  mergedIntoId: string | null;
} | null> {
  const rows = await ds.query(
    `SELECT id, name, status, "parentId", "mergedIntoId" FROM brands WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name],
  );
  return rows[0] || null;
}

/** 生成 slug */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// 主逻辑
// ============================================================

async function repairBrandHierarchy() {
  const isExecute = process.argv.includes('--execute');
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  console.log(
    isExecute
      ? '🔧 执行模式：将实际修改数据库'
      : '👀 预览模式：只查看不修改（加 --execute 执行）',
  );
  console.log('='.repeat(70));

  let totalRestored = 0;
  let totalCreated = 0;
  let totalParentFixed = 0;
  let totalProductsMoved = 0;

  for (const rule of HIERARCHY_RULES) {
    console.log(`\n${'━'.repeat(50)}`);
    console.log(`📂 母品牌: ${rule.parentBrand}`);
    console.log(`${'━'.repeat(50)}`);

    // ---- Step 1: 确保母品牌存在且 active ----
    const parent = await findBrandByName(ds, rule.parentBrand);

    if (!parent) {
      console.log(`   ❌ 母品牌 "${rule.parentBrand}" 不存在，跳过此组`);
      continue;
    }

    if (parent.status === 'merged' || parent.status === 'inactive') {
      console.log(
        `   ⚠️  母品牌 "${parent.name}" 状态为 ${parent.status}，需要恢复为 active`,
      );
      if (isExecute) {
        await ds.query(
          `UPDATE brands SET status = 'active', "mergedIntoId" = NULL, "parentId" = NULL, "updatedAt" = NOW() WHERE id = $1`,
          [parent.id],
        );
        console.log(`   ✅ 母品牌 "${parent.name}" 已恢复为 active`);
        totalRestored++;
        parent.status = 'active';
        parent.mergedIntoId = null;
      }
    } else {
      console.log(`   ✅ 母品牌 "${parent.name}" 状态正常 (active)`);
    }

    // ---- Step 2: 处理每个子品牌 ----
    for (const sub of rule.subBrands) {
      console.log(`\n   📌 子品牌: ${sub.name}`);

      let subBrand = await findBrandByName(ds, sub.name);

      if (!subBrand) {
        // 子品牌不存在 → 创建
        console.log(`      🆕 不存在，需要创建`);
        if (isExecute) {
          const slug = sub.slug || generateSlug(sub.name);
          // 检查 slug 冲突
          const slugExists = await ds.query(
            `SELECT id FROM brands WHERE slug = $1 LIMIT 1`,
            [slug],
          );
          const finalSlug =
            slugExists.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

          await ds.query(
            `INSERT INTO brands (name, slug, status, tier, "parentId", aliases, "createdAt", "updatedAt")
             VALUES ($1, $2, 'active', $3, $4, $5, NOW(), NOW())`,
            [sub.name, finalSlug, sub.tier || 3, parent.id, sub.aliases || ''],
          );
          console.log(
            `      ✅ 已创建: ${sub.name} (slug: ${finalSlug}, parent: ${rule.parentBrand})`,
          );
          totalCreated++;

          // 重新查询获取 ID
          subBrand = await findBrandByName(ds, sub.name);
        }
      } else if (
        subBrand.status === 'merged' ||
        subBrand.status === 'inactive'
      ) {
        // 子品牌被合并/停用 → 恢复
        console.log(`      🔄 状态为 ${subBrand.status}，需要恢复`);
        if (isExecute) {
          await ds.query(
            `UPDATE brands SET status = 'active', "mergedIntoId" = NULL, "parentId" = $2, "updatedAt" = NOW() WHERE id = $1`,
            [subBrand.id, parent.id],
          );
          console.log(
            `      ✅ 已恢复: ${subBrand.name} → active (parent: ${rule.parentBrand})`,
          );
          totalRestored++;
          subBrand.status = 'active';
          subBrand.parentId = parent.id;
        }
      } else if (subBrand.parentId !== parent.id) {
        // active 但 parentId 不对 → 修复
        const currentParent = subBrand.parentId
          ? (
              await ds.query(`SELECT name FROM brands WHERE id = $1`, [
                subBrand.parentId,
              ])
            )[0]?.name || 'unknown'
          : '(无)';
        console.log(
          `      🔧 parentId 不正确 (当前: ${currentParent}，应为: ${rule.parentBrand})`,
        );
        if (isExecute) {
          await ds.query(
            `UPDATE brands SET "parentId" = $2, "updatedAt" = NOW() WHERE id = $1`,
            [subBrand.id, parent.id],
          );
          console.log(
            `      ✅ parentId 已修复: ${subBrand.name} → ${rule.parentBrand}`,
          );
          totalParentFixed++;
          subBrand.parentId = parent.id;
        }
      } else {
        console.log(`      ✅ 状态正常 (active, parent: ${rule.parentBrand})`);
      }

      // ---- Step 3: 重新分配产品 ----
      if (sub.titleKeywords.length > 0 && subBrand) {
        const keywordConditions = sub.titleKeywords
          .map((_, i) => `LOWER(title) LIKE $${i + 2}`)
          .join(' OR ');
        const keywordParams = sub.titleKeywords.map((kw) => `%${kw}%`);

        const productsToMove = await ds.query(
          `SELECT id, title FROM products WHERE "brandId" = $1 AND (${keywordConditions})`,
          [parent.id, ...keywordParams],
        );

        if (productsToMove.length > 0) {
          console.log(
            `      📦 ${productsToMove.length} 个产品需要从 ${rule.parentBrand} 移到 ${sub.name}:`,
          );
          const preview = productsToMove.slice(0, 3);
          for (const p of preview) {
            console.log(`         - ${p.title.substring(0, 70)}...`);
          }
          if (productsToMove.length > 3) {
            console.log(`         ... 还有 ${productsToMove.length - 3} 个`);
          }

          if (isExecute && subBrand) {
            const productIds = productsToMove.map((p: any) => p.id);
            const BATCH_SIZE = 500;
            for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
              const batch = productIds.slice(i, i + BATCH_SIZE);
              const placeholders = batch
                .map((_: any, idx: number) => `$${idx + 2}`)
                .join(',');
              await ds.query(
                `UPDATE products SET "brandId" = $1 WHERE id IN (${placeholders})`,
                [subBrand.id, ...batch],
              );
            }
            console.log(`      ✅ ${productsToMove.length} 个产品已移动`);
            totalProductsMoved += productsToMove.length;
          }
        } else {
          console.log(`      📦 无需移动产品`);
        }
      }
    }
  }

  // ============================================================
  // 最终报告
  // ============================================================
  console.log('\n' + '='.repeat(70));

  // 检查是否还有 merged 品牌
  const remainingMerged = await ds.query(
    `SELECT b.name, t.name as "mergedIntoName"
     FROM brands b LEFT JOIN brands t ON b."mergedIntoId" = t.id
     WHERE b.status = 'merged' ORDER BY b.name`,
  );
  if (remainingMerged.length > 0) {
    console.log(
      `\n⚠️  仍有 ${remainingMerged.length} 个品牌处于 merged 状态（可能是正常去重）:`,
    );
    for (const b of remainingMerged) {
      console.log(`   - "${b.name}" → "${b.mergedIntoName || 'unknown'}"`);
    }
  } else {
    console.log('\n✅ 没有品牌处于 merged 状态');
  }

  // 显示当前完整层级
  const hierarchy = await ds.query(
    `SELECT b.name, b.status, p.name as "parentName",
            (SELECT COUNT(*) FROM products WHERE "brandId" = b.id) as "productCount"
     FROM brands b
     LEFT JOIN brands p ON b."parentId" = p.id
     WHERE b."parentId" IS NOT NULL AND b.status = 'active'
     ORDER BY p.name, b.name`,
  );
  if (hierarchy.length > 0) {
    console.log(`\n📊 当前品牌层级:`);
    let lastParent = '';
    for (const h of hierarchy) {
      if (h.parentName !== lastParent) {
        console.log(`\n   ${h.parentName}`);
        lastParent = h.parentName;
      }
      console.log(`     └── ${h.name} (${h.productCount} 个产品)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  if (isExecute) {
    console.log(`\n🎉 修复完成:`);
    console.log(`   恢复品牌: ${totalRestored}`);
    console.log(`   创建品牌: ${totalCreated}`);
    console.log(`   修复 parentId: ${totalParentFixed}`);
    console.log(`   移动产品: ${totalProductsMoved}`);
  } else {
    console.log('\n👀 预览结束，加 --execute 参数执行实际修复');
  }

  await app.close();
}

repairBrandHierarchy().catch((err) => {
  console.error('❌ 修复失败:', err);
  process.exit(1);
});
