import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto, UpdatePlatformDto } from './dto';

@ApiTags('Admin Platforms')
@Controller('admin/platforms')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PlatformsController {
  constructor(private platformsService: PlatformsService) {}

  @Get()
  async findAll() {
    return this.platformsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.platformsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePlatformDto) {
    return this.platformsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformsService.update(id, dto);
  }

  @Put(':id')
  async replace(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.platformsService.remove(id);
    return { success: true };
  }
}
