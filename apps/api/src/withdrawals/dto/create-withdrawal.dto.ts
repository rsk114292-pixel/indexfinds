import {
  IsInt,
  Min,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../entities/point-withdrawal.entity';

export class CreateWithdrawalDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  paymentAccount: string;
}
