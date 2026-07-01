import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../products/products.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productsService = app.get(ProductsService);

  // 查询 Air Jordan 5 产品
  const products = await productsService['productRepository']
    .createQueryBuilder('product')
    .where('product.title ILIKE :title', { title: '%Air Jordan 5%' })
    .leftJoinAndSelect('product.skus', 'skus')
    .leftJoinAndSelect('product.brand', 'brand')
    .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
    .take(1)
    .getMany();

  if (products.length === 0) {
    console.log('未找到任何匹配的产品');
    await app.close();
    return;
  }

  const product = products[0];
  console.log('\n===== 产品信息 =====');
  console.log('ID:', product.id);
  console.log('标题:', product.title);
  console.log('Slug:', product.slug);
  console.log('微店 ID:', product.weidianItemId);
  console.log('价格:', product.priceMin, product.currency);
  console.log('品牌:', product.brand?.name);
  console.log('分类:', product.primaryCategory?.name);

  console.log('\n===== SKU 信息 =====');
  console.log('SKU 数量:', product.skus?.length || 0);

  if (product.skus && product.skus.length > 0) {
    product.skus.slice(0, 5).forEach((sku, index) => {
      console.log(`\nSKU #${index + 1}:`);
      console.log('  微店 SKU ID:', sku.weidianSkuId);
      console.log('  属性:', JSON.stringify(sku.attributes, null, 2));
      console.log('  价格:', sku.price);
      console.log('  库存:', sku.stock);
      console.log('  图片:', sku.image ? '有' : '无');
    });

    if (product.skus.length > 5) {
      console.log(`\n... 还有 ${product.skus.length - 5} 个 SKU`);
    }
  }

  console.log('\n===== 原始微店数据 (attrList) =====');
  if (product.weidianRawData?.skuInfo) {
    const skuInfo = product.weidianRawData.skuInfo as Record<string, any>;
    if (skuInfo.result?.attrList) {
      console.log('属性列表:');
      skuInfo.result.attrList.forEach((attr: any, attrIndex: number) => {
        console.log(`\n属性 #${attrIndex + 1}: ${attr.attrTitle}`);
        attr.attrValues.slice(0, 5).forEach((val: any, valIndex: number) => {
          console.log(`  值 #${valIndex + 1}:`);
          console.log(`    - attrId: ${val.attrId}`);
          console.log(`    - attrValue: "${val.attrValue}"`);
          console.log(
            `    - img: ${val.img ? '有 (' + val.img.substring(0, 50) + '...)' : '无'}`,
          );
        });
        if (attr.attrValues.length > 5) {
          console.log(`  ... 还有 ${attr.attrValues.length - 5} 个值`);
        }
      });
    } else {
      console.log('未找到 attrList 数据');
    }
  } else {
    console.log('未找到原始微店数据');
  }

  await app.close();
}

main().catch(console.error);
