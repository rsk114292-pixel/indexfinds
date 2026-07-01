/**
 * 检查商品价格数据
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function checkPrices() {
  await withScriptDataSource(async (dataSource) => {
    console.log('数据库连接成功\n');

    const products = await dataSource.query(
      'SELECT id, title, "priceMin", "priceMax" FROM products LIMIT 10',
    );
    console.log('商品价格 (priceMin/priceMax):');
    products.forEach((p: any) => {
      console.log(
        `  - ${p.title?.substring(0, 40)}: min=${p.priceMin}, max=${p.priceMax}`,
      );
    });

    // 查看 SKU 的价格
    const skus = await dataSource.query(
      'SELECT s.id, s."productId", s.price, p.title FROM product_skus s JOIN products p ON s."productId" = p.id LIMIT 10',
    );
    console.log('\nSKU 价格:');
    skus.forEach((s: any) => {
      console.log(`  - ${s.title?.substring(0, 30)}: SKU price=${s.price}`);
    });
  });
}

void runScriptMain('商品价格检查', checkPrices);
