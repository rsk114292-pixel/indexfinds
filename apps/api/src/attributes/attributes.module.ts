import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { AttributesService } from './attributes.service';
import { AttributeValidatorService } from './attribute-validator.service';
import { AttributesController } from './attributes.controller';
import { ColorsModule } from '../colors/colors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attribute, AttributeValue]),
    ColorsModule,
  ],
  controllers: [AttributesController],
  providers: [AttributesService, AttributeValidatorService],
  exports: [AttributesService, AttributeValidatorService, TypeOrmModule],
})
export class AttributesModule {}
