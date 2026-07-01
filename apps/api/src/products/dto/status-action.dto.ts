import { Type } from 'class-transformer';
import {
  IsEnum,
  IsArray,
  IsUUID,
  ArrayNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ProductStatusAction } from '../product-status';

export const BATCH_TARGET_SCOPES = ['selected', 'group'] as const;
export type BatchTargetScope = (typeof BATCH_TARGET_SCOPES)[number];

/**
 * 批量删除 DTO
 */
export class BatchDeleteDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'ids 不能为空' })
  @IsUUID('4', { each: true, message: '每个 id 必须是有效的 UUID' })
  ids: string[];
}

/**
 * 单个商品状态操作 DTO
 */
export class StatusActionDto {
  @IsEnum(ProductStatusAction, {
    message: `action 必须是以下值之一: ${Object.values(ProductStatusAction).join(', ')}`,
  })
  action: ProductStatusAction;
}

/**
 * 批量状态操作 DTO
 */
export class BatchStatusActionDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'ids 不能为空' })
  @IsUUID('4', { each: true, message: '每个 id 必须是有效的 UUID' })
  ids: string[];

  @IsEnum(ProductStatusAction, {
    message: `action 必须是以下值之一: ${Object.values(ProductStatusAction).join(', ')}`,
  })
  action: ProductStatusAction;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'allowParentCategory 必须是布尔值' })
  allowParentCategory?: boolean;
}

export class BatchCategoryUpdateDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'ids 不能为空' })
  @IsUUID('4', { each: true, message: '每个 id 必须是有效的 UUID' })
  ids: string[];

  @IsUUID('4', { message: 'primaryCategoryId 必须是有效的 UUID' })
  primaryCategoryId: string;

  @IsOptional()
  @IsIn(BATCH_TARGET_SCOPES, {
    message: `scope 必须是以下值之一: ${BATCH_TARGET_SCOPES.join(', ')}`,
  })
  scope?: BatchTargetScope;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'approveAfterUpdate 必须是布尔值' })
  approveAfterUpdate?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'allowParentCategory 必须是布尔值' })
  allowParentCategory?: boolean;
}
