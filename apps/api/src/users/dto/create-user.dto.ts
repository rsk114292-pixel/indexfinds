import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/(?=.*[a-z])/, { message: '密码至少包含一个小写字母' })
  @Matches(/(?=.*[A-Z])/, { message: '密码至少包含一个大写字母' })
  @Matches(/(?=.*\d)/, { message: '密码至少包含一个数字' })
  @Matches(/(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, {
    message: '密码至少包含一个特殊字符',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
