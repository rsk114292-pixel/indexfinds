import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/**
 * UpdateProductDto - 商品更新 DTO
 *
 * 基于 CreateProductDto 并排除不可变字段：
 * - weidianItemId: 微店商品 ID，创建后不可修改
 * - weidianShopId: 微店店铺 ID，创建后不可修改
 * - weidianShopName: 微店店铺名称，创建后不可修改
 *
 * 所有其他字段均为可选（PartialType），仅更新传入的字段。
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, [
    'weidianItemId',
    'weidianShopId',
    'weidianShopName',
  ] as const),
) {}
