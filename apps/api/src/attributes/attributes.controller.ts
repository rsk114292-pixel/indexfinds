import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AttributesService } from './attributes.service';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get('summary')
  @UseGuards(AdminGuard)
  async getSummary() {
    return this.attributesService.getAttributeSummary();
  }
}
