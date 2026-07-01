import { IsArray, ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';

export class BatchOperationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  itemIds: string[];
}
