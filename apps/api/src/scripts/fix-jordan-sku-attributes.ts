import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../products/products.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sku } from '../products/entities/sku.entity';

/**
 * 修复 Nike Air Jordan 5 产品的 SKU 属性名
 * 将 "AJ5" 属性名改为 "尺码"
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const skuRepository = app.get('SkuRepository');

  // 查询产品的所有 SKU
  const skus = await skuRepository
    .createQueryBuilder('sku')
    .innerJoin('sku.product', 'product')
    .where('product.weidianItemId = :itemId', { itemId: '7564269642' })
    .getMany();

  console.log(`找到 ${skus.length} 个 SKU`);

  let updatedCount = 0;
  for (const sku of skus) {
    if (sku.attributes && 'AJ5' in sku.attributes) {
      const sizeValue = sku.attributes['AJ5'];
      const otherAttrs = { ...sku.attributes };
      delete otherAttrs['AJ5'];

      // 重命名属性：AJ5 -> 尺码
      sku.attributes = {
        ...otherAttrs,
        尺码: sizeValue,
      };

      await skuRepository.save(sku);
      updatedCount++;
    }
  }

  console.log(`成功更新 ${updatedCount} 个 SKU 的属性名`);
  await app.close();
}

main().catch(console.error);
