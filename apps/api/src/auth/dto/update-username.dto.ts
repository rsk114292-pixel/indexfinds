import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @MinLength(2, { message: 'Username must be at least 2 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  @Matches(/^[^<>"'&;]*$/, {
    message: 'Username contains invalid characters',
  })
  username: string;
}
