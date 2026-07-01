import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// 加载环境变量
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
});

interface ScrapedProduct {
  itemId: string;
  title: string;
  slug: string;
  originalTitle: string;
  weidianItemId: string;
  weidianShopId: string;
  weidianShopName: string;
  brandId: string | null;
  brandName: string | null;
  brandConfidence: number | null;
  primaryCategoryId: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  mainImage: string;
  images: string[];
  attributes: Record<string, string[]>;
  skus: Array<{
    sku_id: string;
    weidian_sku_id: string;
    weidian_attr_ids: number[];
    price: number;
    stock: number;
    attributes: Record<string, string>;
    sku_key: string;
    image_url: string | null;
  }>;
  sourceUrl: string;
  stock: number;
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 读取抓取的商品数据
    const scrapedDataPath = join(
      __dirname,
      '../../../../scripts/scraped-products.json',
    );
    const scrapedData: ScrapedProduct[] = JSON.parse(
      fs.readFileSync(scrapedDataPath, 'utf-8'),
    );

    console.log(`\n📦 找到 ${scrapedData.length} 个商品数据\n`);

    // 插入商品
    console.log('📦 正在插入商品数据...');
    let productCount = 0;

    for (const product of scrapedData) {
      try {
        // 生成简单的商品描述
        const description = `<h2>Product Details</h2><p>${product.title}</p><p>Imported from Weidian marketplace.</p>`;

        // 提取 AI 属性
        const aiAttributes: Record<string, any> = {};

        if (product.attributes) {
          // 提取颜色 (如果有 Colorways 或 Color 属性)
          const colorKey = Object.keys(product.attributes).find(
            (k) =>
              k.toLowerCase().includes('color') ||
              k.toLowerCase().includes('colours'),
          );
          if (colorKey) {
            aiAttributes.colors = product.attributes[colorKey].slice(0, 10); // 限制前10个
          }

          // 提取尺码
          const sizeKey = Object.keys(product.attributes).find(
            (k) =>
              k.toLowerCase().includes('size') ||
              k.toLowerCase().includes('尺码'),
          );
          if (sizeKey) {
            aiAttributes.sizes = product.attributes[sizeKey];
          }
        }

        // 判断商品类型和属性
        const titleLower = product.title.toLowerCase();

        if (titleLower.includes('shirt') || titleLower.includes('tee')) {
          aiAttributes.styles = ['Casual', 'Street'];
          aiAttributes.occasions = ['Daily'];
          aiAttributes.seasons = ['Summer', 'Spring'];
        } else if (
          titleLower.includes('shoe') ||
          titleLower.includes('sneaker') ||
          titleLower.includes('slipper')
        ) {
          aiAttributes.styles = ['Casual'];
          aiAttributes.occasions = ['Daily'];
        } else if (
          titleLower.includes('bag') ||
          titleLower.includes('backpack')
        ) {
          aiAttributes.styles = ['Fashion'];
          aiAttributes.occasions = ['Daily', 'Travel'];
        }

        // 插入商品
        const result = await queryRunner.query(
          `INSERT INTO products (
            title, slug, description, "originalTitle", "weidianItemId",
            "weidianShopId", "weidianShopName", "brandId", "brandConfidence",
            "primaryCategoryId", "priceMin", "priceMax", currency,
            "mainImage", images, "aiAttributes", "sourceUrl",
            status, "isFeatured", "viewCount"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, 'active', false, 0
          )
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            "priceMin" = EXCLUDED."priceMin",
            "priceMax" = EXCLUDED."priceMax",
            "mainImage" = EXCLUDED."mainImage",
            images = EXCLUDED.images,
            "aiAttributes" = EXCLUDED."aiAttributes"
          RETURNING id`,
          [
            product.title,
            product.slug,
            description,
            product.originalTitle,
            product.weidianItemId,
            product.weidianShopId,
            product.weidianShopName,
            product.brandId,
            product.brandConfidence || 0.0,
            product.primaryCategoryId,
            product.priceMin,
            product.priceMax,
            product.currency,
            product.mainImage,
            JSON.stringify(product.images),
            JSON.stringify(aiAttributes),
            product.sourceUrl,
          ],
        );

        const productId = result[0].id;
        console.log(
          `  ✅ [${productCount + 1}/${scrapedData.length}] ${product.title.substring(0, 50)}...`,
        );

        // 插入 SKU (批量,限制数量避免过多)
        const skusToInsert = product.skus.slice(0, 50); // 限制每个商品最多50个SKU

        for (const sku of skusToInsert) {
          const skuCode = `${product.weidianItemId}-${sku.sku_id}`;

          await queryRunner.query(
            `INSERT INTO skus (
              "productId", "skuCode", "weidianSkuId", "weidianAttrIds",
              attributes, "skuKey", price, stock, image, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available')
            ON CONFLICT ("skuCode") DO UPDATE SET
              price = EXCLUDED.price,
              stock = EXCLUDED.stock,
              status = EXCLUDED.status`,
            [
              productId,
              skuCode,
              sku.weidian_sku_id,
              sku.weidian_attr_ids,
              JSON.stringify(sku.attributes),
              sku.sku_key,
              sku.price,
              sku.stock,
              sku.image_url,
            ],
          );
        }

        console.log(`     插入了 ${skusToInsert.length} 个 SKU`);
        productCount++;
      } catch (err) {
        console.error(`  ❌ 插入商品失败: ${product.title}`);
        console.error(`     错误: ${err.message}`);
      }
    }

    console.log(`\n✅ 成功插入 ${productCount} 个商品`);

    // 统计信息
    console.log('\n📊 数据统计：');
    const productTotal = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM products',
    )) as Array<{ count: string }>;
    const skuTotal = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM skus',
    )) as Array<{ count: string }>;
    const categoryTotal = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM category',
    )) as Array<{ count: string }>;

    console.log(`  - 分类数量: ${categoryTotal[0]?.count ?? '0'}`);
    console.log(`  - 商品数量: ${productTotal[0]?.count ?? '0'}`);
    console.log(`  - SKU数量: ${skuTotal[0]?.count ?? '0'}`);

    console.log('\n✅ 真实商品数据导入完成！');

    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

void seed();
