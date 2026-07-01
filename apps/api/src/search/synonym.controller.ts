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
import { SynonymService } from './synonym.service';
import {
  CreateSynonymGroupDto,
  UpdateSynonymGroupDto,
  QuerySynonymGroupDto,
  BatchImportSynonymDto,
} from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Synonyms')
@Controller('admin/synonyms')
@UseGuards(AdminGuard)
export class SynonymController {
  constructor(private readonly synonymService: SynonymService) {}

  @Post()
  create(@Body() dto: CreateSynonymGroupDto) {
    return this.synonymService.create(dto);
  }

  @Get()
  findAll(@Query() query: QuerySynonymGroupDto) {
    return this.synonymService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.synonymService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.synonymService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSynonymGroupDto,
  ) {
    return this.synonymService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.synonymService.remove(id);
  }

  @Post('batch-import')
  batchImport(@Body() dto: BatchImportSynonymDto) {
    return this.synonymService.batchImport(dto);
  }
}
