import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandDto } from './create-brand.dto';

/**
 * UpdateBrandDto - 品牌更新 DTO
 *
 * 基于 CreateBrandDto，所有字段均为可选（PartialType）。
 * 更新时会检查 name/slug 唯一性约束。
 */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
