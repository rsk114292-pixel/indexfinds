import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// 加载环境变量（Docker 容器中由 env_file 注入，此处作为本地开发 fallback）
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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 1. 插入分类数据
    console.log('\n📂 正在插入分类数据...');

    const categories = [
      // 顶级分类
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Clothing',
        slug: 'clothing',
        level: 0,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Shoes',
        slug: 'shoes',
        level: 0,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Bags',
        slug: 'bags',
        level: 0,
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Electronics',
        slug: 'electronics',
        level: 0,
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Accessories',
        slug: 'accessories',
        level: 0,
      },
    ];

    for (const cat of categories) {
      await queryRunner.query(
        `INSERT INTO category (id, name, slug, level, "isActive")
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           level = EXCLUDED.level`,
        [cat.id, cat.name, cat.slug, cat.level],
      );
    }
    console.log(
      `✅ 已插入/更新 ${categories.length} 个基础分类（仅示例数据，完整分类请运行 seed-categories.ts）`,
    );

    // 2. 插入品牌数据
    console.log('\n🏷️  正在插入品牌数据...');

    const brands = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Nike',
        slug: 'nike',
        aliases: ['Nike', '耐克', 'NIKE'],
        tier: 1,
        status: 'active',
        description: 'Leading sports brand',
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Adidas',
        slug: 'adidas',
        aliases: ['Adidas', '阿迪达斯', 'adidas'],
        tier: 1,
        status: 'active',
        description: 'German sportswear brand',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'New Balance',
        slug: 'new-balance',
        aliases: ['New Balance', 'NB', '纽巴伦', '新百伦'],
        tier: 2,
        status: 'active',
        description: 'American footwear brand',
      },
    ];

    for (const brand of brands) {
      await queryRunner.query(
        `INSERT INTO brands (id, name, slug, aliases, tier, status, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           aliases = EXCLUDED.aliases,
           tier = EXCLUDED.tier,
           status = EXCLUDED.status,
           description = EXCLUDED.description`,
        [
          brand.id,
          brand.name,
          brand.slug,
          brand.aliases,
          brand.tier,
          brand.status,
          brand.description,
        ],
      );
    }
    console.log(`✅ 已插入/更新 ${brands.length} 个品牌`);

    // 3. 插入商品数据
    console.log('\n📦 正在插入商品数据...');

    const products = [
      {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        title: 'Nike Classic White Cotton T-Shirt for Men',
        slug: 'nike-classic-white-cotton-t-shirt-men',
        description:
          '<h2>Product Description</h2><p>Classic Nike t-shirt made from 100% cotton. Perfect for daily wear and sports activities.</p>',
        originalTitle: 'Nike 经典款纯棉 T 恤男',
        weidianItemId: '7569577612',
        weidianShopId: '1708516832',
        weidianShopName: '测试店铺A',
        brandId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        brandConfidence: 0.95,
        primaryCategoryId: '11111111-1111-1111-1111-111111111111', // Clothing
        priceMin: 99.0,
        priceMax: 129.0,
        mainImage: '/images/product-placeholder.svg',
        images: JSON.stringify([]),
        aiAttributes: JSON.stringify({
          colors: ['White', 'Black', 'Gray'],
          styles: ['Casual', 'Street'],
          occasions: ['Daily', 'Sports'],
          seasons: ['Summer', 'Spring'],
          gender: 'Men',
        }),
        sourceUrl: 'https://weidian.com/item.html?itemID=7569577612',
        status: 'active',
        isFeatured: true,
        viewCount: 0,
      },
      {
        id: 'bbbb2222-2222-2222-2222-222222222222',
        title: 'Adidas Ultraboost Running Shoes Black White',
        slug: 'adidas-ultraboost-running-shoes-black-white',
        description:
          '<h2>Product Description</h2><p>High-performance running shoes with Boost technology for maximum energy return.</p>',
        originalTitle: 'Adidas Ultraboost 跑步鞋黑白',
        weidianItemId: '7613410521',
        weidianShopId: '1708516832',
        weidianShopName: '测试店铺A',
        brandId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        brandConfidence: 0.92,
        primaryCategoryId: '22222222-2222-2222-2222-222222222222', // Shoes
        priceMin: 599.0,
        priceMax: 799.0,
        mainImage: '/images/product-placeholder.svg',
        images: JSON.stringify([]),
        aiAttributes: JSON.stringify({
          colors: ['Black', 'White'],
          styles: ['Sports', 'Running'],
          occasions: ['Sports', 'Running'],
          seasons: ['All Season'],
          gender: 'Unisex',
        }),
        sourceUrl: 'https://weidian.com/item.html?itemID=7613410521',
        status: 'active',
        isFeatured: false,
        viewCount: 0,
      },
    ];

    for (const product of products) {
      await queryRunner.query(
        `INSERT INTO products (
          id, title, slug, description, "originalTitle", "weidianItemId", "weidianShopId", "weidianShopName",
          "brandId", "brandConfidence", "primaryCategoryId", "priceMin", "priceMax", currency,
          "mainImage", images, "aiAttributes", "sourceUrl", status, "isFeatured", "viewCount"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'CNY', $14, $15, $16, $17, $18, $19, $20
        ) ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          "priceMin" = EXCLUDED."priceMin",
          "priceMax" = EXCLUDED."priceMax",
          "mainImage" = EXCLUDED."mainImage",
          images = EXCLUDED.images,
          "isFeatured" = EXCLUDED."isFeatured",
          "viewCount" = EXCLUDED."viewCount"`,
        [
          product.id,
          product.title,
          product.slug,
          product.description,
          product.originalTitle,
          product.weidianItemId,
          product.weidianShopId,
          product.weidianShopName,
          product.brandId,
          product.brandConfidence,
          product.primaryCategoryId,
          product.priceMin,
          product.priceMax,
          product.mainImage,
          product.images,
          product.aiAttributes,
          product.sourceUrl,
          product.status,
          product.isFeatured,
          product.viewCount,
        ],
      );
    }
    console.log(`✅ 已插入/更新 ${products.length} 个商品`);

    // 4. 插入 SKU 数据
    console.log('\n🎨 正在插入 SKU 数据...');

    const skus = [
      // Nike T-Shirt SKUs
      {
        id: 'eeee1111-1111-1111-1111-111111111111',
        productId: 'aaaa1111-1111-1111-1111-111111111111',
        skuCode: 'NIKE-TSHIRT-WHITE-M',
        weidianSkuId: '123456',
        weidianAttrIds: [9679297372, 9677463371],
        attributes: { 颜色: 'White', 尺码: 'M' },
        skuKey: '颜色=White;尺码=M',
        price: 99.0,
        stock: 50,
        image: '/images/product-placeholder.svg',
        status: 'available',
      },
      {
        id: 'eeee1111-1111-1111-1111-111111111112',
        productId: 'aaaa1111-1111-1111-1111-111111111111',
        skuCode: 'NIKE-TSHIRT-WHITE-L',
        weidianSkuId: '123457',
        weidianAttrIds: [9679297372, 9677463373],
        attributes: { 颜色: 'White', 尺码: 'L' },
        skuKey: '颜色=White;尺码=L',
        price: 99.0,
        stock: 30,
        image: '/images/product-placeholder.svg',
        status: 'available',
      },
      {
        id: 'eeee1111-1111-1111-1111-111111111113',
        productId: 'aaaa1111-1111-1111-1111-111111111111',
        skuCode: 'NIKE-TSHIRT-BLACK-M',
        weidianSkuId: '123458',
        weidianAttrIds: [9679297374, 9677463371],
        attributes: { 颜色: 'Black', 尺码: 'M' },
        skuKey: '颜色=Black;尺码=M',
        price: 109.0,
        stock: 45,
        image: '/images/product-placeholder.svg',
        status: 'available',
      },
      // Adidas Sneakers SKUs
      {
        id: 'ffff2222-2222-2222-2222-222222222221',
        productId: 'bbbb2222-2222-2222-2222-222222222222',
        skuCode: 'ADIDAS-UB-BLACK-40',
        weidianSkuId: '234561',
        weidianAttrIds: [8679297372],
        attributes: { 颜色: 'Black', 尺码: '40' },
        skuKey: '颜色=Black;尺码=40',
        price: 599.0,
        stock: 15,
        image: '/images/product-placeholder.svg',
        status: 'available',
      },
    ];

    for (const sku of skus) {
      await queryRunner.query(
        `INSERT INTO skus (
          id, "productId", "skuCode", "weidianSkuId", "weidianAttrIds",
          attributes, "skuKey", price, stock, image, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT ("skuCode") DO UPDATE SET
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          image = EXCLUDED.image,
          status = EXCLUDED.status`,
        [
          sku.id,
          sku.productId,
          sku.skuCode,
          sku.weidianSkuId,
          sku.weidianAttrIds,
          JSON.stringify(sku.attributes),
          sku.skuKey,
          sku.price,
          sku.stock,
          sku.image,
          sku.status,
        ],
      );
    }
    console.log(`✅ 已插入/更新 ${skus.length} 个 SKU`);

    // 统计信息
    console.log('\n📊 数据统计：');
    const categoryCount = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM category',
    )) as Array<{ count: string }>;
    const brandCount = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM brands',
    )) as Array<{ count: string }>;
    const productCount = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM products',
    )) as Array<{ count: string }>;
    const skuCount = (await queryRunner.query(
      'SELECT COUNT(*) as count FROM skus',
    )) as Array<{ count: string }>;

    console.log(`  - 分类数量: ${categoryCount[0]?.count ?? '0'}`);
    console.log(`  - 品牌数量: ${brandCount[0]?.count ?? '0'}`);
    console.log(`  - 商品数量: ${productCount[0]?.count ?? '0'}`);
    console.log(`  - SKU数量: ${skuCount[0]?.count ?? '0'}`);

    console.log('\n✅ 测试数据插入完成！');

    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

void seed();
