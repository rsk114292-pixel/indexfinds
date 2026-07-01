import { IsString, IsArray } from 'class-validator';

export class RecordSearchDto {
  @IsString()
  query: string;
}

export class BulkSyncSearchHistoryDto {
  @IsArray()
  @IsString({ each: true })
  items: string[];
}

export class RemoveSearchItemDto {
  @IsString()
  query: string;
}
