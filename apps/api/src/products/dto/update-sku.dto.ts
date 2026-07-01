import { PartialType } from '@nestjs/mapped-types';
import { CreateSkuDto } from './create-sku.dto';
import { OmitType } from '@nestjs/mapped-types';

// 更新 SKU 时不允许修改 productId
export class UpdateSkuDto extends PartialType(
  OmitType(CreateSkuDto, ['productId'] as const),
) {}
