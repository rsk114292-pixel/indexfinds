import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@ApiTags('Users Admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admin/list')
  @UseGuards(AdminGuard)
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Post('admin/create')
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: User) {
    return this.usersService.create(dto, currentUser);
  }

  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.update(id, dto, currentUser);
  }

  @Patch('admin/:id/reset-password')
  @UseGuards(AdminGuard)
  resetPassword(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.resetPassword(id, currentUser);
  }

  @Patch('admin/:id/toggle-active')
  @UseGuards(AdminGuard)
  toggleActive(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.toggleActive(id, currentUser);
  }
}
