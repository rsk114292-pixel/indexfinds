import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotSearchAdminService } from './hot-search-admin.service';
import {
  CreateHotSearchDto,
  UpdateHotSearchDto,
  QueryHotSearchDto,
} from './dto/hot-search-admin.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Hot Searches Admin')
@Controller('admin/hot-searches')
@UseGuards(AdminGuard)
export class HotSearchAdminController {
  constructor(private readonly hotSearchAdminService: HotSearchAdminService) {}

  @Get()
  findAll(@Query() query: QueryHotSearchDto) {
    return this.hotSearchAdminService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateHotSearchDto) {
    return this.hotSearchAdminService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHotSearchDto,
  ) {
    return this.hotSearchAdminService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.hotSearchAdminService.remove(id);
  }

  @Post(':id/pin')
  togglePin(@Param('id', ParseUUIDPipe) id: string) {
    return this.hotSearchAdminService.togglePin(id);
  }

  @Post(':id/block')
  toggleBlock(@Param('id', ParseUUIDPipe) id: string) {
    return this.hotSearchAdminService.toggleBlock(id);
  }
}
